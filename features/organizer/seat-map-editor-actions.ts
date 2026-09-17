'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Guard: verify organizer owns the event ───────────────────────────────────

async function verifyOrganizerEvent(eventId: string, userId: string) {
  const organizer = await db.organizer.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!organizer) return null

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, seatMapId: true },
  })
  if (!event) return null

  return { organizerId: organizer.id, event }
}

// ─── Block / unblock individual seats ────────────────────────────────────────

const toggleSeatSchema = z.object({
  eventId: z.string().min(1),
  eventSeatId: z.string().min(1),
  blocked: z.boolean(),
})

export async function toggleSeatBlocked(input: {
  eventId: string
  eventSeatId: string
  blocked: boolean
}): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = toggleSeatSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, eventSeatId, blocked } = parsed.data

  const ctx = await verifyOrganizerEvent(eventId, session.userId)
  if (!ctx) return { success: false, error: 'Event not found' }

  // Load the seat to check current status
  const eventSeat = await db.eventSeat.findUnique({
    where: { id: eventSeatId, eventId },
    select: { id: true, status: true },
  })
  if (!eventSeat) return { success: false, error: 'Seat not found' }

  // Guard: cannot block a seat that's SOLD, HELD, or RESERVED
  if (blocked && ['SOLD', 'HELD', 'RESERVED'].includes(eventSeat.status)) {
    return { success: false, error: 'Cannot block a seat that is sold, held, or reserved' }
  }

  // Guard: can only unblock BLOCKED seats
  if (!blocked && eventSeat.status !== 'BLOCKED') {
    return { success: false, error: 'Seat is not currently blocked' }
  }

  await db.eventSeat.update({
    where: { id: eventSeatId },
    data: { status: blocked ? 'BLOCKED' : 'AVAILABLE' },
  })

  revalidatePath(`/dashboard/events/${eventId}/seat-map/edit`)
  return { success: true, data: undefined }
}

// ─── Bulk block/unblock seats (entire row or section) ────────────────────────

const bulkToggleSchema = z.object({
  eventId: z.string().min(1),
  eventSeatIds: z.array(z.string()).min(1).max(500),
  blocked: z.boolean(),
})

export async function bulkToggleSeatsBlocked(input: {
  eventId: string
  eventSeatIds: string[]
  blocked: boolean
}): Promise<ActionResult<{ affected: number }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = bulkToggleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, eventSeatIds, blocked } = parsed.data

  const ctx = await verifyOrganizerEvent(eventId, session.userId)
  if (!ctx) return { success: false, error: 'Event not found' }

  if (blocked) {
    // Only block AVAILABLE seats
    const result = await db.eventSeat.updateMany({
      where: {
        id: { in: eventSeatIds },
        eventId,
        status: 'AVAILABLE',
      },
      data: { status: 'BLOCKED' },
    })
    revalidatePath(`/dashboard/events/${eventId}/seat-map/edit`)
    return { success: true, data: { affected: result.count } }
  } else {
    // Only unblock BLOCKED seats
    const result = await db.eventSeat.updateMany({
      where: {
        id: { in: eventSeatIds },
        eventId,
        status: 'BLOCKED',
      },
      data: { status: 'AVAILABLE' },
    })
    revalidatePath(`/dashboard/events/${eventId}/seat-map/edit`)
    return { success: true, data: { affected: result.count } }
  }
}

// ─── Update section visual position on canvas ─────────────────────────────────

const updateSectionPositionSchema = z.object({
  sectionId: z.string().min(1),
  eventId: z.string().min(1),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
})

export async function updateSectionPosition(input: {
  sectionId: string
  eventId: string
  positionX: number
  positionY: number
  width?: number
  height?: number
}): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updateSectionPositionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { sectionId, eventId, positionX, positionY, width, height } = parsed.data

  const ctx = await verifyOrganizerEvent(eventId, session.userId)
  if (!ctx) return { success: false, error: 'Event not found' }

  // Verify section belongs to this event's seat map
  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { id: true, seatMapId: true },
  })
  if (!section || section.seatMapId !== ctx.event.seatMapId) {
    return { success: false, error: 'Section not found' }
  }

  await db.section.update({
    where: { id: sectionId },
    data: {
      positionX,
      positionY,
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
    },
  })

  // Note: we don't revalidate here because drag moves are frequent;
  // the client updates its local state optimistically.
  return { success: true, data: undefined }
}

// ─── Bulk save section positions (called on editor save/exit) ─────────────────

const saveSectionPositionsSchema = z.object({
  eventId: z.string().min(1),
  sections: z.array(
    z.object({
      sectionId: z.string().min(1),
      positionX: z.number(),
      positionY: z.number(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
  ),
})

export async function saveSectionPositions(input: {
  eventId: string
  sections: Array<{
    sectionId: string
    positionX: number
    positionY: number
    width?: number
    height?: number
  }>
}): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = saveSectionPositionsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, sections } = parsed.data

  const ctx = await verifyOrganizerEvent(eventId, session.userId)
  if (!ctx) return { success: false, error: 'Event not found' }

  await db.$transaction(
    sections.map(({ sectionId, positionX, positionY, width, height }) =>
      db.section.update({
        where: { id: sectionId },
        data: {
          positionX,
          positionY,
          ...(width != null ? { width } : {}),
          ...(height != null ? { height } : {}),
        },
      })
    )
  )

  revalidatePath(`/dashboard/events/${input.eventId}/seat-map/edit`)
  revalidatePath(`/dashboard/events/${input.eventId}`)
  return { success: true, data: undefined }
}

// ─── Update seat type for individual seat ────────────────────────────────────

const updateSeatTypeSchema = z.object({
  seatId: z.string().min(1),
  eventId: z.string().min(1),
  seatType: z.enum(['STANDARD', 'VIP', 'VVIP', 'ACCESSIBLE', 'COMPANION', 'PREMIUM']),
})

export async function updateSeatType(input: {
  seatId: string
  eventId: string
  seatType: 'STANDARD' | 'VIP' | 'VVIP' | 'ACCESSIBLE' | 'COMPANION' | 'PREMIUM'
}): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updateSeatTypeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { seatId, eventId, seatType } = parsed.data

  const ctx = await verifyOrganizerEvent(eventId, session.userId)
  if (!ctx) return { success: false, error: 'Event not found' }

  // Verify seat belongs to this event via EventSeat
  const eventSeat = await db.eventSeat.findFirst({
    where: { eventId, seatId },
    select: { id: true },
  })
  if (!eventSeat) return { success: false, error: 'Seat not found on this event' }

  await db.seat.update({
    where: { id: seatId },
    data: { type: seatType },
  })

  revalidatePath(`/dashboard/events/${eventId}/seat-map/edit`)
  return { success: true, data: undefined }
}
