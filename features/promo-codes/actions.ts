'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  deletePromoCodeSchema,
  validatePromoCodeSchema,
} from './schemas'
import type {
  CreatePromoCodeResult,
  UpdatePromoCodeResult,
  DeletePromoCodeResult,
  ValidatePromoCodeResult,
  PromoValidation,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDiscount(
  discountType: 'PERCENTAGE' | 'FLAT',
  discountValue: number,
  subtotal: number
): number {
  if (discountType === 'PERCENTAGE') {
    // discountValue is 1-100
    return Math.round(subtotal * (discountValue / 100))
  }
  // FLAT: discountValue is in minor units (kobo)
  return Math.min(discountValue, subtotal)
}

// ─── Create promo code (organizer only) ───────────────────────────────────────

export async function createPromoCode(formData: FormData): Promise<CreatePromoCodeResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = createPromoCodeSchema.safeParse(raw)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { eventId, ticketTypeId, code, discountType, discountValue, maxUses, expiresAt } =
    parsed.data

  // Validate percentage range
  if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
    return { success: false, error: 'Percentage discount must be between 1 and 100' }
  }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify the event belongs to this organizer
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // If scoped to a ticket type, verify it belongs to the event
  if (ticketTypeId) {
    const tt = await db.ticketType.findUnique({
      where: { id: ticketTypeId, eventId },
      select: { id: true },
    })
    if (!tt) return { success: false, error: 'Ticket type not found on this event' }
  }

  // Check for code collision
  const existing = await db.promoCode.findUnique({ where: { code } })
  if (existing) return { success: false, error: `Code "${code}" is already in use` }

  const promo = await db.promoCode.create({
    data: {
      organizerId: organizer.id,
      eventId,
      ticketTypeId: ticketTypeId ?? null,
      code,
      discountType,
      discountValue,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    },
  })

  revalidatePath(`/dashboard/events/${eventId}/promo-codes`)
  return { success: true, promoCodeId: promo.id }
}

// ─── Toggle active state (organizer only) ─────────────────────────────────────

export async function updatePromoCode(formData: FormData): Promise<UpdatePromoCodeResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updatePromoCodeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { promoCodeId, isActive } = parsed.data

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const promo = await db.promoCode.findUnique({
    where: { id: promoCodeId, organizerId: organizer.id },
    select: { id: true, eventId: true },
  })
  if (!promo) return { success: false, error: 'Promo code not found' }

  await db.promoCode.update({
    where: { id: promoCodeId },
    data: { isActive },
  })

  if (promo.eventId) revalidatePath(`/dashboard/events/${promo.eventId}/promo-codes`)
  return { success: true }
}

// ─── Delete promo code (organizer only) ───────────────────────────────────────

export async function deletePromoCode(formData: FormData): Promise<DeletePromoCodeResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = deletePromoCodeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { promoCodeId } = parsed.data

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const promo = await db.promoCode.findUnique({
    where: { id: promoCodeId, organizerId: organizer.id },
    select: { id: true, eventId: true, usedCount: true },
  })
  if (!promo) return { success: false, error: 'Promo code not found' }
  if (promo.usedCount > 0) {
    return {
      success: false,
      error: 'Cannot delete a code that has been used. Deactivate it instead.',
    }
  }

  await db.promoCode.delete({ where: { id: promoCodeId } })

  if (promo.eventId) revalidatePath(`/dashboard/events/${promo.eventId}/promo-codes`)
  return { success: true }
}

// ─── Validate a promo code (called from checkout) ─────────────────────────────
// Read-only — does NOT increment usedCount. That happens atomically in the
// payment initialize route when the transaction is confirmed.

export async function validatePromoCode(input: unknown): Promise<ValidatePromoCodeResult> {
  const parsed = validatePromoCodeSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { code, eventId, ticketTypeIds, subtotal } = parsed.data

  const promo = await db.promoCode.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      isActive: true,
      eventId,
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
    },
  })

  if (!promo) return { success: false, error: 'Invalid or expired promo code' }

  // Expiry check
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { success: false, error: 'This promo code has expired' }
  }

  // Max uses check
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { success: false, error: 'This promo code has reached its usage limit' }
  }

  // Ticket type scope check — if the code is locked to a specific ticket type,
  // the cart must contain that ticket type
  if (promo.ticketTypeId && !ticketTypeIds.includes(promo.ticketTypeId)) {
    return { success: false, error: 'This code is not valid for the selected ticket types' }
  }

  const discountAmount = calcDiscount(
    promo.discountType as 'PERCENTAGE' | 'FLAT',
    promo.discountValue,
    subtotal
  )
  const finalTotal = Math.max(0, subtotal - discountAmount)

  const result: PromoValidation = {
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
    finalTotal,
  }

  return { success: true, data: result }
}
