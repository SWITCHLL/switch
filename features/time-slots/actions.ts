'use server'

import { db } from '@/lib/db'
import { acquireSlotHold, releaseSlotHold } from '@/lib/redis'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { scheduleReservationExpiry } from '@/lib/queues'
import { reserveTimeSlotsSchema, upsertTimeSlotSchema } from './schemas'
import {
  AuditAction,
  AuditEntityType,
  ReservationStatus,
  TicketTypeStatus,
  Prisma,
} from '@/app/generated/prisma/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVATION_TTL_MS      = 600 * 1000 // 10 minutes
const RESERVATION_TTL_SECONDS = 600

// ─── Reserve multiple time slots (attendee checkout) ─────────────────────────
//
// A user may pick multiple shows in one order, with different ticket types
// and quantities per show. All holds are acquired atomically — if any slot
// fails we roll back the ones already acquired.

export async function reserveTimeSlots(
  input: unknown
): Promise<
  | { success: true; reservationId: string; expiresAt: Date }
  | { success: false; error: string }
> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  const parsed = reserveTimeSlotsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, selections } = parsed.data
  const { userId } = session

  // 1. Validate each slot + ticket-type combination
  for (const sel of selections) {
    // Use raw SQL since TimeSlotCapacity may not be in the generated client yet
    const capRows: Array<{
      capacity: number
      slotEventId: string
      slotStatus: string
      ttStatus: string
      salesStart: Date | null
      salesEnd: Date | null
    }> = await db.$queryRaw`
      SELECT
        tsc."capacity",
        ts."eventId"   AS "slotEventId",
        ts."status"    AS "slotStatus",
        tt."status"    AS "ttStatus",
        tt."salesStart",
        tt."salesEnd"
      FROM "time_slot_capacities" tsc
      JOIN "time_slots"   ts ON ts."id" = tsc."timeSlotId"
      JOIN "ticket_types" tt ON tt."id" = tsc."ticketTypeId"
      WHERE tsc."timeSlotId"   = ${sel.timeSlotId}
        AND tsc."ticketTypeId" = ${sel.ticketTypeId}
      LIMIT 1
    `
    const row = capRows[0]

    if (!row || row.slotEventId !== eventId) {
      return { success: false, error: 'Time slot not found for this event' }
    }
    if (row.slotStatus !== 'ACTIVE') {
      return { success: false, error: 'This time slot is not available' }
    }
    if (row.ttStatus !== 'ACTIVE') {
      return { success: false, error: 'Ticket type is not available' }
    }

    const now = new Date()
    if (row.salesStart && now < row.salesStart) {
      return { success: false, error: 'Tickets for this type are not on sale yet' }
    }
    if (row.salesEnd && now > row.salesEnd) {
      return { success: false, error: 'Ticket sales for this type have ended' }
    }
  }

  // 2. Check availability per (timeSlotId, ticketTypeId) pair
  for (const sel of selections) {
    const bookedRows: Array<{ count: bigint }> = await db.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM "time_slot_tickets" tst
      JOIN "tickets" t ON t."id" = tst."ticketId"
      WHERE tst."timeSlotId"   = ${sel.timeSlotId}
        AND tst."ticketTypeId" = ${sel.ticketTypeId}
        AND t."status" IN ('ACTIVE', 'USED')
    `
    const booked = Number(bookedRows[0]?.count ?? 0)

    // Count active holds in gaHolds JSON for this slot+ticketType pair
    const holdKey = `${sel.timeSlotId}:${sel.ticketTypeId}`
    const activeReservations = await db.reservation.findMany({
      where: {
        eventId,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        gaHolds: { not: Prisma.JsonNull },
      },
      select: { gaHolds: true },
    })

    let held = 0
    for (const res of activeReservations) {
      const holds = res.gaHolds as Record<string, number> | null
      if (!holds) continue
      held += holds[holdKey] ?? 0
    }

    const capRows: Array<{ capacity: number }> = await db.$queryRaw`
      SELECT "capacity"
      FROM "time_slot_capacities"
      WHERE "timeSlotId"   = ${sel.timeSlotId}
        AND "ticketTypeId" = ${sel.ticketTypeId}
      LIMIT 1
    `
    const capacity = capRows[0]?.capacity ?? 0
    const available = capacity - booked - held

    if (available < sel.quantity) {
      return {
        success: false,
        error: available <= 0
          ? 'This time slot is sold out for the selected ticket type'
          : `Only ${available} spot(s) remaining for this show`,
      }
    }
  }

  // 3. Acquire Redis holds for all selections — all-or-nothing
  const acquiredKeys: string[] = []

  for (const sel of selections) {
    const holdKey = `${sel.timeSlotId}:${sel.ticketTypeId}`
    const acquired = await acquireSlotHold(
      holdKey, // use composite key as the timeSlotId arg
      userId,
      sel.quantity,
      RESERVATION_TTL_SECONDS
    )

    if (!acquired) {
      // Roll back all holds acquired so far
      for (const key of acquiredKeys) {
        await releaseSlotHold(key, userId)
      }
      return {
        success: false,
        error: 'A reservation for one of these slots is already in progress. Please complete or cancel it first.',
      }
    }

    acquiredKeys.push(holdKey)
  }

  // 4. DB transaction: create Reservation with gaHolds recording all slot holds
  try {
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

    // Build gaHolds: { "<timeSlotId>:<ticketTypeId>": quantity, ... }
    const gaHolds: Record<string, number> = {}
    for (const sel of selections) {
      const key = `${sel.timeSlotId}:${sel.ticketTypeId}`
      gaHolds[key] = (gaHolds[key] ?? 0) + sel.quantity
    }

    const reservation = await db.$transaction(async (tx) => {
      const newReservation = await tx.reservation.create({
        data: {
          eventId,
          userId,
          status: ReservationStatus.ACTIVE,
          expiresAt,
          gaHolds,
        },
      })

      await writeAuditLog(tx, {
        entityType: AuditEntityType.RESERVATION,
        entityId:   newReservation.id,
        action:     AuditAction.CREATED,
        newStatus:  ReservationStatus.ACTIVE,
        actor:      userId,
        metadata:   { eventId, selections, expiresAt: expiresAt.toISOString() },
      })

      return newReservation
    })

    scheduleReservationExpiry(reservation.id, reservation.expiresAt).catch(console.error)

    return { success: true, reservationId: reservation.id, expiresAt: reservation.expiresAt }
  } catch (err) {
    // Release all Redis holds on failure
    for (const key of acquiredKeys) {
      releaseSlotHold(key, userId).catch(console.error)
    }
    console.error('[reserveTimeSlots] transaction error:', err)
    return { success: false, error: 'Failed to reserve. Please try again.' }
  }
}

// ─── Organizer: upsert a time slot ───────────────────────────────────────────

export async function upsertTimeSlot(
  input: unknown
): Promise<{ success: true; timeSlotId: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  const parsed = upsertTimeSlotSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { eventId, timeSlotId, label, startsAt, endsAt, capacities } = parsed.data

  // Verify organizer owns the event
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

  // Validate all ticketTypeIds belong to this event
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
        // Update existing slot
        slot = await tx.timeSlot.update({
          where: { id: timeSlotId, eventId },
          data: { label, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
          select: { id: true },
        })
      } else {
        // Create new slot
        slot = await tx.timeSlot.create({
          data: {
            eventId,
            label,
            startsAt: new Date(startsAt),
            endsAt:   new Date(endsAt),
            status:   TicketTypeStatus.ACTIVE,
          },
          select: { id: true },
        })
      }

      // Upsert capacity entries per ticket type via raw SQL
      for (const cap of capacities) {
        await tx.$executeRaw`
          INSERT INTO "time_slot_capacities" ("id", "timeSlotId", "ticketTypeId", "capacity", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            ${slot.id},
            ${cap.ticketTypeId},
            ${cap.capacity},
            NOW(),
            NOW()
          )
          ON CONFLICT ("timeSlotId", "ticketTypeId")
          DO UPDATE SET "capacity" = EXCLUDED."capacity", "updatedAt" = NOW()
        `
      }

      // Remove capacity entries for ticket types no longer in the list
      const keepIds = capacities.map((c) => c.ticketTypeId)
      if (keepIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM "time_slot_capacities"
          WHERE "timeSlotId" = ${slot.id}
            AND "ticketTypeId" != ALL(${keepIds}::text[])
        `
      } else {
        await tx.$executeRaw`
          DELETE FROM "time_slot_capacities"
          WHERE "timeSlotId" = ${slot.id}
        `
      }

      return slot
    })

    return { success: true, timeSlotId: result.id }
  } catch (err) {
    console.error('[upsertTimeSlot] error:', err)
    return { success: false, error: 'Failed to save time slot. Please try again.' }
  }
}

// ─── Organizer: delete a time slot ───────────────────────────────────────────

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
  return { success: true }
}
