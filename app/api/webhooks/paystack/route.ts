/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack webhook events, verifies the signature, and handles:
 *  - charge.success   → confirm the order, issue all tickets, create Order + Payment records
 *  - transfer.success → mark PayoutRequest as COMPLETED
 *  - transfer.failed  → mark PayoutRequest as back to APPROVED (retry)
 *
 * One Paystack charge → one Order → one Payment → many Tickets
 *
 * Idempotent — duplicate webhook events are safely ignored.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { paystack } from '@/lib/paystack'
import { resolveFeePercent } from '@/lib/fees'
import { sendTicketConfirmationEmail } from '@/lib/email'
import { createOrder, createPayment, createTicket } from '@/lib/order-helpers'
import {
  EventSeatStatus,
  PaymentStatus,
  PayoutStatus,
  ReservationStatus,
} from '@/app/generated/prisma/client'
import { randomBytes } from 'crypto'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex  = randomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

function generateQrCode(): string {
  return randomBytes(32).toString('hex')
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody   = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''

  if (!(await paystack.verifyWebhookSignature(rawBody, signature))) {
    console.warn('[webhook/paystack] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (event.event === 'charge.success') {
      await handleChargeSuccess(event.data)
    } else if (event.event === 'transfer.success') {
      await handleTransferSuccess(event.data)
    } else if (event.event === 'transfer.failed') {
      await handleTransferFailed(event.data)
    }
  } catch (err) {
    console.error('[webhook/paystack] handler error:', {
      error: err instanceof Error ? err.message : String(err),
      eventType: event.event,
      reference: event.data?.reference,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── Metadata shapes ──────────────────────────────────────────────────────────

interface TicketSelection {
  ticketTypeId: string
  quantity:     number
  price:        number
  currency:     string
}

interface SlotSelection {
  timeSlotId:   string
  ticketTypeId: string
  quantity:     number
  price:        number
  currency:     string
}

// ─── charge.success ───────────────────────────────────────────────────────────

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference            = data.reference as string
  const paystackTransactionId = String(data.id)
  const amountPaid           = data.amount as number

  const meta = (data.metadata ?? {}) as Record<string, unknown>

  // ── Idempotency ───────────────────────────────────────────────────────────
  const reservationId = meta.reservationId as string | undefined
  if (reservationId) {
    const existing = await db.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true },
    })
    if (existing?.status === ReservationStatus.COMPLETED) return
  } else {
    // Fallback: check by reference (non-reservation payments)
    const existing = await db.payment.findFirst({
      where: { paystackReference: reference, status: PaymentStatus.SUCCESS },
      select: { id: true },
    })
    if (existing) return
  }

  // ── Group-booking slot ────────────────────────────────────────────────────
  const groupSlotId = meta.groupSlotId as string | undefined
  if (groupSlotId) {
    const { confirmGroupSlotPayment } = await import('@/features/group-booking/actions')
    const result = await confirmGroupSlotPayment({ slotId: groupSlotId, paystackReference: reference })
    if (!result.success) {
      console.error('[webhook/paystack] confirmGroupSlotPayment failed:', result.error)
    }
    return
  }

  const userId         = meta.userId as string | undefined
  const promoCodeId    = (meta.promoCodeId as string | undefined) || undefined
  const discountAmount = typeof meta.discountAmount === 'number' ? meta.discountAmount : 0

  if (!reservationId || !userId) {
    console.error('[webhook/paystack] Missing metadata on charge', { reference })
    return
  }

  // Load reservation
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: {
        include: { ticketType: { select: { id: true, price: true, currency: true } } },
      },
      event: {
        select: {
          id: true, slug: true, title: true, startsAt: true, imageUrl: true,
          venue: { select: { name: true, city: true } },
          venueName: true, venueCity: true,
          organizer: { select: { id: true, feePercent: true } },
        },
      },
    },
  })

  if (!reservation || reservation.status === ReservationStatus.COMPLETED) return

  // Parse slotSelections - Paystack may have serialized it as a string
  let slotSelections = (meta.slotSelections as SlotSelection[] | undefined) ?? []
  if (typeof meta.slotSelections === 'string') {
    try {
      slotSelections = JSON.parse(meta.slotSelections) as SlotSelection[]
    } catch (e) {
      console.error('[webhook/paystack] Failed to parse slotSelections', {
        reference,
        slotSelectionsRaw: meta.slotSelections,
      })
    }
  }

  // Parse gaSelections - same treatment
  let gaSelections = (meta.gaSelections as TicketSelection[] | undefined) ?? []
  if (typeof meta.gaSelections === 'string') {
    try {
      gaSelections = JSON.parse(meta.gaSelections) as TicketSelection[]
    } catch (e) {
      console.error('[webhook/paystack] Failed to parse gaSelections', {
        reference,
        gaSelectionsRaw: meta.gaSelections,
      })
    }
  }

  const isTimeSlotOrder = slotSelections.length > 0
  const isGAOrder       = !isTimeSlotOrder && gaSelections.length > 0

  // Debug: log what type of order we're processing
  console.log('[webhook/paystack] order type detected', {
    reference,
    reservationId,
    isTimeSlotOrder,
    isGAOrder,
    slotSelectionsCount: slotSelections.length,
    gaSelectionsCount: gaSelections.length,
    hasReservation: !!reservation,
  })

  if (isTimeSlotOrder) {
    await handleTimeSlotChargeSuccess({
      reservation, slotSelections, userId, reference,
      paystackTransactionId, amountPaid, promoCodeId, discountAmount,
    })
  } else if (isGAOrder) {
    await handleGAChargeSuccess({
      reservation, gaSelections, userId, reference,
      paystackTransactionId, amountPaid, promoCodeId, discountAmount,
    })
  } else {
    await handleReservedChargeSuccess({
      reservation, userId, reference,
      paystackTransactionId, amountPaid, promoCodeId, discountAmount,
    })
  }

  // ── Confirmation email (awaited for reliable delivery) ──────────────────────
  try {
    // Scope to this transaction's order only — not all user tickets for the event
    const order = await db.order.findFirst({
      where: { reservationId, userId },
      select: { id: true },
    })

    const tickets = order
      ? await db.ticket.findMany({
          where: { orderId: order.id },
          select: {
            ticketNumber: true,
            qrCode:       true,
            ticketType:   { select: { name: true } },
            eventSeat:    { select: { seat: { select: { label: true } } } },
            timeSlotTickets: {
              select: {
                timeSlot: { select: { label: true, startsAt: true } },
              },
              take: 1,
            },
          },
          orderBy: { issuedAt: 'asc' },
        })
      : []

    if (tickets.length > 0) {
      await sendTicketConfirmationEmail({
        userId,
        eventTitle:    reservation.event.title,
        eventDate:     reservation.event.startsAt,
        eventSlug:     reservation.event.slug,
        eventImageUrl: reservation.event.imageUrl ?? undefined,
        eventVenue:    reservation.event.venue
          ? `${reservation.event.venue.name}, ${reservation.event.venue.city}`
          : reservation.event.venueName
          ? [reservation.event.venueName, reservation.event.venueCity].filter(Boolean).join(', ')
          : undefined,
        ticketCount:   tickets.length,
        reservationId,
        tickets: tickets.map((t) => {
          const slot = t.timeSlotTickets[0]?.timeSlot
          return {
            ticketNumber:   t.ticketNumber,
            qrCode:         t.qrCode,
            ticketTypeName: t.ticketType.name,
            seatLabel:      t.eventSeat?.seat?.label ?? null,
            showLabel:      slot?.label ?? null,
            showDate:       slot?.startsAt ?? null,
          }
        }),
      })
    }
  } catch (err) {
    console.error('[webhook/paystack] email error:', err)
    // Don't throw — order is already confirmed; email failure shouldn't fail the payment
  }
}

