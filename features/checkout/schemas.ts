import { z } from 'zod'

export const reserveSeatsSchema = z.object({
  eventId: z.string().min(1),
  eventSeatIds: z.array(z.string().min(1)).min(1).max(10),
  /** Per-ticketTypeId unlock tokens for PASSWORD_PROTECTED types */
  sessionTokens: z.record(z.string()).optional(),
  /** directLinkToken for HIDDEN types (?unlock= query param) */
  directLinkToken: z.string().optional(),
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
  /** Per-ticketTypeId unlock tokens for PASSWORD_PROTECTED types */
  sessionTokens: z.record(z.string()).optional(),
  /** directLinkToken for HIDDEN types (?unlock= query param) */
  directLinkToken: z.string().optional(),
})

export const confirmOrderSchema = z.object({
  reservationId: z.string().min(1),
  // Future: paymentIntentId from payment provider
})

export const releaseReservationSchema = z.object({
  reservationId: z.string().min(1),
})

export const submitRsvpSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  /** Required when the ticket type is PASSWORD_PROTECTED — obtained from unlockPasswordProtectedTicket */
  sessionToken: z.string().optional(),
  /** Required when the ticket type is HIDDEN — the directLinkToken from the event URL */
  directLinkToken: z.string().optional(),
})

export const unlockPasswordProtectedTicketSchema = z.object({
  ticketTypeId: z.string().min(1),
  password: z.string().min(1),
})

export const validateDirectLinkTokenSchema = z.object({
  ticketTypeId: z.string().min(1),
  token: z.string().min(1),
})

export type ReserveSeatsInput = z.infer<typeof reserveSeatsSchema>
export type ReserveGAInput = z.infer<typeof reserveGASchema>
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>
export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>
export type UnlockPasswordProtectedTicketInput = z.infer<typeof unlockPasswordProtectedTicketSchema>
export type ValidateDirectLinkTokenInput = z.infer<typeof validateDirectLinkTokenSchema>
