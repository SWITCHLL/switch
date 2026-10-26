import 'server-only'
import { unstable_cache } from 'next/dist/server/web/spec-extension/unstable-cache'
import { db } from '@/lib/db'
import type { EventFilters, EventListItem, EventsPage, EventDetail } from './types'
import { EventStatus } from '@/app/generated/prisma/client'

const PAGE_SIZE = 12

// ─── Shared select for list items ─────────────────────────────────────────────

const eventListSelect = {
  id: true,
  title: true,
  slug: true,
  imageUrl: true,
  startsAt: true,
  endsAt: true,
  status: true,
  seatingType: true,
  capacity: true,
  venueName: true,
  venueAddress: true,
  venueCity: true,
  venueState: true,
  organizer: {
    select: { name: true, slug: true },
  },
  venue: {
    select: { id: true, name: true, address: true, city: true, state: true },
  },
  category: {
    select: { name: true, slug: true, color: true },
  },
  ticketTypes: {
    where: { status: { not: 'INACTIVE' as const } },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      quantity: true,
      sold: true,
      status: true,
    },
    orderBy: { price: 'asc' as const },
  },
  _count: {
    select: { tickets: true },
  },
} as const

// ─── Get paginated events ─────────────────────────────────────────────────────

// Build a stable string key from filters — omit falsy values so
// {} and {page:1} produce the same cache key.
function filtersToKey(filters: EventFilters): string {
  const { category, city, search, dateFrom, dateTo, free, page = 1, limit = PAGE_SIZE } = filters
  return JSON.stringify({
    ...(category && { category }),
    ...(city     && { city }),
    ...(search   && { search }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo   && { dateTo }),
    ...(free     && { free }),
    page,
    limit,
  })
}

