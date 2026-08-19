/**
 * POST /api/payments/initialize-ga
 *
 * Initializes a Paystack transaction for a General Admission ticket order.
 * Unlike the reserved-seat flow, GA does not pre-create EventSeat records —
 * instead the reservation stores the selections in metadata and the webhook
 * creates the tickets on charge.success.
 *
 * Body: {
 *   eventId: string
 *   selections: Array<{ ticketTypeId: string; quantity: number }>
 *   promoCode?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { sendTicketConfirmationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { ReservationStatus, TicketStatus } from '@/app/generated/prisma/client'

// ─── Validation ───────────────────────────────────────────────────────────────

const bodySchema = z.object({
  eventId: z.string().min(1),
  selections: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(10),
  promoCode: z.string().optional(),
})

// ─── Promo helpers (inline to avoid circular imports) ─────────────────────────

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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rawBody = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { eventId, selections, promoCode: promoCodeRaw } = parsed.data
  const promoCodeInput = promoCodeRaw?.toUpperCase().trim() || undefined
  const { userId } = session

  // 1. Validate event
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      slug: true,
      title: true,
      startsAt: true,
      status: true,
      salesStart: true,
      salesEnd: true,
      seatingType: true,
      organizer: { select: { id: true, feePercent: true } },
    },
  })

  if (!event || event.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 })
  }
  if (event.salesEnd && new Date(event.salesEnd) < new Date()) {
    return NextResponse.json({ error: 'Ticket sales have ended' }, { status: 400 })
  }
  if (event.salesStart && new Date(event.salesStart) > new Date()) {
    return NextResponse.json({ error: 'Ticket sales have not started yet' }, { status: 400 })
  }

  // 2. Validate + resolve ticket types
  const ticketTypeIds = selections.map((s) => s.ticketTypeId)
  const ticketTypes = await db.ticketType.findMany({
    where: { id: { in: ticketTypeIds }, eventId, status: { not: 'INACTIVE' } },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      quantity: true,
      sold: true,
      salesStart: true,
      salesEnd: true,
    },
  })

  const ttMap = Object.fromEntries(ticketTypes.map((tt) => [tt.id, tt]))

  for (const sel of selections) {
    const tt = ttMap[sel.ticketTypeId]
    if (!tt) {
      return NextResponse.json(
        { error: `Ticket type not found: ${sel.ticketTypeId}` },
        { status: 400 }
      )
    }
    if (tt.salesEnd && new Date(tt.salesEnd) < new Date()) {
      return NextResponse.json(
        { error: `Sales for "${tt.name}" have ended` },
        { status: 400 }
      )
    }
    if (tt.salesStart && new Date(tt.salesStart) > new Date()) {
      return NextResponse.json(
        { error: `Sales for "${tt.name}" have not started yet` },
        { status: 400 }
      )
    }
    if (tt.quantity !== null && tt.quantity - tt.sold < sel.quantity) {
      return NextResponse.json(
        { error: `Not enough tickets remaining for "${tt.name}"` },
        { status: 400 }
      )
    }
  }

  // 3. Calculate subtotal
  const subtotal = selections.reduce((sum, sel) => {
    return sum + (ttMap[sel.ticketTypeId]?.price ?? 0) * sel.quantity
  }, 0)

  // 4. Promo code validation
  let promoCodeId: string | undefined
  let discountAmount = 0
  let totalAmount = subtotal

  if (promoCodeInput && subtotal > 0) {
    const promo = await db.promoCode.findFirst({
      where: {
        code: promoCodeInput,
        isActive: true,
        eventId,
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

  // 5. Create a reservation to track this GA order
  // GA reservations have no eventSeats — the selections are stored in metadata
  // and passed to the webhook which creates tickets on charge.success
  const RESERVATION_TTL_MS = 10 * 60 * 1000 // 10 minutes
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

  const reservation = await db.reservation.create({
    data: {
      eventId,
      userId,
      status: ReservationStatus.ACTIVE,
      expiresAt,
    },
  })

  // Schedule background cleanup if user abandons after redirect
  const { scheduleReservationExpiry } = await import('@/lib/queues')
  scheduleReservationExpiry(reservation.id, expiresAt).catch(console.error)

  // 6. Free tickets — create tickets immediately and confirm reservation
  if (totalAmount === 0) {
    const totalTickets = selections.reduce((sum, s) => sum + s.quantity, 0)

    await db.$transaction(async (tx) => {
      for (const sel of selections) {
        for (let i = 0; i < sel.quantity; i++) {
          const year = new Date().getFullYear()
          const ticketNumber = `SWT-${year}-${randomBytes(3).toString('hex').toUpperCase()}`
          const qrCode = randomBytes(16).toString('hex')

          await tx.ticket.create({
            data: {
              eventId,
              userId,
              ticketTypeId: sel.ticketTypeId,
              ticketNumber,
              qrCode,
              status: TicketStatus.ACTIVE,
              issuedAt: new Date(),
            },
          })
        }

        await tx.ticketType.update({
          where: { id: sel.ticketTypeId },
          data: { sold: { increment: sel.quantity } },
        })
      }

      // Increment promo usage if applicable
      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        })
      }

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.COMPLETED },
      })
    })

    // Fire confirmation email non-blocking
    db.ticket.findMany({
      where: { eventId, userId },
      select: {
        ticketNumber: true,
        qrCode: true,
        ticketType: { select: { name: true } },
      },
      orderBy: { issuedAt: 'asc' },
    }).then((tickets) =>
      sendTicketConfirmationEmail({
        userId,
        eventTitle: event.title,
        eventDate: event.startsAt,
        eventSlug: event.slug,
        ticketCount: totalTickets,
        reservationId: reservation.id,
        tickets: tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          qrCode: t.qrCode,
          ticketTypeName: t.ticketType.name,
          seatLabel: null,
        })),
      })
    ).catch((err) => console.error('[initialize-ga] email error:', err))

    return NextResponse.json({
      free: true,
      reservationId: reservation.id,
    })
  }

  // 7. Fetch user email for Paystack
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const reference = `SWT-${Date.now()}-${randomBytes(4).toString('hex')}`
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}/checkout/success?reservation=${reservation.id}&type=ga`

  const result = await paystack.initializeTransaction({
    email: user.email,
    amount: totalAmount,
    reference,
    callback_url: callbackUrl,
    metadata: {
      reservationId: reservation.id,
      userId,
      eventId,
      // GA-specific: the ticket selections to fulfil on charge.success
      gaSelections: selections.map((sel) => ({
        ticketTypeId: sel.ticketTypeId,
        quantity: sel.quantity,
        price: ttMap[sel.ticketTypeId]?.price ?? 0,
        currency: ttMap[sel.ticketTypeId]?.currency ?? 'NGN',
      })),
      promoCodeId: promoCodeId ?? null,
      discountAmount,
      custom_fields: [
        {
          display_name: 'Event',
          variable_name: 'event_title',
          value: event.title,
        },
      ],
    },
  })

  return NextResponse.json({
    authorizationUrl: result.authorization_url,
    reference,
    reservationId: reservation.id,
    discountAmount,
    finalTotal: totalAmount,
  })
}
