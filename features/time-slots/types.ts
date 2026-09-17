import type { TimeSlot, TicketTypeStatus } from '@/app/generated/prisma/client'

export type { TicketTypeStatus }

// ─── Per-ticket-type capacity snapshot for a slot ────────────────────────────

export interface SlotCapacity {
  ticketTypeId:  string
  ticketTypeName: string
  price:         number
  currency:      string
  capacity:      number
  booked:        number
  held:          number
  available:     number
}

// ─── A TimeSlot enriched with per-type availability ──────────────────────────

export type TimeSlotBase = Omit<TimeSlot, 'capacity' | 'price' | 'currency'>

export interface TimeSlotWithAvailability extends TimeSlotBase {
  capacities: SlotCapacity[]
  /** true when every ticket type in this slot is sold out */
  isSoldOut: boolean
}

// ─── Single-type availability snapshot ───────────────────────────────────────

export interface TimeSlotAvailability {
  capacity:  number
  booked:    number
  held:      number
  available: number
}
