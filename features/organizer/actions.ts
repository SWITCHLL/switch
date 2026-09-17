'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { EventStatus, SeatingType, TicketTypeStatus, AuditAction, AuditEntityType, TicketStatus, TicketVisibility, SessionInclusionMode } from '@/app/generated/prisma/client'
import { writeAuditLog } from '@/lib/audit'
import { advanceWaitlist } from '@/features/waitlist/actions'
import { sendTicketCancelled, sendTicketConfirmationEmail } from '@/lib/email'
import { hashPassword, generateToken, generateTicketNumber, generateQrCode } from '@/lib/crypto-utils'
import { deleteStorageFiles } from '@/lib/supabase'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
  // venueId is resolved server-side via upsertVenue; not accepted directly
  seatingType: z.nativeEnum(SeatingType),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  salesStart: z.string().datetime().optional(),
  salesEnd: z.string().datetime().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isFree: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  isVirtual: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  virtualLink: z.string().url().optional().or(z.literal('')),
})

const venueInputSchema = z.object({
  venue_name: z.string().max(200).optional(),
  venue_address: z.string().max(500).optional(),
  venue_city: z.string().max(100).optional(),
  venue_state: z.string().max(100).optional(),
})

const updateEventSchema = createEventSchema.partial().extend({
  eventId: z.string().min(1),
})

const createTicketTypeSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0),
  currency: z.string().default('NGN'),
  quantity: z.coerce.number().int().positive().optional(),
  salesStart: z.string().datetime().optional(),
  salesEnd: z.string().datetime().optional(),
})

const updateTicketTypeSchema = z.object({
  ticketTypeId: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0).optional(),
  currency: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional().nullable(),
  salesStart: z.string().datetime().optional().nullable(),
  salesEnd: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(TicketTypeStatus).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 0
  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`
  }
  return slug
}

/**
 * Inline venue data extracted from form — stored directly on Event row.
 */
function extractVenueData(input: z.infer<typeof venueInputSchema>) {
  return {
    venueName: input.venue_name || null,
    venueAddress: input.venue_address || null,
    venueCity: input.venue_city || null,
    venueState: input.venue_state || null,
  }
}

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createEvent(
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
    return { success: false, error: 'Only organizers can create events' }
  }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true, status: true },
  })
  if (!organizer || organizer.status !== 'ACTIVE') {
    return { success: false, error: 'Your organizer account is not active' }
  }

  const raw = Object.fromEntries(formData)
  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  // Extract inline venue data — stored directly on the event row
  const venueInput = venueInputSchema.parse(raw)
  const venueData = extractVenueData(venueInput)

  const { title, ...rest } = parsed.data
  const slug = await uniqueSlug(slugify(title))

  const imageUrls = formData.getAll('imageUrls').map(String).filter(Boolean)

  const event = await db.event.create({
    data: {
      organizerId: organizer.id,
      title,
      slug,
      status: EventStatus.DRAFT,
      ...rest,
      ...venueData,
      imageUrl: imageUrls[0] ?? rest.imageUrl,
      startsAt: new Date(rest.startsAt),
      endsAt: rest.endsAt ? new Date(rest.endsAt) : undefined,
      salesStart: rest.salesStart ? new Date(rest.salesStart) : undefined,
      salesEnd: rest.salesEnd ? new Date(rest.salesEnd) : undefined,
    },
    select: { id: true, slug: true },
  })

  // Save all uploaded images to EventImage table
  if (imageUrls.length > 0) {
    await db.eventImage.createMany({
      data: imageUrls.map((url, position) => ({
        eventId: event.id,
        url,
        position,
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath('/dashboard/events')
  return { success: true, data: event }
}

// ─── Update event ─────────────────────────────────────────────────────────────

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = updateEventSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, ...updates } = parsed.data

  // Verify ownership
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  const event = organizer
    ? await db.event.findUnique({
        where: { id: eventId, organizerId: organizer.id },
        select: { id: true },
      })
    : null

  if (!event) return { success: false, error: 'Event not found' }

  // Extract inline venue data — always overwrite with whatever the form sends
  const venueInput = venueInputSchema.parse(raw)
  const venueData = extractVenueData(venueInput)

  await db.event.update({
    where: { id: eventId },
    data: {
      ...updates,
      ...venueData,
      startsAt: updates.startsAt ? new Date(updates.startsAt) : undefined,
      endsAt: updates.endsAt ? new Date(updates.endsAt) : undefined,
      salesStart: updates.salesStart ? new Date(updates.salesStart) : undefined,
      salesEnd: updates.salesEnd ? new Date(updates.salesEnd) : undefined,
    },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: undefined }
}

// ─── Publish / unpublish event ────────────────────────────────────────────────

export async function publishEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    include: { ticketTypes: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Basic publishing validation
  if (!event.startsAt) return { success: false, error: 'Event must have a start date' }
  if (!event.ticketTypes.length)
    return { success: false, error: 'Event must have at least one ticket type' }
  if (event.ticketTypes.some((tt) => tt.price < 0)) {
    return { success: false, error: 'All ticket types must have a valid price' }
  }

  await db.event.update({
    where: { id: eventId },
    data: { status: EventStatus.PUBLISHED },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/events/${event.slug}`)
  return { success: true, data: undefined }
}

