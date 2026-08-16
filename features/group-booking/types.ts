import type { GroupOrderStatus, GroupSlotStatus } from '@/app/generated/prisma/client'

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface GroupSlot {
  id: string
  price: number
  currency: string
  label: string | null
  status: GroupSlotStatus
  claimedBy: string | null
  claimedAt: Date | null
  ticketId: string | null
  // Enriched for display
  claimer: { name: string | null; image: string | null } | null
  seat: { label: string; sectionName: string; rowLabel: string } | null
  ticketTypeName: string | null
}

export interface GroupOrderDetail {
  id: string
  code: string
  status: GroupOrderStatus
  requireFullPayment: boolean
  expiresAt: Date
  createdAt: Date
  event: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
    venue: { name: string; city: string } | null
  }
  initiator: { id: string; name: string | null; image: string | null }
  slots: GroupSlot[]
  // Computed
  totalSlots: number
  paidSlots: number
  openSlots: number
  totalAmount: number
}

// ─── Server action results ─────────────────────────────────────────────────────

export type CreateGroupOrderResult =
  { success: true; groupOrderId: string; code: string } | { success: false; error: string }

export type ClaimSlotResult =
  | { success: true; slotId: string; amount: number; currency: string }
  | { success: false; error: string }

export type ConfirmGroupSlotResult =
  { success: true; ticketId: string; groupComplete: boolean } | { success: false; error: string }

export type ReleaseSlotResult = { success: true } | { success: false; error: string }

export type CancelGroupOrderResult = { success: true } | { success: false; error: string }
