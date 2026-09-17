import 'server-only'
import { db } from '@/lib/db'
import { EventStatus, TicketStatus, WaitlistStatus, EventSeatStatus, Prisma } from '@/app/generated/prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketRow {
  id: string
  ticketNumber: string
  status: TicketStatus
  issuedAt: Date
  isComplimentary: boolean
  user: {
    name: string | null
    email: string
  }
  ticketType: {
    name: string
    price: number
    currency: string
  }
  eventSeat: {
    seat: { label: string }
  } | null
  /** Payment amount via Order → Payment (null for comps or free tickets) */
  order: {
    payment: {
      amount: number
      currency: string
    } | null
  } | null
}

export interface ReservationFilters {
  search?: string
  ticketTypeId?: string
  status?: TicketStatus
  dateFrom?: Date
  dateTo?: Date
}

export interface ReservationPagination {
  page: number
  pageSize: number
}

// ─── Get organizer profile for a user ────────────────────────────────────────

export async function getOrganizerByUserId(userId: string) {
  return db.organizer.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      status: true,
    },
  })
}

// ─── Get organizer's events ───────────────────────────────────────────────────

export async function getOrganizerEvents(organizerId: string) {
  return db.event.findMany({
    where: { organizerId },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      status: true,
      seatingType: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      category: { select: { name: true, color: true } },
      venue: { select: { name: true, city: true } },
      _count: { select: { tickets: true, eventSeats: true } },
      ticketTypes: {
        select: { price: true, quantity: true, sold: true, currency: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Get single event for management ─────────────────────────────────────────

export async function getOrganizerEvent(eventId: string, organizerId: string) {
  return db.event.findUnique({
    where: { id: eventId, organizerId },
    include: {
      category: true,
      venue: true,
      ticketTypes: { orderBy: { price: 'asc' } },
      _count: { select: { tickets: true, eventSeats: true } },
    },
  })
}

// ─── Dashboard overview stats ─────────────────────────────────────────────────

export async function getOrganizerStats(organizerId: string) {
  const [totalEvents, publishedEvents, totalTickets, upcomingEvents] = await Promise.all([
    db.event.count({ where: { organizerId } }),
    db.event.count({ where: { organizerId, status: EventStatus.PUBLISHED } }),
    db.ticket.count({
      where: { event: { organizerId } },
    }),
    db.event.count({
      where: {
        organizerId,
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
      },
    }),
  ])

  // Revenue: sum of prices for sold event seats
  const soldSeats = await db.eventSeat.aggregate({
    where: {
      event: { organizerId },
      status: 'SOLD',
    },
    _sum: { price: true },
  })

  return {
    totalEvents,
    publishedEvents,
    totalTickets,
    upcomingEvents,
    totalRevenue: soldSeats._sum.price ?? 0,
  }
}

// ─── Get event images ─────────────────────────────────────────────────────────

export async function getEventImages(eventId: string) {
  return db.eventImage.findMany({
    where: { eventId },
    select: { url: true, position: true },
    orderBy: { position: 'asc' },
  })
}

// ─── Get event speakers ───────────────────────────────────────────────────────

export async function getEventSpeakers(eventId: string) {
  return db.eventSpeaker.findMany({
    where: { eventId },
    select: { id: true, name: true, role: true, avatarUrl: true, position: true },
    orderBy: { position: 'asc' },
  })
}

// ─── User ticket history ──────────────────────────────────────────────────────

export async function getUserTickets(userId: string, filters?: { status?: string | TicketStatus }): Promise<Array<{
  id: string
  ticketNumber: string
  qrCode: string
  status: TicketStatus
  issuedAt: Date
  createdAt: Date
  updatedAt: Date
  eventId: string
  ticketTypeId: string
  userId: string
  eventSeatId: string | null
  event: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
    endsAt: Date | null
    status: string
    venue: { id: string; name: string; city: string } | null
  }
  ticketType: {
    id: string
    name: string
    price: number
    currency: string
  }
  eventSeat: {
    id: string
    seat: { id: string; label: string; number: number | null }
  } | null
}>> {
  // Validate status is a valid TicketStatus if provided
  const validStatuses = ['ACTIVE', 'USED', 'REFUNDED', 'CANCELLED', 'EXPIRED']
  const status = filters?.status && validStatuses.includes(filters.status) 
    ? (filters.status as TicketStatus)
    : undefined

  return db.ticket.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      ticketNumber: true,
      qrCode: true,
      status: true,
      issuedAt: true,
      createdAt: true,
      updatedAt: true,
      eventId: true,
      ticketTypeId: true,
      userId: true,
      eventSeatId: true,
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          endsAt: true,
          status: true,
          venue: { select: { id: true, name: true, city: true } },
        },
      },
      ticketType: { select: { id: true, name: true, price: true, currency: true } },
      eventSeat: {
        select: {
          id: true,
          seat: { select: { id: true, label: true, number: true } },
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  })
}


// ─── Seat configuration ───────────────────────────────────────────────────────

export type SeatConfigSection = {
  id: string
  name: string
  code: string
  type: string
  rows: Array<{
    id: string
    label: string
    seatCount: number
    seats: Array<{ id: string; label: string }>
  }>
  eventSeatCount: number
  ticketTypeId: string | null
  price: number | null
}

export type SeatConfig = {
  seatMapId: string
  sections: SeatConfigSection[]
}

export async function getEventSeatConfig(eventId: string): Promise<SeatConfig | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      seatMapId: true,
      seatMap: {
        select: {
          id: true,
          sections: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              rows: {
                select: {
                  id: true,
                  label: true,
                  seatsCount: true,
                  seats: {
                    select: { id: true, label: true },
                    orderBy: { number: 'asc' },
                  },
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      eventSeats: {
        select: {
          seatId: true,
          ticketTypeId: true,
          price: true,
          status: true,
          seat: { select: { sectionId: true } },
        },
      },
    },
  })

  if (!event?.seatMap) return null

  // Build a lookup: sectionId → first matching EventSeat (for ticketTypeId + price)
  const sectionEventSeatMap = new Map<string, { ticketTypeId: string | null; price: number }>()
  const sectionAvailableCount = new Map<string, number>()

  for (const es of event.eventSeats) {
    const sectionId = es.seat.sectionId
    if (!sectionEventSeatMap.has(sectionId)) {
      sectionEventSeatMap.set(sectionId, { ticketTypeId: es.ticketTypeId, price: es.price })
    }
    sectionAvailableCount.set(sectionId, (sectionAvailableCount.get(sectionId) ?? 0) + 1)
  }

  const sections: SeatConfigSection[] = event.seatMap.sections.map((sec) => ({
    id: sec.id,
    name: sec.name,
    code: sec.code,
    type: sec.type,
    rows: sec.rows.map((row) => ({
      id: row.id,
      label: row.label,
      seatCount: row.seatsCount ?? row.seats.length,
      seats: row.seats,
    })),
    eventSeatCount: sectionAvailableCount.get(sec.id) ?? 0,
    ticketTypeId: sectionEventSeatMap.get(sec.id)?.ticketTypeId ?? null,
    price: sectionEventSeatMap.get(sec.id)?.price ?? null,
  }))

  return {
    seatMapId: event.seatMap.id,
    sections,
  }
}


// ─── Reservation management ───────────────────────────────────────────────────

export async function getEventReservations(
  eventId: string,
  organizerId: string,
  filters: ReservationFilters,
  pagination: ReservationPagination
): Promise<{ tickets: TicketRow[]; total: number }> {
  // Verify organizer owns the event
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId },
    select: { id: true },
  })
  if (!event) return { tickets: [], total: 0 }

  const { search, ticketTypeId, status, dateFrom, dateTo } = filters
  const { page, pageSize } = pagination
  const skip = (page - 1) * pageSize

  // Build where clause
  const where = {
    eventId,
    ...(ticketTypeId ? { ticketTypeId } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          issuedAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search, mode: 'insensitive' as const } },
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        issuedAt: true,
        isComplimentary: true,
        user: {
          select: { name: true, email: true },
        },
        ticketType: {
          select: { name: true, price: true, currency: true },
        },
        eventSeat: {
          select: { seat: { select: { label: true } } },
        },
        order: {
          select: {
            payment: { select: { amount: true, currency: true } },
          },
        },
      },
    }),
    db.ticket.count({ where }),
  ])

  return { tickets: tickets as TicketRow[], total }
}