// ─── Time-slot order handler ──────────────────────────────────────────────────

async function handleTimeSlotChargeSuccess({
  reservation,
  slotSelections,
  userId,
  reference,
  paystackTransactionId,
  amountPaid,
  promoCodeId,
  discountAmount,
}: {
  reservation: {
    id: string; eventId: string
    event: { id: string; organizer: { id: string; feePercent: number | null } }
  }
  slotSelections:        SlotSelection[]
  userId:                string
  reference:             string
  paystackTransactionId: string
  amountPaid:            number
  promoCodeId:           string | undefined
  discountAmount:        number
}) {
  // Validate that we have slot selections — this is required for time-slot orders
  if (!slotSelections || slotSelections.length === 0) {
    console.error('[webhook/paystack] handleTimeSlotChargeSuccess missing slotSelections', {
      reference,
      reservationId: reservation.id,
    })
    throw new Error('INVALID_SLOT_SELECTIONS')
  }

  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)
    const feeAmount  = Math.round(amountPaid * (feePercent / 100))
    const netAmount  = amountPaid - feeAmount

    // 1. Order
    const order = await createOrder(tx, {
      userId,
      eventId:        reservation.eventId,
      reservationId:  reservation.id,
      totalAmount:    amountPaid,
      currency:       slotSelections[0]?.currency ?? 'NGN',
      discountAmount,
      promoCodeId:    promoCodeId ?? null,
    })

    // 2. Payment
    await createPayment(tx, {
      orderId:               order.id,
      organizerId:           reservation.event.organizer.id,
      userId,
      eventId:               reservation.eventId,
      amount:                amountPaid,
      currency:              slotSelections[0]?.currency ?? 'NGN',
      platformFeePercent:    feePercent,
      platformFeeAmount:     feeAmount,
      netAmount,
      paystackReference:     reference,
      paystackTransactionId,
    })

    // 3. Tickets + TimeSlotTicket links
    for (const sel of slotSelections) {
      for (let i = 0; i < sel.quantity; i++) {
        const ticket = await createTicket(tx, {
          eventId:      reservation.eventId,
          userId,
          orderId:      order.id,
          ticketTypeId: sel.ticketTypeId,
          ticketNumber: generateTicketNumber(),
          qrCode:       generateQrCode(),
        })

        const insertResult = await tx.$executeRaw`
          INSERT INTO "time_slot_tickets"
            ("id", "ticketId", "timeSlotId", "ticketTypeId", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${ticket.id},
            ${sel.timeSlotId},
            ${sel.ticketTypeId},
            NOW()
          )
          ON CONFLICT ("ticketId", "timeSlotId") DO NOTHING
        `
        if (insertResult === 0) {
          console.warn('[webhook/paystack] time_slot_tickets insert returned 0', {
            ticketId: ticket.id,
            timeSlotId: sel.timeSlotId,
          })
        }
      }

      await tx.ticketType.update({
        where: { id: sel.ticketTypeId },
        data:  { sold: { increment: sel.quantity } },
      })
    }

    // 4. Promo code
    if (promoCodeId) {
      const updated = await tx.$executeRaw`
        UPDATE "promo_codes"
        SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${promoCodeId}
          AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
      `
      if (updated === 0) throw new Error('PROMO_LIMIT_EXCEEDED')
    }

    // 5. Complete reservation
    await tx.reservation.update({
      where: { id: reservation.id },
      data:  { status: ReservationStatus.COMPLETED },
    })
  })
}