// Cache event listing queries for 60 seconds per unique filter combination.
// Tagged with 'events' so publish/unpublish/delete busts all entries at once.
const _getEventsCached = unstable_cache(
  async function __getEvents(filtersJson: string): Promise<EventsPage> {
    const filters: EventFilters = JSON.parse(filtersJson)
    const { category, city, search, dateFrom, dateTo, free, page = 1, limit = PAGE_SIZE } = filters

    const where = {
      status: EventStatus.PUBLISHED,
      ...(category && { category: { slug: category } }),
      ...(city && {
        venue: { city: { contains: city, mode: 'insensitive' as const } },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { venue: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(dateFrom || dateTo
        ? {
            startsAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo   && { lte: new Date(dateTo) }),
            },
          }
        : { startsAt: { gte: new Date() } }),
      ...(free === true && { ticketTypes: { some: { price: 0 } } }),
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        select: eventListSelect,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.event.count({ where }),
    ])

    return {
      events: events as EventListItem[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },
  ['events-list'],
  { revalidate: 60, tags: ['events'] }
)

export function getEvents(filters: EventFilters = {}): Promise<EventsPage> {
  return _getEventsCached(filtersToKey(filters))
}

// ─── Shared full include for a single event ───────────────────────────────────

function buildEventDetailInclude(eventId: string) {
  return {
    organizer: {
      select: { id: true, name: true, slug: true, logoUrl: true },
    },
    venue: {
      select: { id: true, name: true, address: true, city: true, state: true, country: true },
    },
    category: {
      select: { id: true, name: true, slug: true, color: true },
    },
    ticketTypes: {
      where: { status: { not: 'INACTIVE' as const } },
      orderBy: { price: 'asc' as const },
    },
    speakers: {
      orderBy: { position: 'asc' as const },
      select: { id: true, name: true, role: true, avatarUrl: true, position: true },
    },
    images: {
      select: { id: true, url: true, position: true },
      orderBy: { position: 'asc' as const },
    },
    seatMap: {
      include: {
        sections: {
          orderBy: { name: 'asc' as const },
          include: {
            rows: {
              orderBy: [{ position: 'asc' as const }, { label: 'asc' as const }],
              include: {
                seats: {
                  orderBy: [{ number: 'asc' as const }, { label: 'asc' as const }],
                  include: {
                    // Scope EventSeat records to this event only (seat maps are shared
                    // across events — without this filter you'd get seats from all events).
                    eventSeats: {
                      where: { eventId },
                      select: { id: true, status: true, price: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    scheduleItems: {
      select: {
        id: true,
        title: true,
        description: true,
        hostName: true,
        speakerId: true,
        startsAt: true,
        endsAt: true,
        position: true,
      },
      orderBy: { position: 'asc' as const },
    },
    timeSlots: {
      select: {
        id: true,
        label: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
      where: { status: { not: 'INACTIVE' as const } },
      orderBy: { startsAt: 'asc' as const },
    },
    _count: {
      select: { tickets: true, eventSeats: true },
    },
  }
}

// ─── Get single event by slug ─────────────────────────────────────────────────

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  // Resolve slug → id first. The id is required to scope the nested eventSeats
  // filter to this event only (seat maps are shared across events — without the
  // eventId filter every seat would return EventSeat rows from all events using
  // that seat map). This is one cheap @unique index lookup on a tiny select.
  const stub = await db.event.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!stub) return null

  const event = await db.event.findUnique({
    where: { id: stub.id },
    include: buildEventDetailInclude(stub.id),
  })

  return event as unknown as EventDetail
}

// ─── Get all categories ───────────────────────────────────────────────────────

// Categories change rarely — cache for 1 hour, bust via 'categories' tag.
export const getCategories = unstable_cache(
  async function _getCategories() {
    return db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        imageUrl: true,
        _count: {
          select: {
            events: {
              where: {
                status: EventStatus.PUBLISHED,
                startsAt: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  },
  ['categories'],
  { revalidate: 3600, tags: ['categories'] }
)

// ─── Get featured / upcoming events (used on homepage) ───────────────────────

// Cache for 2 minutes — homepage data is not real-time critical.
// Tagged so it can be invalidated when an event is published/updated.
const _getUpcomingEvents = unstable_cache(
  async function __getUpcomingEvents(limit: number): Promise<EventListItem[]> {
    const events = await db.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
      },
      select: eventListSelect,
      orderBy: { startsAt: 'asc' },
      take: limit,
    })
    return events as EventListItem[]
  },
  ['upcoming-events'],
  { revalidate: 120, tags: ['upcoming-events', 'events'] }
)

export function getUpcomingEvents(limit = 6): Promise<EventListItem[]> {
  return _getUpcomingEvents(limit)
}

// ─── Get events by category ───────────────────────────────────────────────────

// Cache per (categorySlug, limit) for 2 minutes — same lifetime as upcoming events.
const _getEventsByCategoryCached = unstable_cache(
  async function __getEventsByCategory(categorySlug: string, limit: number): Promise<EventListItem[]> {
    const events = await db.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
        category: { slug: categorySlug },
      },
      select: eventListSelect,
      orderBy: { startsAt: 'asc' },
      take: limit,
    })
    return events as EventListItem[]
  },
  ['events-by-category'],
  { revalidate: 120, tags: ['events'] }
)

export function getEventsByCategory(categorySlug: string, limit = 4): Promise<EventListItem[]> {
  return _getEventsByCategoryCached(categorySlug, limit)
}

// ─── Get related events (same category, excluding current) ───────────────────

// Cache per (eventId, categoryId, limit) for 2 minutes.
const _getRelatedEventsCached = unstable_cache(
  async function __getRelatedEvents(
    eventId: string,
    categoryId: string | null,
    limit: number
  ): Promise<EventListItem[]> {
    const events = await db.event.findMany({
      where: {
        id: { not: eventId },
        status: EventStatus.PUBLISHED,
        startsAt: { gte: new Date() },
        ...(categoryId ? { categoryId } : {}),
      },
      select: eventListSelect,
      orderBy: { startsAt: 'asc' },
      take: limit,
    })
    return events as EventListItem[]
  },
  ['related-events'],
  { revalidate: 120, tags: ['events'] }
)

export function getRelatedEvents(
  eventId: string,
  categoryId: string | null,
  limit = 6
): Promise<EventListItem[]> {
  return _getRelatedEventsCached(eventId, categoryId, limit)
}
