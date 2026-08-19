import 'server-only'
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
  organizer: {
    select: { name: true, slug: true },
  },
  venue: {
    select: { name: true, city: true, state: true },
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

export async function getEvents(filters: EventFilters = {}): Promise<EventsPage> {
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
            ...(dateTo && { lte: new Date(dateTo) }),
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
}

// ─── Get single event by slug ─────────────────────────────────────────────────

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      venue: {
        select: { id: true, name: true, city: true, state: true, country: true },
      },
      category: {
        select: { id: true, name: true, slug: true, color: true },
      },
      ticketTypes: {
        where: { status: { not: 'INACTIVE' } },
        orderBy: { price: 'asc' },
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
            orderBy: { name: 'asc' },
            include: {
              rows: {
                orderBy: [{ position: 'asc' }, { label: 'asc' }],
                include: {
                  seats: {
                    orderBy: [{ number: 'asc' }, { label: 'asc' }],
                    include: {
                      // Only fetch the EventSeat record that belongs to THIS event
                      eventSeats: {
                        where: { eventId: undefined }, // replaced below
                        select: {
                          id: true,
                          status: true,
                          price: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { tickets: true, eventSeats: true },
      },
    },
  })

  if (!event) return null

  // Re-fetch with correct eventId filter now that we have the event.id
  const eventWithSeats = await db.event.findUnique({
    where: { id: event.id },
    include: {
      organizer: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      venue: {
        select: { id: true, name: true, city: true, state: true, country: true },
      },
      category: {
        select: { id: true, name: true, slug: true, color: true },
      },
      ticketTypes: {
        where: { status: { not: 'INACTIVE' } },
        orderBy: { price: 'asc' },
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
            orderBy: { name: 'asc' },
            include: {
              rows: {
                orderBy: [{ position: 'asc' }, { label: 'asc' }],
                include: {
                  seats: {
                    orderBy: [{ number: 'asc' }, { label: 'asc' }],
                    include: {
                      eventSeats: {
                        where: { eventId: event.id },
                        select: {
                          id: true,
                          status: true,
                          price: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { tickets: true, eventSeats: true },
      },
    },
  })

  return eventWithSeats as unknown as EventDetail
}

// ─── Get all categories ───────────────────────────────────────────────────────

export async function getCategories() {
  return db.category.findMany({
    select: { id: true, name: true, slug: true, color: true, imageUrl: true },
    orderBy: { name: 'asc' },
  })
}

// ─── Get featured / upcoming events (used on homepage) ───────────────────────

export async function getUpcomingEvents(limit = 6): Promise<EventListItem[]> {
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
}

// ─── Get events by category ───────────────────────────────────────────────────

export async function getEventsByCategory(
  categorySlug: string,
  limit = 4
): Promise<EventListItem[]> {
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
}

// ─── Get related events (same category, excluding current) ───────────────────

export async function getRelatedEvents(
  eventId: string,
  categoryId: string | null,
  limit = 6
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
}
