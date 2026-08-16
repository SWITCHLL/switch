import 'server-only'
import { db } from '@/lib/db'
import type { GroupOrderDetail, GroupSlot } from './types'

// ─── Shared slot select ───────────────────────────────────────────────────────

const slotSelect = {
  id: true,
  price: true,
  currency: true,
  label: true,
  status: true,
  claimedBy: true,
  claimedAt: true,
  ticketId: true,
  claimer: { select: { name: true, image: true } },
  eventSeat: {
    select: {
      seat: {
        select: {
          label: true,
          row: { select: { label: true } },
          // section name comes through row → section
        },
      },
      ticketType: { select: { name: true } },
    },
  },
  ticketType: { select: { name: true } },
} as const

// ─── Get a group order by shareable code ─────────────────────────────────────

export async function getGroupOrderByCode(code: string): Promise<GroupOrderDetail | null> {
  const raw = await db.groupOrder.findUnique({
    where: { code },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          venue: { select: { name: true, city: true } },
        },
      },
      initiator: { select: { id: true, name: true, image: true } },
      slots: {
        select: slotSelect,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!raw) return null
  return toGroupOrderDetail(raw)
}

// ─── Get a group order by id (for actions that already have the id) ───────────

export async function getGroupOrderById(id: string): Promise<GroupOrderDetail | null> {
  const raw = await db.groupOrder.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          venue: { select: { name: true, city: true } },
        },
      },
      initiator: { select: { id: true, name: true, image: true } },
      slots: {
        select: slotSelect,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!raw) return null
  return toGroupOrderDetail(raw)
}

// ─── Get all group orders for a user (as initiator) ──────────────────────────

export async function getMyGroupOrders(userId: string) {
  return db.groupOrder.findMany({
    where: { initiatorId: userId },
    include: {
      event: {
        select: { title: true, slug: true, imageUrl: true, startsAt: true },
      },
      slots: { select: { status: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Shape raw DB result → GroupOrderDetail ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGroupOrderDetail(raw: any): GroupOrderDetail {
  const slots: GroupSlot[] = raw.slots.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any): GroupSlot => ({
      id: s.id,
      price: s.price,
      currency: s.currency,
      label: s.label,
      status: s.status,
      claimedBy: s.claimedBy,
      claimedAt: s.claimedAt,
      ticketId: s.ticketId,
      claimer: s.claimer ?? null,
      seat: s.eventSeat?.seat
        ? {
            label: s.eventSeat.seat.label,
            sectionName: '', // section join is through seatMap — not hydrated here for perf
            rowLabel: s.eventSeat.seat.row?.label ?? '',
          }
        : null,
      ticketTypeName: s.eventSeat?.ticketType?.name ?? s.ticketType?.name ?? null,
    })
  )

  const paidSlots = slots.filter((s) => s.status === 'PAID').length
  const openSlots = slots.filter((s) => s.status === 'OPEN' || s.status === 'HELD').length

  return {
    id: raw.id,
    code: raw.code,
    status: raw.status,
    requireFullPayment: raw.requireFullPayment,
    expiresAt: raw.expiresAt,
    createdAt: raw.createdAt,
    event: raw.event,
    initiator: raw.initiator,
    slots,
    totalSlots: slots.length,
    paidSlots,
    openSlots,
    totalAmount: slots.reduce((sum: number, s: GroupSlot) => sum + s.price, 0),
  }
}