export async function unpublishEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  await db.event.update({
    where: { id: eventId, organizerId: organizer.id },
    data: { status: EventStatus.DRAFT },
  })

  revalidatePath('/dashboard/events')
  return { success: true, data: undefined }
}

// ─── Add ticket type ──────────────────────────────────────────────────────────

export async function addTicketType(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = createTicketTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  const tt = await db.ticketType.create({
    data: {
      ...parsed.data,
      salesStart: parsed.data.salesStart ? new Date(parsed.data.salesStart) : undefined,
      salesEnd: parsed.data.salesEnd ? new Date(parsed.data.salesEnd) : undefined,
    },
    select: { id: true },
  })

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`)
  return { success: true, data: tt }
}

// ─── Delete ticket type ───────────────────────────────────────────────────────

export async function deleteTicketType(ticketTypeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const tt = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { eventId: true, sold: true, event: { select: { organizerId: true } } },
  })

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!tt || !organizer || tt.event.organizerId !== organizer.id) {
    return { success: false, error: 'Not found' }
  }
  if (tt.sold > 0) {
    return { success: false, error: 'Cannot delete a ticket type with sold tickets' }
  }

  await db.ticketType.delete({ where: { id: ticketTypeId } })
  revalidatePath(`/dashboard/events/${tt.eventId}`)
  return { success: true, data: undefined }
}

// ─── Save event images (replace all images for an event) ─────────────────────

export async function saveEventImages(eventId: string, imageUrls: string[]): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Find URLs that are being removed so we can delete them from storage
  const existing = await db.eventImage.findMany({
    where: { eventId },
    select: { url: true },
  })
  const existingUrls = existing.map((img) => img.url)
  const newUrlSet = new Set(imageUrls)
  const removedUrls = existingUrls.filter((url) => !newUrlSet.has(url))

  await db.$transaction(async (tx) => {
    // Replace all existing images
    await tx.eventImage.deleteMany({ where: { eventId } })

    if (imageUrls.length > 0) {
      await tx.eventImage.createMany({
        data: imageUrls.map((url, position) => ({ eventId, url, position })),
      })
    }

    // Keep Event.imageUrl in sync with the primary (position 0)
    await tx.event.update({
      where: { id: eventId },
      data: { imageUrl: imageUrls[0] ?? null },
    })
  })

  // Delete removed files from storage (non-blocking, best-effort)
  if (removedUrls.length > 0) {
    deleteStorageFiles(removedUrls).catch(console.error)
  }

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: undefined }
}

// ─── Speakers / Guests / Performers ──────────────────────────────────────────

const upsertSpeakerSchema = z.object({
  eventId: z.string().min(1),
  speakerId: z.string().optional(), // present when updating
  name: z.string().min(1).max(120),
  role: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export async function saveSpeaker(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = upsertSpeakerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, speakerId, name, role, avatarUrl } = parsed.data

  // Verify ownership
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  const event = organizer
    ? await db.event.findUnique({
        where: { id: eventId, organizerId: organizer.id },
        select: { id: true },
      })
    : null
  if (!event) return { success: false, error: 'Event not found' }

  const data = {
    name,
    role: role || null,
    avatarUrl: avatarUrl || null,
  }

  if (speakerId) {
    // Fetch old avatar URL before overwriting — delete from storage if replaced
    const existing = await db.eventSpeaker.findUnique({
      where: { id: speakerId, eventId },
      select: { avatarUrl: true },
    })
    const oldAvatar = existing?.avatarUrl ?? null
    const newAvatar = avatarUrl || null
    const avatarReplaced = oldAvatar && oldAvatar !== newAvatar

    await db.eventSpeaker.update({
      where: { id: speakerId, eventId },
      data,
    })

    // Delete old avatar from storage if it was replaced or removed (non-blocking)
    if (avatarReplaced) {
      deleteStorageFiles([oldAvatar]).catch(console.error)
    }

    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, data: { id: speakerId } }
  } else {
    // Create new — append at end
    const count = await db.eventSpeaker.count({ where: { eventId } })
    const speaker = await db.eventSpeaker.create({
      data: { eventId, ...data, position: count },
      select: { id: true },
    })
    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, data: speaker }
  }
}

export async function deleteSpeaker(speakerId: string, eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  const event = organizer
    ? await db.event.findUnique({
        where: { id: eventId, organizerId: organizer.id },
        select: { id: true },
      })
    : null
  if (!event) return { success: false, error: 'Event not found' }

  // Fetch avatar URL before deleting so we can remove it from storage
  const speaker = await db.eventSpeaker.findUnique({
    where: { id: speakerId, eventId },
    select: { avatarUrl: true },
  })

  await db.eventSpeaker.delete({ where: { id: speakerId, eventId } })

  // Delete avatar from storage (non-blocking, best-effort)
  if (speaker?.avatarUrl) {
    deleteStorageFiles([speaker.avatarUrl]).catch(console.error)
  }

  // Re-order remaining speakers
  const remaining = await db.eventSpeaker.findMany({
    where: { eventId },
    orderBy: { position: 'asc' },
    select: { id: true },
  })
  await Promise.all(
    remaining.map((s, i) => db.eventSpeaker.update({ where: { id: s.id }, data: { position: i } }))
  )

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: undefined }
}

// ─── Cancel event ─────────────────────────────────────────────────────────────

export async function cancelEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, status: true, slug: true },
  })
  if (!event) return { success: false, error: 'Event not found' }
  if (event.status === EventStatus.CANCELLED) {
    return { success: false, error: 'Event is already cancelled' }
  }

  await db.event.update({
    where: { id: eventId },
    data: { status: EventStatus.CANCELLED },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${eventId}`)
  revalidatePath(`/events/${event.slug}`)
  return { success: true, data: undefined }
}

