import type { DiscountType } from '@/app/generated/prisma/client'

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface PromoCodeRow {
  id: string
  code: string
  discountType: DiscountType
  discountValue: number
  maxUses: number | null
  usedCount: number
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  /** Optional: name of scoped ticket type */
  ticketTypeName: string | null
}

// ─── Validation result returned to checkout ───────────────────────────────────

export interface PromoValidation {
  promoCodeId: string
  code: string
  discountType: DiscountType
  discountValue: number
  /** Calculated discount amount in minor units for the given subtotal */
  discountAmount: number
  /** Final total after discount (min 0) */
  finalTotal: number
}

// ─── Server action results ─────────────────────────────────────────────────────

export type CreatePromoCodeResult =
  { success: true; promoCodeId: string } | { success: false; error: string }

export type UpdatePromoCodeResult = { success: true } | { success: false; error: string }

export type DeletePromoCodeResult = { success: true } | { success: false; error: string }

export type ValidatePromoCodeResult =
  { success: true; data: PromoValidation } | { success: false; error: string }
