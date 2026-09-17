/**
 * POST /api/payments/initialize-shows
 *
 * Initializes a Paystack transaction for a multi-show time-slot order.
 * One charge → one Order → one Payment → N tickets (one per slot×qty).
 *
 * Body: {
 *   eventId:   string
 *   selections: Array<{ timeSlotId: string; ticketTypeId: string; quantity: number }>
 *   promoCode?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { rateLimit } from '@/lib/rate-limit'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { ReservationStatus } from '@/app/generated/prisma/client'
import { reserveTimeSlots } from '@/features/time-slots/actions'

// ─── Validation ───────────────────────────────────────────────────────────────

const bodySchema = z.object({
  eventId: z.string().min(1),
  selections: z
    .array(
      z.object({
        timeSlotId:   z.string().min(1),
        ticketTypeId: z.string().min(1),
        quantity:     z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(20),
  promoCode: z.string().optional(),
})

function calcDiscount(
  discountType: 'PERCENTAGE' | 'FLAT',
  discountValue: number,
  subtotal: number
): number {
  if (discountType === 'PERCENTAGE') return Math.round(subtotal * (discountValue / 100))
  return Math.min(discountValue, subtotal)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rl = await rateLimit(`pay-init:user:${session.userId}`, { limit: 10, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

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
      id: true, slug: true, title: true, startsAt: true,
      status: true, salesStart: true, salesEnd: true,
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

  // 2. Validate each slot + ticket type + price via raw SQL (new table)
  interface CapRow {
    capacity: number
    price: number
    currency: string
    ttName: string
    slotLabel: string
    slotStatus: string
    ttStatus: string
    salesStart: Date | null
    salesEnd: Date | null
  }

  const resolvedSelections: Array<{
    timeSlotId:   string
    ticketTypeId: string
    quantity:     number
    price:        number
    currency:     string
    slotLabel:    string
    ttName:       string
  }> = []

  for (const sel of selections) {
    const rows: CapRow[] = await db.$queryRaw`
      SELECT
        tsc."capacity",
        tt."price",
        tt."currency",
        tt."name"       AS "ttName",
        tt."status"     AS "ttStatus",
        tt."salesStart",
        tt."salesEnd",
        ts."label"      AS "slotLabel",
        ts."status"     AS "slotStatus"
      FROM "time_slot_capacities" tsc
      JOIN "time_slots"   ts ON ts."id" = tsc."timeSlotId"
      JOIN "ticket_types" tt ON tt."id" = tsc."ticketTypeId"
      WHERE tsc."timeSlotId"   = ${sel.timeSlotId}
        AND tsc."ticketTypeId" = ${sel.ticketTypeId}
        AND ts."eventId"       = ${eventId}
      LIMIT 1
    `
    const row = rows[0]
    if (!row) {
      return NextResponse.json(
        { error: `Show/ticket combination not found` },
        { status: 400 }
      )
    }
    if (row.slotStatus !== 'ACTIVE') {
      return NextResponse.json({ error: `Show "${row.slotLabel}" is not available` }, { status: 400 })
    }
    if (row.ttStatus !== 'ACTIVE') {
      return NextResponse.json({ error: `Ticket type "${row.ttName}" is not available` }, { status: 400 })
    }
    const now = new Date()
    if (row.salesStart && now < row.salesStart) {
      return NextResponse.json({ error: `Tickets for "${row.ttName}" are not on sale yet` }, { status: 400 })
    }
    if (row.salesEnd && now > row.salesEnd) {
      return NextResponse.json({ error: `Ticket sales for "${row.ttName}" have ended` }, { status: 400 })
    }

    resolvedSelections.push({
      timeSlotId:   sel.timeSlotId,
      ticketTypeId: sel.ticketTypeId,
      quantity:     sel.quantity,
      price:        row.price,
      currency:     row.currency,
      slotLabel:    row.slotLabel,
      ttName:       row.ttName,
    })
  }

  // 3. Calculate subtotal
  const subtotal = resolvedSelections.reduce((s, e) => s + e.price * e.quantity, 0)

  // 4. Promo code validation
  let promoCodeId: string | undefined
  let discountAmount = 0
  let totalAmount = subtotal

  if (promoCodeInput && subtotal > 0) {
    const ticketTypeIds = resolvedSelections.map((s) => s.ticketTypeId)
    const promo = await db.promoCode.findFirst({
      where: { code: promoCodeInput, isActive: true, eventId },
      select: {
        id: true, discountType: true, discountValue: true,
        maxUses: true, usedCount: true, expiresAt: true, ticketTypeId: true,
      },
    })

    if (!promo) return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
    }
    if (promo.ticketTypeId && !ticketTypeIds.includes(promo.ticketTypeId)) {
      return NextResponse.json({ error: 'This code is not valid for the selected ticket types' }, { status: 400 })
    }

    discountAmount = calcDiscount(
      promo.discountType as 'PERCENTAGE' | 'FLAT',
      promo.discountValue,
      subtotal
    )
    totalAmount  = Math.max(0, subtotal - discountAmount)
    promoCodeId = promo.id
  }

  // 5. Reserve all slots atomically (all-or-nothing)
  const reserveResult = await reserveTimeSlots({
    eventId,
    selections: resolvedSelections.map((s) => ({
      timeSlotId:   s.timeSlotId,
      ticketTypeId: s.ticketTypeId,
      quantity:     s.quantity,
    })),
  })

  if (!reserveResult.success) {
    return NextResponse.json({ error: reserveResult.error }, { status: 409 })
  }

  const { reservationId } = reserveResult

  // 6. Free order — issue tickets immediately
  if (totalAmount === 0) {
    // The webhook handler will issue tickets; for free orders we trigger it manually
    // by calling the same logic as the webhook
    try {
      const { handleFreeShowOrder } = await import('./free-handler')
      await handleFreeShowOrder({
        reservationId,
        eventId,
        userId,
        resolvedSelections,
        promoCodeId,
      })
    } catch (err) {
      console.error('[initialize-shows] free order error:', err)
      return NextResponse.json({ error: 'Failed to issue free tickets. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ free: true, reservationId })
  }

  // 7. Fetch user email for Paystack
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const reference   = `SWT-${Date.now()}-${randomBytes(4).toString('hex')}`
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}/checkout/success?reservation=${reservationId}&type=shows`

  const result = await paystack.initializeTransaction({
    email:         user.email,
    amount:        totalAmount,
    reference,
    callback_url:  callbackUrl,
    metadata: {
      reservationId,
      userId,
      eventId,
      // Tell webhook this is a time-slot order
      slotSelections: resolvedSelections.map((s) => ({
        timeSlotId:   s.timeSlotId,
        ticketTypeId: s.ticketTypeId,
        quantity:     s.quantity,
        price:        s.price,
        currency:     s.currency,
      })),
      promoCodeId:    promoCodeId ?? null,
      discountAmount,
      custom_fields: [
        { display_name: 'Event', variable_name: 'event_title', value: event.title },
      ],
    },
  })

  return NextResponse.json({
    authorizationUrl: result.authorization_url,
    reference,
    reservationId,
    discountAmount,
    finalTotal: totalAmount,
  })
}
