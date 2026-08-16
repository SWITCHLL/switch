import { z } from 'zod'

// ─── Create promo code ────────────────────────────────────────────────────────

export const createPromoCodeSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().optional(),
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(30, 'Code must be at most 30 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Only letters, numbers, hyphens and underscores allowed')
    .transform((v) => v.toUpperCase().trim()),
  discountType: z.enum(['PERCENTAGE', 'FLAT']),
  discountValue: z.coerce.number().int('Must be a whole number').positive('Must be greater than 0'),
  maxUses: z.coerce.number().int().positive().optional().or(z.literal('')),
  expiresAt: z.string().datetime().optional().or(z.literal('')),
})

// ─── Update promo code ────────────────────────────────────────────────────────

export const updatePromoCodeSchema = z.object({
  promoCodeId: z.string().min(1),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

// ─── Delete promo code ────────────────────────────────────────────────────────

export const deletePromoCodeSchema = z.object({
  promoCodeId: z.string().min(1),
})

// ─── Validate promo code (for checkout) ──────────────────────────────────────

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
  eventId: z.string().min(1),
  /** The ticket type IDs in the cart — used for scoped validation */
  ticketTypeIds: z.array(z.string().min(1)).min(1),
  /** Subtotal in minor units before discount */
  subtotal: z.number().int().positive(),
})

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>
export type DeletePromoCodeInput = z.infer<typeof deletePromoCodeSchema>
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>
