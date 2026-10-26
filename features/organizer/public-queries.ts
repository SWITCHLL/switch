import 'server-only'
import { db } from '@/lib/db'
import { EventStatus } from '@/app/generated/prisma/client'

// ─── Shared event select for public organizer profile ─────────────────────────

const publicEventSelect = {
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

// ─── Get public organizer profile with their published events ─────────────────

export async function getOrganizerProfile(slug: string) {
  return db.organizer.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      websiteUrl: true,
      events: {
        where: {
          status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        },
        select: publicEventSelect,
        orderBy: { startsAt: 'desc' },
      },
    },
  })
}