// ─── Delete event (hard delete — cleans up storage) ───────────────────────────

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: {
      id: true,
      slug: true,
      images: { select: { url: true } },
      speakers: { select: { avatarUrl: true } },
      _count: { select: { tickets: true } },
    },
  })
  if (!event) return { success: false, error: 'Event not found' }
  if (event._count.tickets > 0) {
    return { success: false, error: 'Cannot delete an event with confirmed tickets. Cancel it instead.' }
  }

  // Collect all storage URLs before deleting the DB records
  const storageUrls: string[] = [
    ...event.images.map((img) => img.url),
    ...event.speakers.map((s) => s.avatarUrl).filter((u): u is string => Boolean(u)),
  ]

  // Hard delete — cascades to images, speakers, ticket types, etc.
  await db.event.delete({ where: { id: eventId } })

  // Clean up storage files (non-blocking, best-effort)
  if (storageUrls.length > 0) {
    deleteStorageFiles(storageUrls).catch(console.error)
  }

  revalidatePath('/dashboard/events')
  revalidatePath(`/events/${event.slug}`)
  return { success: true, data: undefined }
}

// ─── Update ticket type ───────────────────────────────────────────────────────

export async function updateTicketType(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)

  // Normalise nullable fields: empty string → null
  if (raw.quantity === '') raw.quantity = null as unknown as string
  if (raw.salesStart === '') raw.salesStart = null as unknown as string
  if (raw.salesEnd === '') raw.salesEnd = null as unknown as string

  const parsed = updateTicketTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { ticketTypeId, ...updates } = parsed.data

  const tt = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { eventId: true, event: { select: { organizerId: true } } },
  })
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!tt || !organizer || tt.event.organizerId !== organizer.id) {
    return { success: false, error: 'Not found' }
  }

  await db.ticketType.update({
    where: { id: ticketTypeId },
    data: {
      ...updates,
      salesStart: updates.salesStart ? new Date(updates.salesStart) : updates.salesStart,
      salesEnd: updates.salesEnd ? new Date(updates.salesEnd) : updates.salesEnd,
    },
  })

  revalidatePath(`/dashboard/events/${tt.eventId}`)
  return { success: true, data: undefined }
}

// ─── Seat configuration ───────────────────────────────────────────────────────

const seatSectionSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20),
  type: z.enum(['RESERVED', 'GENERAL_ADMISSION']),
  ticketTypeId: z.string().min(1),
  priceOverride: z.coerce.number().int().min(0).optional(),
  rows: z
    .array(
      z.object({
        label: z.string().min(1).max(20),
        seatCount: z.coerce.number().int().min(1).max(500),
      })
    )
    .min(1),
})

const saveSeatConfigSchema = z.object({
  eventId: z.string().min(1),
  sections: z.array(seatSectionSchema).min(1),
})

