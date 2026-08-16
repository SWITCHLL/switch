import { z } from 'zod'

// ─── Create group order ───────────────────────────────────────────────────────

const reservedSlotSchema = z.object({
  eventSeatId: z.string().min(1),
  label: z.string().max(60).optional(),
})

const gaSlotSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  label: z.string().max(60).optional(),
})

export const createGroupOrderSchema = z.object({
  eventId: z.string().min(1),
  /** RESERVED / MIXED events pass individual seat IDs */
  reservedSlots: z.array(reservedSlotSchema).optional(),
  /** GA events pass ticket-type + quantity bundles */
  gaSlots: z.array(gaSlotSchema).optional(),
  requireFullPayment: z.boolean().default(false),
  /** Group deadline in minutes from now (5–60) */
  ttlMinutes: z.number().int().min(5).max(60).default(15),
})

// ─── Claim a slot ─────────────────────────────────────────────────────────────

export const claimSlotSchema = z.object({
  slotId: z.string().min(1),
})

// ─── Confirm slot payment (webhook / post-payment) ────────────────────────────

export const confirmGroupSlotSchema = z.object({
  slotId: z.string().min(1),
  paystackReference: z.string().min(1),
})

// ─── Release a claimed slot ───────────────────────────────────────────────────

export const releaseSlotSchema = z.object({
  slotId: z.string().min(1),
})

// ─── Cancel entire group order ────────────────────────────────────────────────

export const cancelGroupOrderSchema = z.object({
  groupOrderId: z.string().min(1),
})

export type CreateGroupOrderInput = z.infer<typeof createGroupOrderSchema>
export type ClaimSlotInput = z.infer<typeof claimSlotSchema>
export type ConfirmGroupSlotInput = z.infer<typeof confirmGroupSlotSchema>