// ─── Inventory types ──────────────────────────────────────────────────────────

export interface TicketTypeInventory {
  ticketTypeId: string
  name: string
  total: number | null // null = unlimited
  sold: number
  held: number // active Reservations with expiresAt > now
  available: number | null // null if total is null (unlimited)
  cancelled: number
  waitlistCount: number // PENDING + OFFERED entries
}

export interface TimeSlotInventory {
  timeSlotId: string
  label: string
  startsAt: Date
  endsAt: Date
  /** Per-ticket-type breakdown */
  capacities: Array<{
    ticketTypeId:   string
    ticketTypeName: string
    capacity:       number
    booked:         number
    held:           number
    available:      number
  }>
  /** Totals across all ticket types */
  totalCapacity: number
  totalBooked:   number
  totalAvailable: number
}

export interface SessionInventory {
  sessionId: string
  title: string
  inclusionMode: string
  capacity: number | null
  enrolmentCount: number
  remaining: number | null // null if capacity is null (unlimited)
}

export interface SeatSectionInventory {
  sectionId: string
  sectionName: string
  counts: Record<EventSeatStatus, number>
}

export interface EventInventory {
  eventId: string
  ticketTypes: TicketTypeInventory[]
  timeSlots: TimeSlotInventory[]
  sessions: SessionInventory[]
  seatSections: SeatSectionInventory[]
}

