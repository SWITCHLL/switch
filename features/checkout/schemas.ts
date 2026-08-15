import { z } from 'zod'

export const reserveSeatsSchema = z.object({
  eventId: z.string().min(1),
  eventSeatIds: z.array(z.string().min(1)).min(1).max(10),
})

export const reserveGASchema = z.object({
  eventId: z.string().min(1),
  selections: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
})

export const confirmOrderSchema = z.object({
  reservationId: z.string().min(1),
  // Future: paymentIntentId from payment provider
})

export const releaseReservationSchema = z.object({
  reservationId: z.string().min(1),
})

export type ReserveSeatsInput = z.infer<typeof reserveSeatsSchema>
export type ReserveGAInput = z.infer<typeof reserveGASchema>
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>
