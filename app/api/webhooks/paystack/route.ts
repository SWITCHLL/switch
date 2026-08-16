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
import { calculateFee, resolveFeePercent } from '@/lib/fees'
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
  const reservationId = meta.reservationId as string | undefined
  const userId = meta.userId as string | undefined
  const promoCodeId = (meta.promoCodeId as string | undefined) || undefined
  const discountAmount = typeof meta.discountAmount === 'number' ? meta.discountAmount : 0

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

  await db.$transaction(async (tx) => {
    const feePercent = resolveFeePercent(reservation.event.organizer.feePercent)
    const { feeAmount: _fee, netAmount: _net } = calculateFee(amountPaid, feePercent)

    const createdTicketIds: string[] = []

    for (const eventSeat of reservation.eventSeats) {
      const ticketNumber = generateTicketNumber()
      const qrCode = generateQrCode()

      const ticket = await tx.ticket.create({
        data: {
          eventId: reservation.eventId,
          userId,
          eventSeatId: eventSeat.id,
          ticketTypeId: eventSeat.ticketTypeId!,
          ticketNumber,
          qrCode,
          status: TicketStatus.ACTIVE,
          issuedAt: new Date(),
        },
      })
      createdTicketIds.push(ticket.id)

      // Create Payment record per ticket
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
          // Promo code — spread the discount evenly across tickets
          promoCodeId: promoCodeId ?? null,
          discountAmount:
            discountAmount > 0 ? Math.round(discountAmount / reservation.eventSeats.length) : null,
        },
      })

      await tx.eventSeat.update({
        where: { id: eventSeat.id },
        data: { status: EventSeatStatus.SOLD },
      })

      if (eventSeat.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: eventSeat.ticketTypeId },
          data: { sold: { increment: 1 } },
        })
      }
    }

    // Increment promo code usage count atomically
    if (promoCodeId) {
      await tx.promoCode.update({
        where: { id: promoCodeId },
        data: { usedCount: { increment: 1 } },
      })
    }

    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.COMPLETED },
    })

    return createdTicketIds
  })

  // Send confirmation email (non-blocking)
  sendTicketConfirmationEmail({
    userId,
    eventTitle: reservation.event.title,
    eventDate: reservation.event.startsAt,
    ticketCount: reservation.eventSeats.length,
    reservationId,
  }).catch((err) => console.error('[webhook/paystack] email error:', err))
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
