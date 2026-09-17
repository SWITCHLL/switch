import 'server-only'

import { db } from '@/lib/db'
import { redis, ticketUnlockKey } from '@/lib/redis'
import { TicketVisibility } from '@/app/generated/prisma/client'
import type { PublicTicketType } from './types'

// ─── getPublicTicketTypes ─────────────────────────────────────────────────────

/**
 * Returns the ticket types that should be shown on the public event page.
 *
 * Filtering rules:
 *  - PUBLIC: always included
 *  - PASSWORD_PROTECTED: included, but marked `locked: true` unless a valid
 *    session token was supplied for that ticket type
 *  - HIDDEN: excluded unless a matching `directLinkToken` is supplied
 *
 * @param eventId        The event whose ticket types to query
 * @param opts.sessionTokens  Map of ticketTypeId → sessionToken (from client sessionStorage)
 * @param opts.directLinkToken  The `?unlock=` query-param value from the URL (if any)
 */
export async function getPublicTicketTypes(
  eventId: string,
  opts: {
    /** ticketTypeId → sessionToken pairs from client sessionStorage */
    sessionTokens?: Record<string, string>
    /** directLinkToken from ?unlock= query param */
    directLinkToken?: string
  } = {}
): Promise<PublicTicketType[]> {
  const { sessionTokens = {}, directLinkToken } = opts

  const ticketTypes = await db.ticketType.findMany({
    where: { eventId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      quantity: true,
      sold: true,
      salesStart: true,
      salesEnd: true,
      status: true,
      visibility: true,
      directLinkToken: true,
      minPerOrder: true,
      maxPerOrder: true,
      maxPerUser: true,
    },
    orderBy: { price: 'asc' },
  })

  const results: PublicTicketType[] = []

  for (const tt of ticketTypes) {
    if (tt.visibility === TicketVisibility.HIDDEN) {
      // Only include if the provided directLinkToken matches
      if (!directLinkToken || tt.directLinkToken !== directLinkToken) {
        continue
      }
      // Token matches — include without a lock flag (direct link grants access)
      results.push(mapTicketType(tt))
      continue
    }

    if (tt.visibility === TicketVisibility.PASSWORD_PROTECTED) {
      // Check if the caller already holds a valid session token in Redis
      const sessionToken = sessionTokens[tt.id]
      let isUnlocked = false

      if (sessionToken) {
        const val = await redis.get(ticketUnlockKey(tt.id, sessionToken))
        isUnlocked = val === '1'
      }

      results.push({ ...mapTicketType(tt), locked: !isUnlocked })
      continue
    }

    // PUBLIC — always included
    results.push(mapTicketType(tt))
  }

  return results
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapTicketType(tt: {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  quantity: number | null
  sold: number
  salesStart: Date | null
  salesEnd: Date | null
  status: string
  visibility: string
  minPerOrder: number | null
  maxPerOrder: number | null
  maxPerUser: number | null
}): PublicTicketType {
  return {
    id: tt.id,
    name: tt.name,
    description: tt.description,
    price: tt.price,
    currency: tt.currency,
    quantity: tt.quantity,
    sold: tt.sold,
    salesStart: tt.salesStart,
    salesEnd: tt.salesEnd,
    status: tt.status,
    visibility: tt.visibility,
    minPerOrder: tt.minPerOrder,
    maxPerOrder: tt.maxPerOrder,
    maxPerUser: tt.maxPerUser,
  }
}

// ─── getConfirmedOrderDetails ─────────────────────────────────────────────────

export interface ConfirmedOrderDetails {
  event: {
    id: string
    title: string
    slug: string
    startsAt: Date
    endsAt: Date | null
    venueName: string | null
    venueAddress: string | null
    venueCity: string | null
  }
  tickets: Array<{
    id: string
    ticketNumber: string
    qrCode: string
    ticketTypeName: string
    seatLabel: string | null
  }>
  totalPaid: number
  currency: string
}

/**
 * Load confirmed order details for the checkout success page.
 * Verifies ownership before returning any ticket data.
 * Returns null if the reservation is not found, does not belong to the user,
 * or is not in COMPLETED status.
 */
export async function getConfirmedOrderDetails(
  reservationId: string,
  userId: string
): Promise<ConfirmedOrderDetails | null> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      userId: true,
      eventId: true,
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          endsAt: true,
          venueName: true,
          venueAddress: true,
          venueCity: true,
        },
      },
      eventSeats: {
        select: {
          tickets: {
            select: {
              id: true,
              ticketNumber: true,
              qrCode: true,
              ticketType: { select: { name: true } },
            },
          },
          seat: { select: { label: true } },
          price: true,
          ticketType: { select: { currency: true } },
        },
      },
    },
  })

  if (!reservation) return null
  if (reservation.userId !== userId) return null
  if (reservation.status !== 'COMPLETED') return null

  // Collect tickets from reserved seats
  const tickets: ConfirmedOrderDetails['tickets'] = []
  let totalPaid = 0
  let currency = 'NGN'

  for (const seat of reservation.eventSeats) {
    for (const ticket of seat.tickets) {
      tickets.push({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCode,
        ticketTypeName: ticket.ticketType.name,
        seatLabel: seat.seat?.label ?? null,
      })
    }
    totalPaid += seat.price
    currency = seat.ticketType?.currency ?? currency
  }

  // If no seat tickets (GA reservation), load tickets issued to the user for this event
  if (tickets.length === 0) {
    const gaTickets = await db.ticket.findMany({
      where: {
        eventId: reservation.eventId,
        userId,
        status: { in: ['ACTIVE', 'USED'] },
        eventSeatId: null,
      },
      select: {
        id: true,
        ticketNumber: true,
        qrCode: true,
        ticketType: { select: { name: true, price: true, currency: true } },
      },
      orderBy: { issuedAt: 'asc' },
    })

    for (const t of gaTickets) {
      tickets.push({
        id: t.id,
        ticketNumber: t.ticketNumber,
        qrCode: t.qrCode,
        ticketTypeName: t.ticketType.name,
        seatLabel: null,
      })
      totalPaid += t.ticketType.price
      currency = t.ticketType.currency
    }
  }

  return {
    event: reservation.event,
    tickets,
    totalPaid,
    currency,
  }
}
