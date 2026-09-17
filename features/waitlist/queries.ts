import 'server-only'
import { db } from '@/lib/db'
import type { WaitlistEntryWithDetails, PaginatedWaitlist } from './types'

// ─── Attendee queries ─────────────────────────────────────────────────────────

/**
 * Get a single waitlist entry for a user and ticket type.
 * Returns null if no active (PENDING or OFFERED) entry exists.
 */
export async function getWaitlistEntry(
  userId: string,
  ticketTypeId: string
): Promise<WaitlistEntryWithDetails | null> {
  const entry = await db.waitlistEntry.findUnique({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
    include: {
      event: {
        select: { id: true, title: true, slug: true, startsAt: true, imageUrl: true },
      },
      ticketType: {
        select: { id: true, name: true, price: true, currency: true },
      },
    },
  })

  return entry as WaitlistEntryWithDetails | null
}

/**
 * Get all waitlist entries for a user with event and ticket type details.
 * Returns entries in reverse chronological order (newest first).
 */
export async function getMyWaitlistEntries(userId: string): Promise<WaitlistEntryWithDetails[]> {
  const entries = await db.waitlistEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: { id: true, title: true, slug: true, startsAt: true, imageUrl: true },
      },
      ticketType: {
        select: { id: true, name: true, price: true, currency: true },
      },
    },
  })

  return entries as WaitlistEntryWithDetails[]
}

// ─── Organizer queries ────────────────────────────────────────────────────────

export interface GetEventWaitlistOpts {
  page?: number
  pageSize?: number
}

/**
 * Get paginated waitlist entries for an event (organizer view).
 * Optionally filter by ticketTypeId.
 */
export async function getEventWaitlist(
  eventId: string,
  ticketTypeId?: string,
  opts: GetEventWaitlistOpts = {}
): Promise<PaginatedWaitlist> {
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where = {
    eventId,
    ...(ticketTypeId ? { ticketTypeId } : {}),
  }

  const [entries, total] = await Promise.all([
    db.waitlistEntry.findMany({
      where,
      orderBy: [{ ticketTypeId: 'asc' }, { position: 'asc' }],
      skip,
      take: pageSize,
      include: {
        event: {
          select: { id: true, title: true, slug: true, startsAt: true, imageUrl: true },
        },
        ticketType: {
          select: { id: true, name: true, price: true, currency: true },
        },
      },
    }),
    db.waitlistEntry.count({ where }),
  ])

  return {
    entries: entries as WaitlistEntryWithDetails[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