export async function saveSeatConfiguration(input: {
  eventId: string
  sections: Array<{
    name: string
    code: string
    type: 'RESERVED' | 'GENERAL_ADMISSION'
    ticketTypeId: string
    priceOverride?: number
    rows: Array<{ label: string; seatCount: number }>
  }>
}): Promise<ActionResult<{ totalSeats: number }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = saveSeatConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, sections } = parsed.data

  // ── Ownership check ───────────────────────────────────────────────────────
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: {
      id: true,
      title: true,
      venueCity: true,
      venueId: true,
      seatMapId: true,
      ticketTypes: { select: { id: true, price: true } },
    },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // ── Guard: cannot reconfigure if any seats are SOLD/HELD ─────────────────
  const blockedCount = await db.eventSeat.count({
    where: { eventId, status: { in: ['SOLD', 'HELD', 'RESERVED'] } },
  })
  if (blockedCount > 0) {
    return {
      success: false,
      error: `Cannot reconfigure seats: ${blockedCount} seat(s) are already sold, held, or reserved.`,
    }
  }

  // ── Validate all ticketTypeIds belong to this event ───────────────────────
  const eventTTIds = new Set(event.ticketTypes.map((tt) => tt.id))
  for (const sec of sections) {
    if (!eventTTIds.has(sec.ticketTypeId)) {
      return { success: false, error: `Ticket type not found on this event` }
    }
  }

  const ttPriceMap = new Map(event.ticketTypes.map((tt) => [tt.id, tt.price]))

  // ── Transaction ───────────────────────────────────────────────────────────
  const totalSeats = await db.$transaction(async (tx) => {
    // 1. Find or create a Venue (required FK for SeatMap)
    let venueId = event.venueId
    if (!venueId) {
      const venue = await tx.venue.create({
        data: { name: event.title, city: event.venueCity ?? 'Lagos', country: 'Nigeria' },
        select: { id: true },
      })
      venueId = venue.id
      await tx.event.update({ where: { id: eventId }, data: { venueId } })
    }

    // 2. Find or create a SeatMap for this event
    let seatMapId = event.seatMapId
    if (!seatMapId) {
      const seatMap = await tx.seatMap.create({
        data: { venueId, name: event.title },
        select: { id: true },
      })
      seatMapId = seatMap.id
    }

    // 3. Delete AVAILABLE EventSeats so we can recreate cleanly
    await tx.eventSeat.deleteMany({ where: { eventId, status: 'AVAILABLE' } })

    // 4. Build seat layout and collect EventSeat records
    let count = 0
    const eventSeatData: {
      eventId: string
      seatId: string
      ticketTypeId: string
      price: number
      status: 'AVAILABLE'
    }[] = []

    for (const sec of sections) {
      // Section has no unique constraint on (seatMapId, code) — findFirst then upsert manually
      let section = await tx.section.findFirst({
        where: { seatMapId, code: sec.code },
        select: { id: true },
      })
      if (section) {
        await tx.section.update({
          where: { id: section.id },
          data: { name: sec.name, type: sec.type },
        })
      } else {
        section = await tx.section.create({
          data: { seatMapId, name: sec.name, code: sec.code, type: sec.type },
          select: { id: true },
        })
      }

      const sectionId = section.id
      const price = sec.priceOverride ?? ttPriceMap.get(sec.ticketTypeId) ?? 0

      for (let rowIdx = 0; rowIdx < sec.rows.length; rowIdx++) {
        const rowDef = sec.rows[rowIdx]!

        // Row: @@unique([sectionId, label])
        const row = await tx.row.upsert({
          where: { sectionId_label: { sectionId, label: rowDef.label } },
          update: { position: rowIdx, seatsCount: rowDef.seatCount },
          create: { sectionId, label: rowDef.label, position: rowIdx, seatsCount: rowDef.seatCount },
          select: { id: true },
        })

        for (let seatNum = 1; seatNum <= rowDef.seatCount; seatNum++) {
          const seatLabel = `${rowDef.label}${seatNum}`

          // Seat: @@unique([rowId, label])
          const seat = await tx.seat.upsert({
            where: { rowId_label: { rowId: row.id, label: seatLabel } },
            update: { number: seatNum, sectionId },
            create: { rowId: row.id, sectionId, label: seatLabel, number: seatNum },
            select: { id: true },
          })

          eventSeatData.push({
            eventId,
            seatId: seat.id,
            ticketTypeId: sec.ticketTypeId,
            price,
            status: 'AVAILABLE',
          })
          count++
        }
      }
    }

    // Batch-insert EventSeats (skipDuplicates handles any edge-case overlaps)
    await tx.eventSeat.createMany({ data: eventSeatData, skipDuplicates: true })

    // 5. Link SeatMap to event
    await tx.event.update({ where: { id: eventId }, data: { seatMapId } })

    return count
  })

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: { totalSeats } }
}


// ─── Cancel Ticket ────────────────────────────────────────────────────────────

