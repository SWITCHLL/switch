/**
 * Handles issuing tickets for a free time-slot order (no Paystack charge).
 * Mirrors the webhook's handleTimeSlotChargeSuccess logic for zero-amount orders.
 */

import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import { ReservationStatus } from '@/app/generated/prisma/client'
import { createOrder, createTicket } from '@/lib/order-helpers'

interface SlotSelection {
  timeSlotId:   string
  ticketTypeId: string
  quantity:     number
  price:        number
  currency:     string
}

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  return `SWT-${year}-${randomBytes(3).toString('hex').toUpperCase()}`
}

function generateQrCode(): string {
  return randomBytes(32).toString('hex')
}

export async function handleFreeShowOrder({
  reservationId,
  eventId,
  userId,
  resolvedSelections,
  promoCodeId,
}: {
  reservationId:      string
  eventId:            string
  userId:             string
  resolvedSelections: SlotSelection[]
  promoCodeId:        string | undefined
}) {
  await db.$transaction(async (tx) => {
    // 1. Create Order (totalAmount = 0)
    const order = await createOrder(tx, {
      userId,
      eventId,
      reservationId,
      totalAmount:    0,
      currency:       resolvedSelections[0]?.currency ?? 'NGN',
      discountAmount: 0,
      promoCodeId:    promoCodeId ?? null,
    })

    // 2. Issue tickets + link to time slots
    for (const sel of resolvedSelections) {
      for (let i = 0; i < sel.quantity; i++) {
        const ticket = await createTicket(tx, {
          eventId,
          userId,
          orderId:      order.id,
          ticketTypeId: sel.ticketTypeId,
          ticketNumber: generateTicketNumber(),
          qrCode:       generateQrCode(),
        })

        await tx.$executeRaw`
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
      }

      await tx.ticketType.update({
        where: { id: sel.ticketTypeId },
        data:  { sold: { increment: sel.quantity } },
      })
    }

    // 3. Promo usage
    if (promoCodeId) {
      await tx.$executeRaw`
        UPDATE "promo_codes"
        SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${promoCodeId}
          AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
      `
    }

    // 4. Complete reservation
    await tx.reservation.update({
      where: { id: reservationId },
      data:  { status: ReservationStatus.COMPLETED },
    })
  })
}
