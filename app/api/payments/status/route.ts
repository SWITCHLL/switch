/**
 * GET /api/payments/status?reservation=<id>&type=ga
 *
 * Polling endpoint used by the checkout success page.
 * Returns the reservation status plus full ticket data once COMPLETED,
 * so the client component can render without a server re-render.
 *
 * Only the owner of the reservation can query it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const reservationId = req.nextUrl.searchParams.get('reservation')
  const isGA = req.nextUrl.searchParams.get('type') === 'ga'

  if (!reservationId) {
    return NextResponse.json({ error: 'reservation param required' }, { status: 400 })
  }

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId, userId: session.userId },
    select: {
      status: true,
      expiresAt: true,
      eventId: true,
      event: {
        select: {
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          endsAt: true,
          venue: { select: { name: true, city: true, state: true } },
        },
      },
      eventSeats: {
        select: {
          id: true,
          price: true,
          tickets: { select: { id: true, ticketNumber: true } },
          seat: { select: { label: true } },
          ticketType: { select: { name: true, currency: true } },
        },
      },
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Surface EXPIRED so the client stops polling
  const status =
    reservation.status === 'ACTIVE' && new Date(reservation.expiresAt) < new Date()
      ? 'EXPIRED'
      : reservation.status

  if (status !== 'COMPLETED') {
    return NextResponse.json({ status })
  }

  // ── Completed: build ticket data for the client ───────────────────────────

  const event = {
    title: reservation.event.title,
    slug: reservation.event.slug,
    imageUrl: reservation.event.imageUrl,
    startsAt: reservation.event.startsAt,
    endsAt: reservation.event.endsAt ?? null,
    venue: reservation.event.venue ?? null,
  }

  if (isGA) {
    const gaTickets = await db.ticket.findMany({
      where: { eventId: reservation.eventId, userId: session.userId },
      select: {
        id: true,
        ticketNumber: true,
        ticketType: { select: { id: true, name: true, price: true, currency: true } },
      },
      orderBy: { issuedAt: 'asc' },
    })

    // Group by ticket type
    const groupMap: Record<
      string,
      { ticketTypeId: string; name: string; price: number; currency: string; tickets: { id: string; ticketNumber: string }[] }
    > = {}
    for (const t of gaTickets) {
      const key = t.ticketType.id
      if (!groupMap[key]) {
        groupMap[key] = {
          ticketTypeId: key,
          name: t.ticketType.name,
          price: t.ticketType.price,
          currency: t.ticketType.currency,
          tickets: [],
        }
      }
      groupMap[key]!.tickets.push({ id: t.id, ticketNumber: t.ticketNumber })
    }

    const gaTicketGroups = Object.values(groupMap)
    const totalTicketCount = gaTickets.length
    const totalPaid = gaTickets.reduce((sum, t) => sum + t.ticketType.price, 0)
    const currency = gaTickets[0]?.ticketType.currency ?? 'NGN'

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

  // Reserved seating
  const reservedTickets = reservation.eventSeats.map((es) => ({
    id: es.tickets[0]?.id ?? es.id,
    ticketNumber: es.tickets[0]?.ticketNumber ?? '—',
    ticketTypeName: es.ticketType?.name ?? 'Ticket',
    seatLabel: es.seat?.label ?? null,
    price: es.price,
    currency: es.ticketType?.currency ?? 'NGN',
  }))

  const totalTicketCount = reservedTickets.length
  const totalPaid = reservedTickets.reduce((sum, t) => sum + t.price, 0)
  const currency = reservedTickets[0]?.currency ?? 'NGN'

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