// ─── GA order handler ─────────────────────────────────────────────────────────

async function handleGAChargeSuccess({
  reservation,
  gaSelections,
  userId,
  reference,
  paystackTransactionId,
  amountPaid,
  promoCodeId,
  discountAmount,
}: {
  reservation: {
    id: string; eventId: string
    event: { id: string; organizer: { id: string; feePercent: number | null } }
  }
  gaSelections:          TicketSelection[]
  userId:                string
  reference:             string
  paystackTransactionId: string
  amountPaid:            number
  promoCodeId:           string | undefined
  discountAmount:        number
}) {
  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)
    const feeAmount  = Math.round(amountPaid * (feePercent / 100))
    const netAmount  = amountPaid - feeAmount

    const order = await createOrder(tx, {
      userId,
      eventId:        reservation.eventId,
      reservationId:  reservation.id,
      totalAmount:    amountPaid,
      currency:       gaSelections[0]?.currency ?? 'NGN',
      discountAmount,
      promoCodeId:    promoCodeId ?? null,
    })

    await createPayment(tx, {
      orderId:               order.id,
      organizerId:           reservation.event.organizer.id,
      userId,
      eventId:               reservation.eventId,
      amount:                amountPaid,
      currency:              gaSelections[0]?.currency ?? 'NGN',
      platformFeePercent:    feePercent,
      platformFeeAmount:     feeAmount,
      netAmount,
      paystackReference:     reference,
      paystackTransactionId,
    })

    for (const sel of gaSelections) {
      for (let i = 0; i < sel.quantity; i++) {
        await createTicket(tx, {
          eventId:      reservation.eventId,
          userId,
          orderId:      order.id,
          ticketTypeId: sel.ticketTypeId,
          ticketNumber: generateTicketNumber(),
          qrCode:       generateQrCode(),
        })
      }
      await tx.ticketType.update({
        where: { id: sel.ticketTypeId },
        data:  { sold: { increment: sel.quantity } },
      })
    }

    if (promoCodeId) {
      const updated = await tx.$executeRaw`
        UPDATE "promo_codes"
        SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${promoCodeId}
          AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
      `
      if (updated === 0) throw new Error('PROMO_LIMIT_EXCEEDED')
    }

    await tx.reservation.update({
      where: { id: reservation.id },
      data:  { status: ReservationStatus.COMPLETED },
    })
  })
}

