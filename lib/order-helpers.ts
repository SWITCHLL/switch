/**
 * Raw SQL helpers for creating Order and Payment records.
 *
 * These bypass the Prisma generated client because the Order model and the
 * new Payment.orderId field were added to the schema but `prisma generate`
 * has not yet been run against the updated schema.
 *
 * Once `prisma generate` runs (after applying the migrations), these can be
 * replaced with standard Prisma client calls:
 *   tx.order.create(...)
 *   tx.payment.create({ data: { orderId: ... } })
 */

import type { Prisma } from '@/app/generated/prisma/client'
import { randomBytes } from 'crypto'

// ─── Transaction client type ─────────────────────────────────────────────────

export type Tx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── ID generation ────────────────────────────────────────────────────────────

function newId(): string {
  // cuid-compatible opaque id — safe for all Prisma @id fields
  return `c${randomBytes(16).toString('hex')}`
}

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
  const id  = newId()
  const now = new Date()

  await tx.$executeRaw`
    INSERT INTO "orders"
      ("id", "userId", "eventId", "reservationId", "totalAmount", "currency",
       "discountAmount", "promoCodeId", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${input.userId},
      ${input.eventId},
      ${input.reservationId ?? null},
      ${input.totalAmount},
      ${input.currency},
      ${input.discountAmount},
      ${input.promoCodeId ?? null},
      ${now},
      ${now}
    )
  `

  return { id }
}

// ─── Create Payment (orderId-based) ──────────────────────────────────────────

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
  const id  = newId()
  const now = new Date()

  await tx.$executeRaw`
    INSERT INTO "payments"
      ("id", "orderId", "organizerId", "userId", "eventId",
       "amount", "currency",
       "platformFeePercent", "platformFeeAmount", "netAmount",
       "status", "paystackReference", "paystackTransactionId",
       "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${input.orderId},
      ${input.organizerId},
      ${input.userId},
      ${input.eventId},
      ${input.amount},
      ${input.currency},
      ${input.platformFeePercent},
      ${input.platformFeeAmount},
      ${input.netAmount},
      'SUCCESS',
      ${input.paystackReference},
      ${input.paystackTransactionId ?? null},
      ${now},
      ${now}
    )
  `

  return { id }
}

// ─── Create Ticket with orderId ───────────────────────────────────────────────

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
  const id  = newId()
  const now = new Date()

  await tx.$executeRaw`
    INSERT INTO "tickets"
      ("id", "eventId", "userId", "orderId", "ticketTypeId",
       "ticketNumber", "qrCode", "status", "isComplimentary",
       "issuedAt", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ${input.eventId},
      ${input.userId},
      ${input.orderId},
      ${input.ticketTypeId},
      ${input.ticketNumber},
      ${input.qrCode},
      'ACTIVE',
      false,
      ${now},
      ${now},
      ${now}
    )
  `

  // eventSeatId is a unique nullable column — set it separately to avoid
  // a constraint violation on the "null" default inserted above
  if (input.eventSeatId) {
    await tx.$executeRaw`
      UPDATE "tickets"
      SET "eventSeatId" = ${input.eventSeatId}
      WHERE "id" = ${id}
    `
  }

  return { id }
}

// ─── Set orderId on an existing ticket ───────────────────────────────────────

export async function setTicketOrder(
  tx: Tx,
  ticketId: string,
  orderId:  string
): Promise<void> {
  await tx.$executeRaw`
    UPDATE "tickets"
    SET "orderId" = ${orderId}
    WHERE "id" = ${ticketId}
  `
}
