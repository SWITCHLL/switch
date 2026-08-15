export interface CheckoutSeat {
  eventSeatId: string
  seatId: string
  seatLabel: string
  sectionName: string
  rowLabel: string
  ticketTypeId: string
  ticketTypeName: string
  price: number
  currency: string
}

export interface CheckoutSession {
  eventId: string
  eventSlug: string
  eventTitle: string
  seats: CheckoutSeat[] // reserved seats (RESERVED seating)
  gaSelections: GASelection[] // GA ticket qty selections
  subtotal: number
  reservationId?: string // set after reservation is created
}

export interface GASelection {
  ticketTypeId: string
  ticketTypeName: string
  price: number
  currency: string
  quantity: number
}

// ─── Server action results ────────────────────────────────────────────────────

export type ReserveSeatsResult =
  | { success: true; reservationId: string; expiresAt: Date }
  | { success: false; error: string; conflictingSeatIds?: string[] }

export type ConfirmOrderResult =
  { success: true; ticketIds: string[] } | { success: false; error: string }

export type ReleaseReservationResult = { success: true } | { success: false; error: string }