export async function cancelTicket(input: {
  ticketId: string
  eventId: string
  reason?: string
  force?: boolean
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // Verify organizer
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify event ownership
  const event = await db.event.findUnique({
    where: { id: input.eventId, organizerId: organizer.id },
    select: { id: true, title: true, slug: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Load ticket
  const ticket = await db.ticket.findUnique({
    where: { id: input.ticketId, eventId: input.eventId },
    select: {
      id: true,
      status: true,
      ticketTypeId: true,
      eventSeatId: true,
      ticketNumber: true,
      ticketType: { select: { sold: true } },
      user: { select: { email: true, name: true } },
    },
  })
  if (!ticket) return { success: false, error: 'Ticket not found' }

  // Block if already in a terminal state
  if (ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.REFUNDED) {
    return { success: false, error: `Ticket is already ${ticket.status.toLowerCase()}` }
  }

  // If ticket is USED, require force flag
  if (ticket.status === TicketStatus.USED && !input.force) {
    return { success: false, error: 'CHECKED_IN_REQUIRES_FORCE' }
  }

  try {
    await db.$transaction(async (tx) => {
      // Set ticket CANCELLED
      await tx.ticket.update({
        where: { id: input.ticketId },
        data: { status: TicketStatus.CANCELLED },
      })

      // Release EventSeat if reserved
      if (ticket.eventSeatId) {
        await tx.eventSeat.update({
          where: { id: ticket.eventSeatId },
          data: { status: 'AVAILABLE', reservationId: null },
        })
      } else {
        // GA ticket: decrement sold
        await tx.ticketType.update({
          where: { id: ticket.ticketTypeId },
          data: { sold: { decrement: 1 } },
        })
      }

      // Write audit log
      await writeAuditLog(tx, {
        entityType: AuditEntityType.TICKET,
        entityId: input.ticketId,
        action: AuditAction.CANCELLED,
        oldStatus: ticket.status,
        newStatus: TicketStatus.CANCELLED,
        actor: organizer.id,
        metadata: { reason: input.reason, force: input.force },
      })
    })

    // Advance waitlist non-blocking (for GA cancellation releasing a slot)
    if (!ticket.eventSeatId) {
      advanceWaitlist({
        ticketTypeId: ticket.ticketTypeId,
        releasedQty: 1,
      }).catch(console.error)
    }

    // Send cancellation email non-blocking
    sendTicketCancelled({
      toEmail: ticket.user.email,
      toName: ticket.user.name,
      eventTitle: event.title,
      eventSlug: event.slug,
      ticketNumber: ticket.ticketNumber,
      reason: input.reason,
    }).catch(console.error)

    revalidatePath(`/dashboard/events/${input.eventId}/reservations`)
    return { success: true }
  } catch (err) {
    console.error('[cancelTicket] error:', err)
    return { success: false, error: 'Failed to cancel ticket. Please try again.' }
  }
}

// ─── Issue Complimentary Ticket ───────────────────────────────────────────────

export async function issueComplimentaryTicket(input: {
  eventId: string
  ticketTypeId: string
  recipientEmail: string
  recipientName: string
}): Promise<{ success: true; ticketId: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // Verify organizer
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify event ownership
  const event = await db.event.findUnique({
    where: { id: input.eventId, organizerId: organizer.id },
    select: { id: true, title: true, slug: true, startsAt: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Verify ticket type belongs to event
  const ticketType = await db.ticketType.findUnique({
    where: { id: input.ticketTypeId, eventId: input.eventId },
    select: { id: true, name: true, price: true, currency: true },
  })
  if (!ticketType) return { success: false, error: 'Ticket type not found' }

  try {
    // Upsert user by email
    const recipient = await db.user.upsert({
      where: { email: input.recipientEmail },
      create: { email: input.recipientEmail, name: input.recipientName },
      update: {},
      select: { id: true, email: true, name: true },
    })

    // Generate unique ticket number and QR code
    const ticketNumber = generateTicketNumber()
    const qrCode = generateQrCode()

    const ticket = await db.$transaction(async (tx) => {
      const newTicket = await tx.ticket.create({
        data: {
          eventId: input.eventId,
          userId: recipient.id,
          ticketTypeId: input.ticketTypeId,
          ticketNumber,
          qrCode,
          status: TicketStatus.ACTIVE,
          isComplimentary: true,
          issuedAt: new Date(),
        },
        select: { id: true },
      })

      await writeAuditLog(tx, {
        entityType: AuditEntityType.TICKET,
        entityId: newTicket.id,
        action: AuditAction.ISSUED,
        newStatus: TicketStatus.ACTIVE,
        actor: organizer.id,
        metadata: {
          isComplimentary: true,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
        },
      })

      return newTicket
    })

    // Send confirmation email non-blocking
    sendTicketConfirmationEmail({
      userId: recipient.id,
      eventTitle: event.title,
      eventDate: event.startsAt,
      eventSlug: event.slug,
      ticketCount: 1,
      reservationId: ticket.id,
      tickets: [
        {
          ticketNumber,
          qrCode,
          ticketTypeName: ticketType.name,
          seatLabel: null,
        },
      ],
    }).catch(console.error)

    revalidatePath(`/dashboard/events/${input.eventId}/reservations`)
    return { success: true, ticketId: ticket.id }
  } catch (err) {
    console.error('[issueComplimentaryTicket] error:', err)
    return { success: false, error: 'Failed to issue complimentary ticket. Please try again.' }
  }
}

// ─── Resend Confirmation Email ────────────────────────────────────────────────

export async function resendConfirmationEmail(input: {
  ticketId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // Verify organizer
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Load ticket with event and user info
  const ticket = await db.ticket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      ticketNumber: true,
      qrCode: true,
      status: true,
      eventId: true,
      userId: true,
      ticketType: { select: { name: true } },
      eventSeat: { select: { seat: { select: { label: true } } } },
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          organizerId: true,
        },
      },
    },
  })

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.event.organizerId !== organizer.id) {
    return { success: false, error: 'Ticket does not belong to your event' }
  }

  try {
    await sendTicketConfirmationEmail({
      userId: ticket.userId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startsAt,
      eventSlug: ticket.event.slug,
      ticketCount: 1,
      reservationId: ticket.eventId,
      tickets: [
        {
          ticketNumber: ticket.ticketNumber,
          qrCode: ticket.qrCode,
          ticketTypeName: ticket.ticketType.name,
          seatLabel: ticket.eventSeat?.seat.label ?? null,
        },
      ],
    })
    return { success: true }
  } catch (err) {
    console.error('[resendConfirmationEmail] error:', err)
    return { success: false, error: 'Failed to send confirmation email. Please try again.' }
  }
}

// ─── Export Reservations CSV ──────────────────────────────────────────────────

export async function exportReservationsCSV(
  eventId: string
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // Verify organizer
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify event ownership
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  try {
    const tickets = await db.ticket.findMany({
      where: {
        eventId,
        status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
      },
      select: {
        ticketNumber: true,
        status: true,
        issuedAt: true,
        isComplimentary: true,
        user: { select: { name: true, email: true } },
        ticketType: { select: { name: true, currency: true } },
        eventSeat: { select: { seat: { select: { label: true } } } },
        // Payment is now reached via Order → Payment
        order: { select: { payment: { select: { amount: true } } } },
      },
      orderBy: { issuedAt: 'asc' },
    })

    // Build CSV
    const headers = [
      'ticketNumber',
      'status',
      'attendeeName',
      'email',
      'ticketType',
      'seatInfo',
      'purchaseDate',
      'amount',
      'isComplimentary',
    ]

    const escapeCSV = (val: string | number | boolean | null | undefined): string => {
      const str = val == null ? '' : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = tickets.map((t) => [
      t.ticketNumber,
      t.status,
      t.user.name ?? '',
      t.user.email,
      t.ticketType.name,
      t.eventSeat?.seat.label ?? '',
      t.issuedAt.toISOString(),
      t.order?.payment ? String(t.order.payment.amount) : '0',
      t.isComplimentary ? 'true' : 'false',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n')

    return { success: true, csv }
  } catch (err) {
    console.error('[exportReservationsCSV] error:', err)
    return { success: false, error: 'Failed to export CSV. Please try again.' }
  }
}

// ─── Export Inventory CSV ──────────────────────────────────────────────────────

export async function exportInventoryCSV(
  eventId: string
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Reuse the inventory query
  const { getEventInventory } = await import('@/features/organizer/queries')
  const inventory = await getEventInventory(eventId, organizer.id)
  if (!inventory) return { success: false, error: 'Could not load inventory' }

  const escapeCSV = (val: string | number | boolean | null | undefined): string => {
    const str = val == null ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headers = ['ticketTypeName', 'total', 'sold', 'held', 'available', 'cancelled', 'waitlist']
  const rows = inventory.ticketTypes.map((tt) => [
    tt.name,
    tt.total ?? 'unlimited',
    tt.sold,
    tt.held,
    tt.available ?? 'unlimited',
    tt.cancelled,
    tt.waitlistCount,
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(','))
    .join('\n')

  return { success: true, csv }
}

// ─── Upsert Ticket Type (extended) ────────────────────────────────────────────

const upsertTicketTypeSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(80),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0, 'Price must be ≥ 0'),
  currency: z.string().default('NGN'),
  quantity: z.coerce.number().int().positive().optional().nullable(),
  salesStart: z.string().datetime().optional().nullable(),
  salesEnd: z.string().datetime().optional().nullable(),
  minPerOrder: z.coerce.number().int().positive().optional().nullable(),
  maxPerOrder: z.coerce.number().int().positive().optional().nullable(),
  maxPerUser: z.coerce.number().int().positive().optional().nullable(),
  visibility: z.nativeEnum(TicketVisibility).default(TicketVisibility.PUBLIC),
  accessPassword: z.string().optional(),
  isTableType: z.coerce.boolean().default(false),
  tableCapacity: z.coerce.number().int().positive().optional().nullable(),
  requiresAssignedSeating: z.coerce.boolean().default(false),
})

export async function upsertTicketType(input: {
  eventId: string
  ticketTypeId?: string
  name: string
  description?: string
  price: number
  currency?: string
  quantity?: number | null
  salesStart?: string | null
  salesEnd?: string | null
  minPerOrder?: number | null
  maxPerOrder?: number | null
  maxPerUser?: number | null
  visibility?: TicketVisibility
  accessPassword?: string
  isTableType?: boolean
  tableCapacity?: number | null
  requiresAssignedSeating?: boolean
}): Promise<
  | { success: true; ticketTypeId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }
> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = upsertTicketTypeSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? 'unknown'
      fieldErrors[field] = issue.message
    }
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input', fieldErrors }
  }

  const {
    eventId,
    ticketTypeId,
    name,
    description,
    price,
    currency,
    quantity,
    salesStart,
    salesEnd,
    minPerOrder,
    maxPerOrder,
    maxPerUser,
    visibility,
    accessPassword,
    isTableType,
    tableCapacity,
    requiresAssignedSeating,
  } = parsed.data

  // Verify organizer
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify event ownership
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, status: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Guard: for updates on published events with confirmed tickets, reject quantity reductions below sold
  if (ticketTypeId && quantity !== undefined && quantity !== null) {
    const existing = await db.ticketType.findUnique({
      where: { id: ticketTypeId },
      select: { sold: true },
    })
    if (existing && event.status === 'PUBLISHED' && quantity < existing.sold) {
      return {
        success: false,
        error: `Cannot reduce quantity below current sales (${existing.sold} tickets sold)`,
        fieldErrors: { quantity: `Must be at least ${existing.sold} (tickets sold)` },
      }
    }
  }

  // Hash password if PASSWORD_PROTECTED
  let accessPasswordHash: string | undefined | null = undefined
  let directLinkToken: string | undefined | null = undefined

  if (visibility === TicketVisibility.PASSWORD_PROTECTED) {
    if (!accessPassword) {
      return {
        success: false,
        error: 'Password is required for password-protected ticket types',
        fieldErrors: { accessPassword: 'Password is required' },
      }
    }
    accessPasswordHash = await hashPassword(accessPassword, 10)
    directLinkToken = null // clear any previous token
  } else if (visibility === TicketVisibility.HIDDEN) {
    // Only generate a new token if creating or if the type is being changed to HIDDEN
    if (!ticketTypeId) {
      directLinkToken = generateToken(20)
    } else {
      // Check if it already has a token; if not, generate one
      const existing = await db.ticketType.findUnique({
        where: { id: ticketTypeId },
        select: { directLinkToken: true, visibility: true },
      })
      if (!existing?.directLinkToken) {
        directLinkToken = generateToken(20)
      }
      // else keep existing token (don't rotate on re-save)
    }
    accessPasswordHash = null // clear any previous password hash
  } else {
    // PUBLIC — clear sensitive fields
    accessPasswordHash = null
    directLinkToken = null
  }

  try {
    const data = {
      name,
      description: description ?? null,
      price,
      currency: currency ?? 'NGN',
      quantity: quantity ?? null,
      salesStart: salesStart ? new Date(salesStart) : null,
      salesEnd: salesEnd ? new Date(salesEnd) : null,
      minPerOrder: minPerOrder ?? null,
      maxPerOrder: maxPerOrder ?? null,
      maxPerUser: maxPerUser ?? null,
      visibility,
      ...(accessPasswordHash !== undefined ? { accessPasswordHash } : {}),
      ...(directLinkToken !== undefined ? { directLinkToken } : {}),
      isTableType: isTableType ?? false,
      tableCapacity: tableCapacity ?? null,
      requiresAssignedSeating: requiresAssignedSeating ?? false,
    }

    let ttId: string
    if (ticketTypeId) {
      await db.ticketType.update({
        where: { id: ticketTypeId, eventId },
        data,
      })
      ttId = ticketTypeId
    } else {
      const tt = await db.ticketType.create({
        data: { eventId, ...data },
        select: { id: true },
      })
      ttId = tt.id
    }

    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, ticketTypeId: ttId }
  } catch (err) {
    console.error('[upsertTicketType] error:', err)
    return { success: false, error: 'Failed to save ticket type. Please try again.' }
  }
}

