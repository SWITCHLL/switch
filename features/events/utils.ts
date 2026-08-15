import type { EventListItem } from './types'

/**
 * Returns the lowest available ticket price for an event.
 * Returns null if no active ticket types exist.
 */
export function getMinPrice(event: Pick<EventListItem, 'ticketTypes'>): number | null {
  const active = event.ticketTypes.filter(
    (t) => t.status !== 'SOLD_OUT' && (t.quantity === null || t.sold < t.quantity)
  )
  if (!active.length) return null
  return Math.min(...active.map((t) => t.price))
}

/** True if all ticket types are sold out */
export function isSoldOut(event: Pick<EventListItem, 'ticketTypes'>): boolean {
  if (!event.ticketTypes.length) return false
  return event.ticketTypes.every(
    (t) => t.status === 'SOLD_OUT' || (t.quantity !== null && t.sold >= t.quantity)
  )
}

/** True if the event has a free ticket type */
export function hasFreeTickets(event: Pick<EventListItem, 'ticketTypes'>): boolean {
  return event.ticketTypes.some((t) => t.price === 0 && t.status !== 'SOLD_OUT')
}

/**
 * Format price from minor units (kobo) to display string.
 * e.g. 5000 kobo → "₦50.00"   or  50000 kobo → "₦500"
 */
export function formatPrice(amountKobo: number, currency = 'NGN'): string {
  if (amountKobo === 0) return 'Free'
  const amount = amountKobo / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}
