/**
 * Prisma helpers for creating Order, Payment, and Ticket records.
 *
 * These use the standard Prisma client (type-safe, schema-validated).
 * All inserts happen inside the caller's transaction so they participate in
 * the same atomic unit as the surrounding checkout/webhook logic.
 */

import type { Prisma } from '@/app/generated/prisma/client'
import { PaymentStatus, TicketStatus } from '@/app/generated/prisma/client'

// ─── Transaction client type ─────────────────────────────────────────────────

export type Tx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Create Order ─────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  userId:          string
  eventId:         string
  reservationId?:  string | null
  totalAmount:     number
  currency:        string
  discountAmount:  number
  promoCodeId?:    string | null
}

export async function createOrder(tx: Tx, input: CreateOrderInput): Promise<{ id: string }> {
  const order = await tx.order.create({
    data: {
      userId:         input.userId,
      eventId:        input.eventId,
      reservationId:  input.reservationId ?? null,
      totalAmount:    input.totalAmount,
      currency:       input.currency,
      discountAmount: input.discountAmount,
      promoCodeId:    input.promoCodeId ?? null,
    },
    select: { id: true },
  })
  return order
}

// ─── Create Payment ───────────────────────────────────────────────────────────

export interface CreatePaymentInput {
  orderId:                 string
  organizerId:             string
  userId:                  string
  eventId:                 string
  amount:                  number
  currency:                string
  platformFeePercent:      number
  platformFeeAmount:       number
  netAmount:               number
  paystackReference:       string
  paystackTransactionId?:  string | null
}

export async function createPayment(tx: Tx, input: CreatePaymentInput): Promise<{ id: string }> {
  const payment = await tx.payment.create({
    data: {
      orderId:               input.orderId,
      organizerId:           input.organizerId,
      userId:                input.userId,
      eventId:               input.eventId,
      amount:                input.amount,
      currency:              input.currency,
      platformFeePercent:    input.platformFeePercent,
      platformFeeAmount:     input.platformFeeAmount,
      netAmount:             input.netAmount,
      status:                PaymentStatus.SUCCESS,
      paystackReference:     input.paystackReference,
      paystackTransactionId: input.paystackTransactionId ?? null,
    },
    select: { id: true },
  })
  return payment
}

// ─── Create Ticket ────────────────────────────────────────────────────────────

export interface CreateTicketInput {
  eventId:       string
  userId:        string
  orderId:       string
  ticketTypeId:  string
  ticketNumber:  string
  qrCode:        string
  eventSeatId?:  string | null
}

export async function createTicket(tx: Tx, input: CreateTicketInput): Promise<{ id: string }> {
  const ticket = await tx.ticket.create({
    data: {
      eventId:      input.eventId,
      userId:       input.userId,
      orderId:      input.orderId,
      ticketTypeId: input.ticketTypeId,
      ticketNumber: input.ticketNumber,
      qrCode:       input.qrCode,
      status:       TicketStatus.ACTIVE,
      isComplimentary: false,
      issuedAt:     new Date(),
      // eventSeatId is included atomically in the same INSERT — no split UPDATE
      ...(input.eventSeatId ? { eventSeatId: input.eventSeatId } : {}),
    },
    select: { id: true },
  })
  return ticket
}

// ─── Set orderId on an existing ticket ───────────────────────────────────────

export async function setTicketOrder(
  tx: Tx,
  ticketId: string,
  orderId:  string
): Promise<void> {
  await tx.ticket.update({
    where: { id: ticketId },
    data:  { orderId },
  })
}