// ─── Time Slot actions (inline — avoids dynamic import in 'use server') ───────

const upsertTimeSlotInlineSchema = z.object({
  eventId:    z.string().min(1),
  timeSlotId: z.string().optional(),
  label:      z.string().min(1).max(120),
  startsAt:   z.string().datetime(),
  endsAt:     z.string().datetime(),
  capacities: z.array(z.object({
    ticketTypeId: z.string().min(1),
    capacity:     z.number().int().min(1),
  })).min(1),
})

export async function upsertTimeSlot(input: unknown): Promise<
  { success: true; timeSlotId: string } | { success: false; error: string }
> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  const parsed = upsertTimeSlotInlineSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { eventId, timeSlotId, label, startsAt, endsAt, capacities } = parsed.data

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  for (const cap of capacities) {
    const tt = await db.ticketType.findUnique({
      where: { id: cap.ticketTypeId },
      select: { eventId: true },
    })
    if (!tt || tt.eventId !== eventId) {
      return { success: false, error: 'Invalid ticket type for this event' }
    }
  }

  if (new Date(startsAt) >= new Date(endsAt)) {
    return { success: false, error: 'Start time must be before end time' }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let slot: { id: string }
      if (timeSlotId) {
        slot = await tx.timeSlot.update({
          where: { id: timeSlotId, eventId },
          data: { label, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
          select: { id: true },
        })
      } else {
        slot = await tx.timeSlot.create({
          data: { eventId, label, startsAt: new Date(startsAt), endsAt: new Date(endsAt), status: TicketTypeStatus.ACTIVE },
          select: { id: true },
        })
      }

      for (const cap of capacities) {
        await tx.$executeRaw`
          INSERT INTO "time_slot_capacities"
            ("id", "timeSlotId", "ticketTypeId", "capacity", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${slot.id}, ${cap.ticketTypeId}, ${cap.capacity}, NOW(), NOW())
          ON CONFLICT ("timeSlotId", "ticketTypeId")
          DO UPDATE SET "capacity" = EXCLUDED."capacity", "updatedAt" = NOW()
        `
      }

      const keepIds = capacities.map((c) => c.ticketTypeId)
      if (keepIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM "time_slot_capacities"
          WHERE "timeSlotId" = ${slot.id}
            AND "ticketTypeId" != ALL(${keepIds}::text[])
        `
      }
      return slot
    })

    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, timeSlotId: result.id }
  } catch (err) {
    console.error('[upsertTimeSlot] error:', err)
    return { success: false, error: 'Failed to save time slot. Please try again.' }
  }
}

export async function deleteTimeSlot(
  timeSlotId: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const slot = await db.timeSlot.findUnique({
    where: { id: timeSlotId, eventId },
    select: {
      id: true,
      event: { select: { organizerId: true } },
      _count: { select: { tickets: true } },
    },
  })
  if (!slot || slot.event.organizerId !== organizer.id) {
    return { success: false, error: 'Time slot not found' }
  }
  if (slot._count.tickets > 0) {
    return { success: false, error: 'Cannot delete a slot with confirmed tickets' }
  }

  await db.timeSlot.delete({ where: { id: timeSlotId } })
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}

// ─── Upsert Event Session ─────────────────────────────────────────────────────

const upsertEventSessionSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(2000).optional().nullable(),
  facilitator: z.string().max(120).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().int().min(0).default(0),
  currency: z.string().default('NGN'),
  inclusionMode: z.nativeEnum(SessionInclusionMode).default(SessionInclusionMode.INCLUDED),
}).refine((d) => new Date(d.startsAt) < new Date(d.endsAt), {
  message: 'Start time must be before end time',
  path: ['endsAt'],
})

export async function upsertEventSession(input: {
  eventId: string
  sessionId?: string
  title: string
  description?: string | null
  facilitator?: string | null
  startsAt: string
  endsAt: string
  capacity?: number | null
  price?: number
  currency?: string
  inclusionMode?: SessionInclusionMode
}): Promise<{ success: true; sessionId: string } | { success: false; error: string; fieldErrors?: Record<string, string> }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = upsertEventSessionSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? 'unknown'
      fieldErrors[field] = issue.message
    }
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input', fieldErrors }
  }

  const { eventId, sessionId, title, description, facilitator, startsAt, endsAt, capacity, price, currency, inclusionMode } = parsed.data

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  try {
    let sId: string
    if (sessionId) {
      await db.eventSession.update({
        where: { id: sessionId, eventId },
        data: {
          title,
          description: description ?? null,
          facilitator: facilitator ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          capacity: capacity ?? null,
          price: price ?? 0,
          currency: currency ?? 'NGN',
          inclusionMode,
        },
      })
      sId = sessionId
    } else {
      const s = await db.eventSession.create({
        data: {
          eventId,
          title,
          description: description ?? null,
          facilitator: facilitator ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          capacity: capacity ?? null,
          price: price ?? 0,
          currency: currency ?? 'NGN',
          inclusionMode,
        },
        select: { id: true },
      })
      sId = s.id
    }

    revalidatePath(`/dashboard/events/${eventId}`)
    return { success: true, sessionId: sId }
  } catch (err) {
    console.error('[upsertEventSession] error:', err)
    return { success: false, error: 'Failed to save session. Please try again.' }
  }
}

// ─── Delete Event Session ─────────────────────────────────────────────────────

export async function deleteEventSession(
  sessionId: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Guard: cannot delete if enrolments exist
  const enrolmentCount = await db.sessionEnrolment.count({ where: { sessionId } })
  if (enrolmentCount > 0) {
    return { success: false, error: `Cannot delete: ${enrolmentCount} enrolment(s) exist for this session` }
  }

  await db.eventSession.delete({ where: { id: sessionId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}

// ─── (End of file — upsert/delete actions defined above) ──────────────────────

// ─── Event Schedule Items ─────────────────────────────────────────────────────

const upsertScheduleItemSchema = z.object({
  eventId: z.string().min(1),
  scheduleItemId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  hostName: z.string().max(120).optional().nullable(),
  speakerId: z.string().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  position: z.coerce.number().int().min(0).default(0),
})

export async function upsertScheduleItem(input: {
  eventId: string
  scheduleItemId?: string
  title: string
  description?: string
  hostName?: string
  speakerId?: string | null
  startsAt?: string | null
  endsAt?: string | null
  position?: number
}): Promise<{ success: true; scheduleItemId: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const parsed = upsertScheduleItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, scheduleItemId, title, description, hostName, speakerId, startsAt, endsAt, position } =
    parsed.data

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  const data = {
    title,
    description: description ?? null,
    hostName: hostName ?? null,
    speakerId: speakerId ?? null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    position,
  }

  let id: string
  if (scheduleItemId) {
    await db.eventScheduleItem.update({
      where: { id: scheduleItemId, eventId },
      data,
    })
    id = scheduleItemId
  } else {
    const item = await db.eventScheduleItem.create({
      data: { eventId, ...data },
      select: { id: true },
    })
    id = item.id
  }

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, scheduleItemId: id }
}

export async function deleteScheduleItem(
  scheduleItemId: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  await db.eventScheduleItem.delete({ where: { id: scheduleItemId, eventId } })
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true }
}