// ─── Reserved seating order handler ──────────────────────────────────────────

async function handleReservedChargeSuccess({
  reservation,
  userId,
  reference,
  paystackTransactionId,
  amountPaid,
  promoCodeId,
  discountAmount,
}: {
  reservation: {
    id: string; eventId: string
    event: { id: string; organizer: { id: string; feePercent: number | null } }
    eventSeats: Array<{
      id: string | true
      ticketTypeId: string | null
      ticketType: { id: string; price: number; currency: string } | null
    }>
  }
  userId:                string
  reference:             string
  paystackTransactionId: string
  amountPaid:            number
  promoCodeId:           string | undefined
  discountAmount:        number
}) {
  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)
    const feeAmount  = Math.round(amountPaid * (feePercent / 100))
    const netAmount  = amountPaid - feeAmount
    const currency   = reservation.eventSeats[0]?.ticketType?.currency ?? 'NGN'

    const order = await createOrder(tx, {
      userId,
      eventId:        reservation.eventId,
      reservationId:  reservation.id,
      totalAmount:    amountPaid,
      currency,
      discountAmount,
      promoCodeId:    promoCodeId ?? null,
    })

    await createPayment(tx, {
      orderId:               order.id,
      organizerId:           reservation.event.organizer.id,
      userId,
      eventId:               reservation.eventId,
      amount:                amountPaid,
      currency,
      platformFeePercent:    feePercent,
      platformFeeAmount:     feeAmount,
      netAmount,
      paystackReference:     reference,
      paystackTransactionId,
    })

    for (const eventSeat of reservation.eventSeats) {
      if (!eventSeat.ticketType) {
        throw new Error(`MISSING_TICKET_TYPE:${eventSeat.id as string}`)
      }

      await createTicket(tx, {
        eventId:      reservation.eventId,
        userId,
        orderId:      order.id,
        ticketTypeId: eventSeat.ticketTypeId!,
        ticketNumber: generateTicketNumber(),
        qrCode:       generateQrCode(),
        eventSeatId:  eventSeat.id as string,
      })
    }

    // Batch-update all sold seats in one query
    await tx.eventSeat.updateMany({
      where: { id: { in: reservation.eventSeats.map((s) => s.id as string) } },
      data:  { status: EventSeatStatus.SOLD },
    })

    // Group sold-count increments by ticketTypeId then batch
    const soldByType = new Map<string, number>()
    for (const eventSeat of reservation.eventSeats) {
      if (eventSeat.ticketTypeId) {
        soldByType.set(eventSeat.ticketTypeId, (soldByType.get(eventSeat.ticketTypeId) ?? 0) + 1)
      }
    }
    await Promise.all(
      Array.from(soldByType).map(([id, count]) =>
        tx.ticketType.update({ where: { id }, data: { sold: { increment: count } } })
      )
    )

    if (promoCodeId) {
      const updated = await tx.$executeRaw`
        UPDATE "promo_codes"
        SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${promoCodeId}
          AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
      `
      if (updated === 0) throw new Error('PROMO_LIMIT_EXCEEDED')
    }

    await tx.reservation.update({
      where: { id: reservation.id },
      data:  { status: ReservationStatus.COMPLETED },
    })
  })
}

// ─── transfer.success ─────────────────────────────────────────────────────────

async function handleTransferSuccess(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  await db.payoutRequest.updateMany({
    where: { paystackTransferCode: transferCode },
    data:  { status: PayoutStatus.COMPLETED, completedAt: new Date() },
  })
}

// ─── transfer.failed ──────────────────────────────────────────────────────────

async function handleTransferFailed(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  await db.payoutRequest.updateMany({
    where: { paystackTransferCode: transferCode },
    data:  { status: PayoutStatus.APPROVED },
  })
}
