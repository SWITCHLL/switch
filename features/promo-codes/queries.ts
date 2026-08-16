import 'server-only'
import { db } from '@/lib/db'
import type { PromoCodeRow } from './types'

// ─── Get all promo codes for an event ────────────────────────────────────────

export async function getPromoCodesForEvent(
  eventId: string,
  organizerId: string
): Promise<PromoCodeRow[]> {
  const rows = await db.promoCode.findMany({
    where: { eventId, organizerId },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      ticketType: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((r) => ({
    ...r,
    ticketTypeName: r.ticketType?.name ?? null,
  }))
}

// ─── Validate a promo code for checkout (read-only — does not increment) ──────

export async function lookupPromoCode(code: string, eventId: string, ticketTypeIds: string[]) {
  return db.promoCode.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      isActive: true,
      OR: [
        // Event-scoped or organizer-wide (eventId null handled at action level)
        { eventId },
      ],
    },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      ticketTypeId: true,
      organizerId: true,
      event: { select: { organizerId: true } },
    },
  })
}
