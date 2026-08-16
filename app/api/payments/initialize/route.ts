/**
 * POST /api/payments/initialize
 *
 * Initializes a Paystack transaction for a reservation.
 * Returns the authorization_url to redirect the user to Paystack Checkout.
 *
 * Body: { reservationId: string; promoCode?: string }
 *
 * When a promoCode is supplied the server validates it, calculates the
 * discounted amount, passes that to Paystack, and records the promo code id
 * in metadata so the webhook can track usage atomically on charge.success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { randomBytes } from 'crypto'

// ─── Promo code helpers (inline to avoid circular imports) ────────────────────

function calcDiscount(
  discountType: 'PERCENTAGE' | 'FLAT',
  discountValue: number,
  subtotal: number
): number {
  if (discountType === 'PERCENTAGE') {
    return Math.round(subtotal * (discountValue / 100))
  }
  return Math.min(discountValue, subtotal)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const reservationId = body?.reservationId as string | undefined
  const promoCodeRaw = (body?.promoCode as string | undefined)?.toUpperCase().trim() || undefined

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
  }

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: {
        include: { ticketType: { select: { id: true, price: true, currency: true } } },
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

  // Calculate base subtotal
  const subtotal = reservation.eventSeats.reduce((sum, seat) => {
    return sum + (seat.ticketType?.price ?? 0)
  }, 0)

  // ── Promo code validation ────────────────────────────────────────────────
  let promoCodeId: string | undefined
  let discountAmount = 0
  let totalAmount = subtotal

  if (promoCodeRaw && subtotal > 0) {
    // Collect ticket type ids in this reservation
    const ticketTypeIds = [
      ...new Set(
        reservation.eventSeats
          .map((es) => es.ticketType?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const promo = await db.promoCode.findFirst({
      where: {
        code: promoCodeRaw,
        isActive: true,
        eventId: reservation.eventId,
      },
      select: {
        id: true,
        discountType: true,
        discountValue: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        ticketTypeId: true,
      },
    })

    if (!promo) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 }
      )
    }
    if (promo.ticketTypeId && !ticketTypeIds.includes(promo.ticketTypeId)) {
      return NextResponse.json(
        { error: 'This code is not valid for the selected ticket types' },
        { status: 400 }
      )
    }

    discountAmount = calcDiscount(
      promo.discountType as 'PERCENTAGE' | 'FLAT',
      promo.discountValue,
      subtotal
    )
    totalAmount = Math.max(0, subtotal - discountAmount)
    promoCodeId = promo.id
  }

  // Free (original or post-discount) — skip Paystack, confirm directly
  if (totalAmount === 0) {
    return NextResponse.json({
      free: true,
      reservationId,
      promoCodeId: promoCodeId ?? null,
      discountAmount,
    })
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
      promoCodeId: promoCodeId ?? null,
      discountAmount,
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
    discountAmount,
    finalTotal: totalAmount,
  })
}
