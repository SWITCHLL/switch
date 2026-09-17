import 'server-only'
import { db } from '@/lib/db'
import { Prisma } from '@/app/generated/prisma/client'
import type { TimeSlotWithAvailability, SlotCapacity } from './types'

// ─── Types for raw query rows ─────────────────────────────────────────────────

interface CapacityRow {
  timeSlotId:    string
  ticketTypeId:  string
  capacity:      number
  ticketTypeName: string
  price:         number
  currency:      string
}

interface BookingRow {
  timeSlotId:    string
  ticketTypeId:  string
  count:         bigint
}

/**
 * Get all time slots for an event, each enriched with per-ticket-type
 * availability counts (booked + held + available).
 *
 * Uses $queryRaw for the capacity/booking tables because the Prisma generated
 * client may not yet include the new TimeSlotCapacity model until `prisma generate`
 * has been run against the updated schema.
 */
export async function getEventTimeSlots(eventId: string): Promise<TimeSlotWithAvailability[]> {
  const slots = await db.timeSlot.findMany({
    where: { eventId },
    orderBy: { startsAt: 'asc' },
    select: {
      id:       true,
      eventId:  true,
      label:    true,
      startsAt: true,
      endsAt:   true,
      status:   true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (slots.length === 0) return []

  const slotIds = slots.map((s) => s.id)

  // Fetch per-ticket-type capacities via raw SQL (new table not yet in generated client)
  const capacityRows: CapacityRow[] = await db.$queryRaw`
    SELECT
      tsc."timeSlotId",
      tsc."ticketTypeId",
      tsc."capacity",
      tt."name"     AS "ticketTypeName",
      tt."price",
      tt."currency"
    FROM "time_slot_capacities" tsc
    JOIN "ticket_types" tt ON tt."id" = tsc."ticketTypeId"
    WHERE tsc."timeSlotId" = ANY(${slotIds}::text[])
    ORDER BY tsc."timeSlotId", tt."price" ASC
  `

  // Fetch confirmed booking counts per (timeSlotId, ticketTypeId) via raw SQL
  const bookingRows: BookingRow[] = slotIds.length > 0
    ? await db.$queryRaw`
        SELECT
          tst."timeSlotId",
          tst."ticketTypeId",
          COUNT(*)::bigint AS count
        FROM "time_slot_tickets" tst
        JOIN "tickets" t ON t."id" = tst."ticketId"
        WHERE tst."timeSlotId" = ANY(${slotIds}::text[])
          AND t."status" IN ('ACTIVE', 'USED')
        GROUP BY tst."timeSlotId", tst."ticketTypeId"
      `
    : []

  // Build held map from active reservation gaHolds
  // gaHolds shape: { "<timeSlotId>:<ticketTypeId>": quantity }
  const activeReservations = await db.reservation.findMany({
    where: {
      eventId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      gaHolds: { not: Prisma.JsonNull },
    },
    select: { gaHolds: true },
  })

  const heldMap: Record<string, number> = {}
  for (const res of activeReservations) {
    const holds = res.gaHolds as Record<string, number> | null
    if (!holds) continue
    for (const [key, qty] of Object.entries(holds)) {
      heldMap[key] = (heldMap[key] ?? 0) + qty
    }
  }

  // Build booked lookup
  const bookedMap: Record<string, number> = {}
  for (const row of bookingRows) {
    const key = `${row.timeSlotId}:${row.ticketTypeId}`
    bookedMap[key] = Number(row.count)
  }

  // Group capacity rows by slotId
  const capsBySlot = new Map<string, CapacityRow[]>()
  for (const row of capacityRows) {
    const arr = capsBySlot.get(row.timeSlotId) ?? []
    arr.push(row)
    capsBySlot.set(row.timeSlotId, arr)
  }

  return slots.map((slot) => {
    const caps = capsBySlot.get(slot.id) ?? []

    const capacities: SlotCapacity[] = caps.map((cap) => {
      const holdKey   = `${slot.id}:${cap.ticketTypeId}`
      const booked    = bookedMap[holdKey] ?? 0
      const held      = heldMap[holdKey] ?? 0
      const available = Math.max(0, cap.capacity - booked - held)
      return {
        ticketTypeId:   cap.ticketTypeId,
        ticketTypeName: cap.ticketTypeName,
        price:          cap.price,
        currency:       cap.currency,
        capacity:       cap.capacity,
        booked,
        held,
        available,
      }
    })

    const isSoldOut = capacities.length > 0 && capacities.every((c) => c.available === 0)

    return {
      ...slot,
      capacities,
      isSoldOut,
    } satisfies TimeSlotWithAvailability
  })
}

/**
 * Availability snapshot for a single (timeSlotId, ticketTypeId) pair.
 */
export async function getTimeSlotAvailability(
  timeSlotId: string,
  ticketTypeId: string
): Promise<{ capacity: number; booked: number; held: number; available: number } | null> {
  // Get capacity and eventId via raw SQL
  const rows: Array<{ capacity: number; eventId: string }> = await db.$queryRaw`
    SELECT tsc."capacity", ts."eventId"
    FROM "time_slot_capacities" tsc
    JOIN "time_slots" ts ON ts."id" = tsc."timeSlotId"
    WHERE tsc."timeSlotId" = ${timeSlotId}
      AND tsc."ticketTypeId" = ${ticketTypeId}
    LIMIT 1
  `
  if (!rows[0]) return null
  const { capacity, eventId } = rows[0]

  // Booked count via raw SQL
  const bookedRows: Array<{ count: bigint }> = await db.$queryRaw`
    SELECT COUNT(*)::bigint AS count
    FROM "time_slot_tickets" tst
    JOIN "tickets" t ON t."id" = tst."ticketId"
    WHERE tst."timeSlotId" = ${timeSlotId}
      AND tst."ticketTypeId" = ${ticketTypeId}
      AND t."status" IN ('ACTIVE', 'USED')
  `
  const booked = Number(bookedRows[0]?.count ?? 0)

  // Held count from active reservation gaHolds
  const holdKey = `${timeSlotId}:${ticketTypeId}`
  const activeReservations = await db.reservation.findMany({
    where: {
      eventId,
      status: 'ACTIVE',
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

  return { capacity, booked, held, available: Math.max(0, capacity - booked - held) }
}