// ─── Inventory query ──────────────────────────────────────────────────────────

export async function getEventInventory(
  eventId: string,
  organizerId: string
): Promise<EventInventory | null> {
  // Verify ownership
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId },
    select: { id: true, seatingType: true },
  })
  if (!event) return null

  const now = new Date()

  // Run all parallel queries
  const [
    ticketTypes,
    activeReservations,
    waitlistCounts,
    cancelledTickets,
    timeSlots,
    timeSlotBookings,
    sessions,
    seatSections,
  ] = await Promise.all([
    // 1. TicketType records
    db.ticketType.findMany({
      where: { eventId },
      select: { id: true, name: true, quantity: true, sold: true },
      orderBy: { name: 'asc' },
    }),

    // 2. Active reservations with gaHolds (held counts per ticketTypeId)
    db.reservation.findMany({
      where: {
        eventId,
        status: 'ACTIVE',
        expiresAt: { gt: now },
        gaHolds: { not: Prisma.JsonNull },
      },
      select: { gaHolds: true },
    }),

    // 3. WaitlistEntry counts (PENDING + OFFERED) per ticketTypeId
    db.waitlistEntry.groupBy({
      by: ['ticketTypeId'],
      where: {
        eventId,
        status: { in: [WaitlistStatus.PENDING, WaitlistStatus.OFFERED] },
      },
      _count: { id: true },
    }),

    // 4. Cancelled ticket counts per ticketTypeId
    db.ticket.groupBy({
      by: ['ticketTypeId'],
      where: {
        eventId,
        status: TicketStatus.CANCELLED,
      },
      _count: { id: true },
    }),

    // 5. TimeSlot records (label/times only — capacities queried separately)
    db.timeSlot.findMany({
      where: { eventId },
      select: {
        id:       true,
        label:    true,
        startsAt: true,
        endsAt:   true,
      },
      orderBy: { startsAt: 'asc' },
    }),

    // 6. TimeSlotTicket counts per timeSlotId (only confirmed tickets)
    // ticketTypeId may not exist in the old generated client yet — group by timeSlotId only
    db.timeSlotTicket.groupBy({
      by: ['timeSlotId'],
      where: {
        ticket: { eventId, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } },
      },
      _count: { id: true },
    }),

    // 7. EventSession records with enrolment counts
    db.eventSession.findMany({
      where: { eventId },
      select: {
        id: true,
        title: true,
        inclusionMode: true,
        capacity: true,
        _count: { select: { enrolments: true } },
      },
      orderBy: { startsAt: 'asc' },
    }),

    // 8. EventSeat status aggregates by section (for RESERVED/MIXED events)
    event.seatingType === 'RESERVED' || event.seatingType === 'MIXED'
      ? db.eventSeat.findMany({
          where: { eventId },
          select: {
            status: true,
            seat: {
              select: {
                sectionId: true,
                row: { select: { section: { select: { id: true, name: true } } } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ])

  // ── Build held counts from gaHolds JSON ────────────────────────────────────
  // gaHolds shape:
  //   Legacy GA:   { [ticketTypeId]: quantity }
  //   Time-slot:   { ["slotId:ticketTypeId"]: quantity }
  // For TicketType inventory we only sum plain ticketTypeId keys.
  // For TimeSlot inventory we parse composite "slotId:ticketTypeId" keys.
  const heldByTicketType = new Map<string, number>()
  // heldBySlotType: key = "slotId:ticketTypeId"
  const heldBySlotType = new Map<string, number>()

  for (const reservation of activeReservations) {
    if (!reservation.gaHolds || typeof reservation.gaHolds !== 'object') continue
    const holds = reservation.gaHolds as Record<string, number>
    for (const [key, qty] of Object.entries(holds)) {
      if (key.includes(':')) {
        // Time-slot hold: "slotId:ticketTypeId"
        heldBySlotType.set(key, (heldBySlotType.get(key) ?? 0) + (Number(qty) || 0))
        // Also credit the ticketType held total
        const ttId = key.split(':')[1]!
        heldByTicketType.set(ttId, (heldByTicketType.get(ttId) ?? 0) + (Number(qty) || 0))
      } else {
        // Legacy plain ticketTypeId key
        heldByTicketType.set(key, (heldByTicketType.get(key) ?? 0) + (Number(qty) || 0))
      }
    }
  }

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const waitlistByTicketType = new Map<string, number>(
    waitlistCounts.map((w) => [w.ticketTypeId, w._count.id])
  )
  const cancelledByTicketType = new Map<string, number>(
    cancelledTickets.map((c) => [c.ticketTypeId, c._count.id])
  )
  // bookingsBySlot: key = timeSlotId (total across all ticket types)
  const bookingsBySlot = new Map<string, number>(
    timeSlotBookings.map((b) => [b.timeSlotId, (b._count as { id: number }).id])
  )

  // Fetch time slot capacities separately (new junction table — not in old Prisma client)
  const slotIds = timeSlots.map((s) => s.id)
  const slotCapacityRows: Array<{ timeSlotId: string; ticketTypeId: string; capacity: number; ticketTypeName: string }> =
    slotIds.length > 0
      ? await db.$queryRaw`
          SELECT
            tsc."timeSlotId",
            tsc."ticketTypeId",
            tsc."capacity",
            tt."name" AS "ticketTypeName"
          FROM "time_slot_capacities" tsc
          JOIN "ticket_types" tt ON tt."id" = tsc."ticketTypeId"
          WHERE tsc."timeSlotId" = ANY(${slotIds}::text[])
          ORDER BY tsc."timeSlotId", tt."name"
        `
      : []

  // ── Assemble TicketTypeInventory ──────────────────────────────────────────
  const ticketTypeInventory: TicketTypeInventory[] = ticketTypes.map((tt) => {
    const held = heldByTicketType.get(tt.id) ?? 0
    const available = tt.quantity === null ? null : Math.max(0, tt.quantity - tt.sold - held)
    return {
      ticketTypeId: tt.id,
      name: tt.name,
      total: tt.quantity,
      sold: tt.sold,
      held,
      available,
      cancelled: cancelledByTicketType.get(tt.id) ?? 0,
      waitlistCount: waitlistByTicketType.get(tt.id) ?? 0,
    }
  })

  // ── Assemble TimeSlotInventory ────────────────────────────────────────────
  // Group capacity rows by timeSlotId
  const capsBySlot = new Map<string, typeof slotCapacityRows>()
  for (const row of slotCapacityRows) {
    const arr = capsBySlot.get(row.timeSlotId) ?? []
    arr.push(row)
    capsBySlot.set(row.timeSlotId, arr)
  }

  const timeSlotInventory: TimeSlotInventory[] = timeSlots.map((slot) => {
    const caps = capsBySlot.get(slot.id) ?? []
    const capacities = caps.map((cap) => {
      const holdKey   = `${slot.id}:${cap.ticketTypeId}`
      const booked    = bookingsBySlot.get(slot.id) ?? 0  // total per slot (until client regen)
      const held      = heldBySlotType.get(holdKey) ?? 0
      // Note: until Prisma client is regenerated with new schema, booked is the
      // total for the slot — not broken out by ticketTypeId. This is a temporary
      // approximation; it becomes exact after `prisma generate` runs.
      const available = Math.max(0, cap.capacity - booked - held)
      return {
        ticketTypeId:   cap.ticketTypeId,
        ticketTypeName: cap.ticketTypeName,
        capacity:       cap.capacity,
        booked,
        held,
        available,
      }
    })

    const totalCapacity  = caps.reduce((s, c) => s + c.capacity, 0)
    const totalBooked    = bookingsBySlot.get(slot.id) ?? 0
    const totalAvailable = Math.max(0, totalCapacity - totalBooked)

    return {
      timeSlotId:    slot.id,
      label:         slot.label,
      startsAt:      slot.startsAt,
      endsAt:        slot.endsAt,
      capacities,
      totalCapacity,
      totalBooked,
      totalAvailable,
    }
  })

  // ── Assemble SessionInventory ─────────────────────────────────────────────
  const sessionInventory: SessionInventory[] = sessions.map((s) => {
    const enrolmentCount = s._count.enrolments
    const remaining = s.capacity === null ? null : Math.max(0, s.capacity - enrolmentCount)
    return {
      sessionId: s.id,
      title: s.title,
      inclusionMode: s.inclusionMode,
      capacity: s.capacity,
      enrolmentCount,
      remaining,
    }
  })

  // ── Assemble SeatSectionInventory ─────────────────────────────────────────
  const seatSectionMap = new Map<
    string,
    { sectionName: string; counts: Record<EventSeatStatus, number> }
  >()

  for (const seat of seatSections as Array<{
    status: EventSeatStatus
    seat: { sectionId: string; row: { section: { id: string; name: string } } }
  }>) {
    const section = seat.seat.row.section
    if (!seatSectionMap.has(section.id)) {
      seatSectionMap.set(section.id, {
        sectionName: section.name,
        counts: {
          AVAILABLE: 0,
          HELD: 0,
          RESERVED: 0,
          SOLD: 0,
          BLOCKED: 0,
        },
      })
    }
    const entry = seatSectionMap.get(section.id)!
    entry.counts[seat.status] = (entry.counts[seat.status] ?? 0) + 1
  }

  const seatSectionInventory: SeatSectionInventory[] = Array.from(seatSectionMap.entries()).map(
    ([sectionId, data]) => ({
      sectionId,
      sectionName: data.sectionName,
      counts: data.counts,
    })
  )

  return {
    eventId,
    ticketTypes: ticketTypeInventory,
    timeSlots: timeSlotInventory,
    sessions: sessionInventory,
    seatSections: seatSectionInventory,
  }
}

// ─── Get full event detail for organizer preview (bypasses PUBLISHED filter) ──

export async function getEventPreview(
  eventId: string,
  organizerId: string
) {
  // First fetch to get the id (needed for the nested eventSeats where-clause)
  const stub = await db.event.findUnique({
    where: { id: eventId, organizerId },
    select: { id: true },
  })
  if (!stub) return null

  return db.event.findUnique({
    where: { id: stub.id },
    include: {
      organizer: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      venue: {
        select: { id: true, name: true, address: true, city: true, state: true, country: true },
      },
      category: {
        select: { id: true, name: true, slug: true, color: true },
      },
      ticketTypes: {
        where: { status: { not: 'INACTIVE' } },
        orderBy: { price: 'asc' },
      },
      speakers: {
        orderBy: { position: 'asc' },
        select: { id: true, name: true, role: true, avatarUrl: true, position: true },
      },
      images: {
        select: { id: true, url: true, position: true },
        orderBy: { position: 'asc' },
      },
      seatMap: {
        include: {
          sections: {
            orderBy: { name: 'asc' },
            include: {
              rows: {
                orderBy: [{ position: 'asc' }, { label: 'asc' }],
                include: {
                  seats: {
                    orderBy: [{ number: 'asc' }, { label: 'asc' }],
                    include: {
                      eventSeats: {
                        where: { eventId: stub.id },
                        select: { id: true, status: true, price: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { tickets: true, eventSeats: true },
      },
      scheduleItems: {
        select: {
          id: true,
          title: true,
          description: true,
          hostName: true,
          speakerId: true,
          startsAt: true,
          endsAt: true,
          position: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  })
}

// ─── Get event schedule items ─────────────────────────────────────────────────

export async function getEventScheduleItems(eventId: string) {
  return db.eventScheduleItem.findMany({
    where: { eventId },
    select: {
      id: true,
      title: true,
      description: true,
      hostName: true,
      speakerId: true,
      startsAt: true,
      endsAt: true,
      position: true,
    },
    orderBy: { position: 'asc' },
  })
}
