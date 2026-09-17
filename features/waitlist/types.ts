import type { WaitlistEntry, WaitlistStatus, Event, TicketType } from '@/app/generated/prisma/client'

/**
 * A WaitlistEntry enriched with its related Event and TicketType details.
 * Returned by getMyWaitlistEntries and getWaitlistEntry queries.
 */
export type WaitlistEntryWithDetails = WaitlistEntry & {
  event: Pick<Event, 'id' | 'title' | 'slug' | 'startsAt' | 'imageUrl'>
  ticketType: Pick<TicketType, 'id' | 'name' | 'price' | 'currency'>
}

export type { WaitlistStatus }

/**
 * Paginated result shape for organizer waitlist view.
 */
export interface PaginatedWaitlist {
  entries: WaitlistEntryWithDetails[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
