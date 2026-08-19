/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack webhook events, verifies the signature, and handles:
 *  - charge.success   → confirm the order, create tickets, create Payment record
 *  - transfer.success → mark PayoutRequest as COMPLETED
 *  - transfer.failed  → mark PayoutRequest as back to APPROVED (retry)
 *
 * Paystack retries webhooks for ~72 hours on non-200 responses, so we must
 * be idempotent — duplicate events must not create duplicate tickets/payments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { paystack } from '@/lib/paystack'
import { resolveFeePercent } from '@/lib/fees'
import { sendTicketConfirmationEmail } from '@/lib/email'
import {
  EventSeatStatus,
  PaymentStatus,
  PayoutStatus,
  ReservationStatus,
  TicketStatus,
} from '@/app/generated/prisma/client'
import { randomBytes } from 'crypto'

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

function generateQrCode(): string {
  return randomBytes(16).toString('hex')
}

export async function POST(req: NextRequest) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text()
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
    // Acknowledge all other events with 200
  } catch (err) {
    console.error('[webhook/paystack] handler error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── charge.success ───────────────────────────────────────────────────────────

interface GASelectionMeta {
  ticketTypeId: string
  quantity: number
  price: number
  currency: string
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference = data.reference as string
  const paystackTransactionId = String(data.id)

  // Idempotency: skip if already processed
  const existing = await db.payment.findFirst({
    where: { paystackReference: reference, status: PaymentStatus.SUCCESS },
  })
  if (existing) return

  // Metadata we embed when initializing the transaction
  const meta = (data.metadata ?? {}) as Record<string, unknown>

  // ── Group slot payment ───────────────────────────────────────────────────
  // Detected by presence of groupSlotId in metadata
  const groupSlotId = meta.groupSlotId as string | undefined
  if (groupSlotId) {
    const { confirmGroupSlotPayment } = await import('@/features/group-booking/actions')
    const result = await confirmGroupSlotPayment({ slotId: groupSlotId, paystackReference: reference })
    if (!result.success) {
      console.error('[webhook/paystack] confirmGroupSlotPayment failed:', result.error)
    }
    return
  }

  // ── Reservation-based payment (solo reserved + GA) ───────────────────────
  const reservationId = meta.reservationId as string | undefined
  const userId = meta.userId as string | undefined
  const promoCodeId = (meta.promoCodeId as string | undefined) || undefined
  const discountAmount = typeof meta.discountAmount === 'number' ? meta.discountAmount : 0
  const gaSelections = (meta.gaSelections as GASelectionMeta[] | undefined) ?? []

  if (!reservationId || !userId) {
    console.error('[webhook/paystack] Missing metadata on charge', { reference })
    return
  }

  // Load the reservation
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: {
        include: { ticketType: { select: { id: true, price: true, currency: true } } },
      },
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          startsAt: true,
          organizerId: true,
          organizer: { select: { id: true, feePercent: true } },
        },
      },
    },
  })

  if (!reservation) {
    console.error('[webhook/paystack] Reservation not found', reservationId)
    return
  }

  if (reservation.status === ReservationStatus.COMPLETED) return // already handled

  const amountPaid = data.amount as number // in kobo, from Paystack
  const isGAOrder = gaSelections.length > 0

  if (isGAOrder) {
    await handleGAChargeSuccess({
      reservation,
      gaSelections,
      userId,
      reference,
      paystackTransactionId,
      amountPaid,
      promoCodeId,
      discountAmount,
    })
  } else {
    await handleReservedChargeSuccess({
      reservation,
      userId,
      reference,
      paystackTransactionId,
      amountPaid,
      promoCodeId,
      discountAmount,
    })
  }

  // Send confirmation email (non-blocking)
  const totalTickets = isGAOrder
    ? gaSelections.reduce((sum, s) => sum + s.quantity, 0)
    : reservation.eventSeats.length

  // Load the created tickets for the email (QR codes needed)
  db.ticket.findMany({
    where: { eventId: reservation.eventId, userId },
    select: {
      ticketNumber: true,
      qrCode: true,
      ticketType: { select: { name: true } },
      eventSeat: { select: { seat: { select: { label: true } } } },
    },
    orderBy: { issuedAt: 'asc' },
  }).then((tickets) =>
    sendTicketConfirmationEmail({
      userId,
      eventTitle: reservation.event.title,
      eventDate: reservation.event.startsAt,
      eventSlug: reservation.event.slug,
      ticketCount: totalTickets,
      reservationId,
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        qrCode: t.qrCode,
        ticketTypeName: t.ticketType.name,
        seatLabel: t.eventSeat?.seat?.label ?? null,
      })),
    })
  ).catch((err) => console.error('[webhook/paystack] email error:', err))
}

