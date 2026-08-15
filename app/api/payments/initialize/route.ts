/**
 * POST /api/payments/initialize
 *
 * Initializes a Paystack transaction for a reservation.
 * Returns the authorization_url to redirect the user to Paystack Checkout.
 *
 * Body: { reservationId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const reservationId = body?.reservationId as string | undefined

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
  }

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: {
        include: { ticketType: { select: { price: true, currency: true } } },
      },
      event: { select: { id: true, slug: true, title: true } },
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }
  if (reservation.userId !== session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (reservation.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Reservation is no longer active' }, { status: 400 })
  }
  if (new Date(reservation.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Reservation has expired' }, { status: 400 })
  }

  // Calculate total amount
  const totalAmount = reservation.eventSeats.reduce((sum, seat) => {
    return sum + (seat.ticketType?.price ?? 0)
  }, 0)

  // Free events — skip Paystack, confirm directly
  if (totalAmount === 0) {
    return NextResponse.json({ free: true, reservationId })
  }

  // Fetch user email
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const reference = `SWT-${Date.now()}-${randomBytes(4).toString('hex')}`
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${reservation.event.slug}/checkout/success?reservation=${reservationId}`

  const result = await paystack.initializeTransaction({
    email: user.email,
    amount: totalAmount,
    reference,
    callback_url: callbackUrl,
    metadata: {
      reservationId,
      userId: session.userId,
      eventId: reservation.event.id,
      custom_fields: [
        {
          display_name: 'Event',
          variable_name: 'event_title',
          value: reservation.event.title,
        },
      ],
    },
  })

  return NextResponse.json({
    authorizationUrl: result.authorization_url,
    reference,
  })
}
