/**
 * GET /api/payments/status?reservation=<id>&type=ga|shows
 *
 * Polling endpoint used by the checkout success page.
 * Returns the reservation status plus full ticket data once COMPLETED.
 * type=ga    → group by ticket type (GA order)
 * type=shows → group by slot + ticket type (time-slot order)
 * (no type)  → reserved seating order
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const reservationId = req.nextUrl.searchParams.get('reservation')
  const type          = req.nextUrl.searchParams.get('type') // 'ga' | 'shows' | null

  if (!reservationId) {
    return NextResponse.json({ error: 'reservation param required' }, { status: 400 })
  }

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: {
      userId:    true,
      status:    true,
      expiresAt: true,
      createdAt: true,
      eventId:   true,
      event: {
        select: {
          title:    true,
          slug:     true,
          imageUrl: true,
          startsAt: true,
          endsAt:   true,
          venue: { select: { name: true, city: true, state: true } },
        },
      },
      eventSeats: {
        select: {
          id:    true,
          price: true,
          tickets: { select: { id: true, ticketNumber: true } },
          seat:    { select: { label: true } },
          ticketType: { select: { name: true, currency: true } },
        },
      },
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.userId !== session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Surface EXPIRED so the client stops polling
  const status =
    reservation.status === 'ACTIVE' && new Date(reservation.expiresAt) < new Date()
      ? 'EXPIRED'
      : reservation.status

  if (status !== 'COMPLETED') {
    return NextResponse.json({ status })
  }

  const event = {
    title:    reservation.event.title,
    slug:     reservation.event.slug,
    imageUrl: reservation.event.imageUrl,
    startsAt: reservation.event.startsAt,
    endsAt:   reservation.event.endsAt ?? null,
    venue:    reservation.event.venue ?? null,
  }

  // ── Shows (time-slot) order ───────────────────────────────────────────────
  if (type === 'shows') {
    // Fetch tickets issued for this reservation via the order link
    interface ShowTicketRow {
      ticketId:      string
      ticketNumber:  string
      ticketTypeId:  string
      ticketTypeName: string
      price:         number
      currency:      string
      slotLabel:     string
    }

    const rows: ShowTicketRow[] = await db.$queryRaw`
      SELECT
        t."id"          AS "ticketId",
        t."ticketNumber",
        tt."id"         AS "ticketTypeId",
        tt."name"       AS "ticketTypeName",
        tt."price",
        tt."currency",
        ts."label"      AS "slotLabel"
      FROM "tickets" t
      JOIN "ticket_types" tt ON tt."id" = t."ticketTypeId"
      INNER JOIN "time_slot_tickets" tst ON tst."ticketId" = t."id"
      LEFT JOIN "time_slots" ts ON ts."id" = tst."timeSlotId"
      WHERE t."eventId"  = ${reservation.eventId}
        AND t."userId"   = ${session.userId}
        AND t."issuedAt" >= ${new Date(reservation.createdAt.getTime() - 60000)}
        AND t."status"   = 'ACTIVE'
      ORDER BY COALESCE(ts."startsAt", t."issuedAt"), tt."name"
    `

    // Group by slotLabel + ticketTypeName for display
    const groupMap: Record<
      string,
      { ticketTypeId: string; name: string; price: number; currency: string; tickets: { id: string; ticketNumber: string }[] }
    > = {}

    for (const row of rows) {
      const key = `${row.slotLabel ?? ''}::${row.ticketTypeId}`
      const displayName = row.slotLabel
        ? `${row.slotLabel} — ${row.ticketTypeName}`
        : row.ticketTypeName

      if (!groupMap[key]) {
        groupMap[key] = {
          ticketTypeId: row.ticketTypeId,
          name:         displayName,
          price:        row.price,
          currency:     row.currency,
          tickets:      [],
        }
      }
      groupMap[key]!.tickets.push({ id: row.ticketId, ticketNumber: row.ticketNumber })
    }

    const gaTicketGroups  = Object.values(groupMap)
    const totalTicketCount = rows.length
    const totalPaid        = rows.reduce((s, r) => s + r.price, 0)
    const currency         = rows[0]?.currency ?? 'NGN'

    return NextResponse.json({
      status: 'COMPLETED',
      event,
      gaTicketGroups,
      reservedTickets: [],
      totalTicketCount,
      totalPaid,
      currency,
    })
  }

  // ── GA order ──────────────────────────────────────────────────────────────
  if (type === 'ga') {
    const gaTickets = await db.ticket.findMany({
      where: {
        eventId:  reservation.eventId,
        userId:   session.userId,
        issuedAt: { gte: reservation.createdAt },
      },
      select: {
        id:          true,
        ticketNumber: true,
        ticketType:  { select: { id: true, name: true, price: true, currency: true } },
      },
      orderBy: { issuedAt: 'asc' },
    })

    const groupMap: Record<
      string,
      { ticketTypeId: string; name: string; price: number; currency: string; tickets: { id: string; ticketNumber: string }[] }
    > = {}
    for (const t of gaTickets) {
      const key = t.ticketType.id
      if (!groupMap[key]) {
        groupMap[key] = {
          ticketTypeId: key,
          name:         t.ticketType.name,
          price:        t.ticketType.price,
          currency:     t.ticketType.currency,
          tickets:      [],
        }
      }
      groupMap[key]!.tickets.push({ id: t.id, ticketNumber: t.ticketNumber })
    }

    const gaTicketGroups   = Object.values(groupMap)
    const totalTicketCount = gaTickets.length
    const totalPaid        = gaTickets.reduce((s, t) => s + t.ticketType.price, 0)
    const currency         = gaTickets[0]?.ticketType.currency ?? 'NGN'

    return NextResponse.json({
      status: 'COMPLETED',
      event,
      gaTicketGroups,
      reservedTickets: [],
      totalTicketCount,
      totalPaid,
      currency,
    })
  }

  // ── Reserved seating order ────────────────────────────────────────────────
  const reservedTickets = reservation.eventSeats.map((es) => ({
    id:             es.tickets[0]?.id ?? es.id,
    ticketNumber:   es.tickets[0]?.ticketNumber ?? '—',
    ticketTypeName: es.ticketType?.name ?? 'Ticket',
    seatLabel:      es.seat?.label ?? null,
    price:          es.price,
    currency:       es.ticketType?.currency ?? 'NGN',
  }))

  const totalTicketCount = reservedTickets.length
  const totalPaid        = reservedTickets.reduce((s, t) => s + t.price, 0)
  const currency         = reservedTickets[0]?.currency ?? 'NGN'

  return NextResponse.json({
    status: 'COMPLETED',
    event,
    reservedTickets,
    gaTicketGroups: [],
    totalTicketCount,
    totalPaid,
    currency,
  })
}