// ─── GA charge handler ────────────────────────────────────────────────────────

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
    id: string
    eventId: string
    event: { id: string; organizer: { id: string; feePercent: number | null } }
  }
  gaSelections: GASelectionMeta[]
  userId: string
  reference: string
  paystackTransactionId: string
  amountPaid: number
  promoCodeId: string | undefined
  discountAmount: number
}) {
  const totalTickets = gaSelections.reduce((sum, s) => sum + s.quantity, 0)

  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)

    for (const sel of gaSelections) {
      for (let i = 0; i < sel.quantity; i++) {
        const ticketNumber = generateTicketNumber()
        const qrCode = generateQrCode()

        const ticket = await tx.ticket.create({
          data: {
            eventId: reservation.eventId,
            userId,
            // No eventSeatId for GA tickets
            ticketTypeId: sel.ticketTypeId,
            ticketNumber,
            qrCode,
            status: TicketStatus.ACTIVE,
            issuedAt: new Date(),
          },
        })

        // Per-ticket amounts: split discount evenly
        const perTicketDiscount =
          discountAmount > 0 ? Math.round(discountAmount / totalTickets) : 0
        const perTicketAmount = sel.price - perTicketDiscount
        const perTicketFee = Math.round(sel.price * (feePercent / 100))

        await tx.payment.create({
          data: {
            ticketId: ticket.id,
            organizerId: reservation.event.organizer.id,
            userId,
            eventId: reservation.eventId,
            amount: sel.price,
            currency: sel.currency,
            platformFeePercent: feePercent,
            platformFeeAmount: perTicketFee,
            netAmount: sel.price - perTicketFee,
            status: PaymentStatus.SUCCESS,
            paystackReference: reference,
            paystackTransactionId,
            promoCodeId: promoCodeId ?? null,
            discountAmount: perTicketDiscount > 0 ? perTicketDiscount : null,
          },
        })

        // Silence unused variable warning
        void perTicketAmount
      }

      // Increment sold count on the ticket type
      await tx.ticketType.update({
        where: { id: sel.ticketTypeId },
        data: { sold: { increment: sel.quantity } },
      })
    }

    // Increment promo code usage
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
}

// ─── Reserved seating charge handler ─────────────────────────────────────────

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
    id: string
    eventId: string
    event: { id: string; organizer: { id: string; feePercent: number | null } }
    eventSeats: Array<{
      id: true | string
      ticketTypeId: string | null
      ticketType: { id: string; price: number; currency: string } | null
    }>
  }
  userId: string
  reference: string
  paystackTransactionId: string
  amountPaid: number
  promoCodeId: string | undefined
  discountAmount: number
}) {
  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)

    for (const eventSeat of reservation.eventSeats) {
      const ticketNumber = generateTicketNumber()
      const qrCode = generateQrCode()

      const ticket = await tx.ticket.create({
        data: {
          eventId: reservation.eventId,
          userId,
          eventSeatId: eventSeat.id as string,
          ticketTypeId: eventSeat.ticketTypeId!,
          ticketNumber,
          qrCode,
          status: TicketStatus.ACTIVE,
          issuedAt: new Date(),
        },
      })

      await tx.payment.create({
        data: {
          ticketId: ticket.id,
          organizerId: reservation.event.organizer.id,
          userId,
          eventId: reservation.eventId,
          amount: eventSeat.ticketType?.price ?? amountPaid,
          currency: eventSeat.ticketType?.currency ?? 'NGN',
          platformFeePercent: feePercent,
          platformFeeAmount: Math.round(
            (eventSeat.ticketType?.price ?? amountPaid) * (feePercent / 100)
          ),
          netAmount:
            (eventSeat.ticketType?.price ?? amountPaid) -
            Math.round((eventSeat.ticketType?.price ?? amountPaid) * (feePercent / 100)),
          status: PaymentStatus.SUCCESS,
          paystackReference: reference,
          paystackTransactionId,
          promoCodeId: promoCodeId ?? null,
          discountAmount:
            discountAmount > 0 ? Math.round(discountAmount / reservation.eventSeats.length) : null,
        },
      })

      await tx.eventSeat.update({
        where: { id: eventSeat.id as string },
        data: { status: EventSeatStatus.SOLD },
      })

      if (eventSeat.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: eventSeat.ticketTypeId },
          data: { sold: { increment: 1 } },
        })
      }
    }

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
}

// ─── transfer.success ─────────────────────────────────────────────────────────

async function handleTransferSuccess(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string

  await db.payoutRequest.updateMany({
    where: { paystackTransferCode: transferCode },
    data: {
      status: PayoutStatus.COMPLETED,
      completedAt: new Date(),
    },
  })
}

// ─── transfer.failed ──────────────────────────────────────────────────────────

async function handleTransferFailed(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string

  // Revert to APPROVED so admin can retry
  await db.payoutRequest.updateMany({
    where: { paystackTransferCode: transferCode },
    data: { status: PayoutStatus.APPROVED },
  })
}
