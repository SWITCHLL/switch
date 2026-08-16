'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { EventStatus, SeatingType, TicketTypeStatus } from '@/app/generated/prisma/client'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
  // venueId is resolved server-side via upsertVenue; not accepted directly
  seatingType: z.nativeEnum(SeatingType),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  salesStart: z.string().datetime().optional(),
  salesEnd: z.string().datetime().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isFree: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  isVirtual: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  virtualLink: z.string().url().optional().or(z.literal('')),
})

const venueInputSchema = z.object({
  venue_name: z.string().min(1).max(200).optional(),
  venue_address: z.string().max(500).optional(),
  venue_city: z.string().max(100).optional(),
  venue_state: z.string().max(100).optional(),
  venue_country: z.string().max(100).optional(),
  venue_place_id: z.string().max(500).optional(),
})

const updateEventSchema = createEventSchema.partial().extend({
  eventId: z.string().min(1),
})

const createTicketTypeSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0),
  currency: z.string().default('NGN'),
  quantity: z.coerce.number().int().positive().optional(),
  salesStart: z.string().datetime().optional(),
  salesEnd: z.string().datetime().optional(),
})

const updateTicketTypeSchema = z.object({
  ticketTypeId: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number().int().min(0).optional(),
  currency: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional().nullable(),
  salesStart: z.string().datetime().optional().nullable(),
  salesEnd: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(TicketTypeStatus).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 0
  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`
  }
  return slug
}

/**
 * Find or create a Venue from a Google Places selection.
 * Uses place_id as the stable dedup key when available;
 * falls back to exact name+city match.
 */
async function resolveVenueId(
  input: z.infer<typeof venueInputSchema>
): Promise<string | undefined> {
  const { venue_name, venue_address, venue_city, venue_state, venue_country, venue_place_id } =
    input

  if (!venue_name) return undefined

  // Try to find existing venue by place_id first (most stable), then name+city
  if (venue_place_id) {
    const existing = await db.venue.findFirst({
      where: { address: { contains: venue_place_id } },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  if (venue_city) {
    const existing = await db.venue.findFirst({
      where: {
        name: { equals: venue_name, mode: 'insensitive' },
        city: { equals: venue_city, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Create a new venue row
  const venue = await db.venue.create({
    data: {
      name: venue_name,
      // Store full formatted address; append place_id for future dedup
      address: venue_place_id
        ? `${venue_address ?? ''}||place_id:${venue_place_id}`
        : (venue_address ?? undefined),
      city: venue_city ?? 'Unknown',
      state: venue_state ?? undefined,
      country: venue_country ?? 'Nigeria',
    },
    select: { id: true },
  })
  return venue.id
}

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createEvent(
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
    return { success: false, error: 'Only organizers can create events' }
  }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true, status: true },
  })
  if (!organizer || organizer.status !== 'ACTIVE') {
    return { success: false, error: 'Your organizer account is not active' }
  }

  const raw = Object.fromEntries(formData)
  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  // Resolve venue from Google Places fields
  const venueInput = venueInputSchema.parse(raw)
  const venueId = await resolveVenueId(venueInput)

  const { title, ...rest } = parsed.data
  const slug = await uniqueSlug(slugify(title))

  // Extract image URLs passed from the client (uploaded before form submission)
  // They arrive as repeated fields: imageUrls[0], imageUrls[1], …
  const imageUrls = formData.getAll('imageUrls').map(String).filter(Boolean)

  const event = await db.event.create({
    data: {
      organizerId: organizer.id,
      title,
      slug,
      status: EventStatus.DRAFT,
      ...rest,
      venueId,
      // Primary image = first uploaded URL (kept in sync with EventImage)
      imageUrl: imageUrls[0] ?? rest.imageUrl,
      startsAt: new Date(rest.startsAt),
      endsAt: rest.endsAt ? new Date(rest.endsAt) : undefined,
      salesStart: rest.salesStart ? new Date(rest.salesStart) : undefined,
      salesEnd: rest.salesEnd ? new Date(rest.salesEnd) : undefined,
    },
    select: { id: true, slug: true },
  })

  // Save all uploaded images to EventImage table
  if (imageUrls.length > 0) {
    await db.eventImage.createMany({
      data: imageUrls.map((url, position) => ({
        eventId: event.id,
        url,
        position,
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath('/dashboard/events')
  return { success: true, data: event }
}

// ─── Update event ─────────────────────────────────────────────────────────────

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = updateEventSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, ...updates } = parsed.data

  // Verify ownership
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  const event = organizer
    ? await db.event.findUnique({
        where: { id: eventId, organizerId: organizer.id },
        select: { id: true, venueId: true },
      })
    : null

  if (!event) return { success: false, error: 'Event not found' }

  // Resolve venue: only update if new venue fields were submitted
  const venueInput = venueInputSchema.parse(raw)
  const newVenueId = venueInput.venue_name ? await resolveVenueId(venueInput) : undefined
  // If no new venue was selected, keep the existing venueId (don't overwrite with undefined)
  const venueId = newVenueId ?? event.venueId ?? undefined

  await db.event.update({
    where: { id: eventId },
    data: {
      ...updates,
      venueId,
      startsAt: updates.startsAt ? new Date(updates.startsAt) : undefined,
      endsAt: updates.endsAt ? new Date(updates.endsAt) : undefined,
      salesStart: updates.salesStart ? new Date(updates.salesStart) : undefined,
      salesEnd: updates.salesEnd ? new Date(updates.salesEnd) : undefined,
    },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: undefined }
}

// ─── Publish / unpublish event ────────────────────────────────────────────────

export async function publishEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    include: { ticketTypes: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Basic publishing validation
  if (!event.startsAt) return { success: false, error: 'Event must have a start date' }
  if (!event.ticketTypes.length)
    return { success: false, error: 'Event must have at least one ticket type' }
  if (event.ticketTypes.some((tt) => tt.price < 0)) {
    return { success: false, error: 'All ticket types must have a valid price' }
  }

  await db.event.update({
    where: { id: eventId },
    data: { status: EventStatus.PUBLISHED },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/events/${event.slug}`)
  return { success: true, data: undefined }
}

export async function unpublishEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  await db.event.update({
    where: { id: eventId, organizerId: organizer.id },
    data: { status: EventStatus.DRAFT },
  })

  revalidatePath('/dashboard/events')
  return { success: true, data: undefined }
}

// ─── Add ticket type ──────────────────────────────────────────────────────────

export async function addTicketType(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)
  const parsed = createTicketTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  const tt = await db.ticketType.create({
    data: {
      ...parsed.data,
      salesStart: parsed.data.salesStart ? new Date(parsed.data.salesStart) : undefined,
      salesEnd: parsed.data.salesEnd ? new Date(parsed.data.salesEnd) : undefined,
    },
    select: { id: true },
  })

  revalidatePath(`/dashboard/events/${parsed.data.eventId}`)
  return { success: true, data: tt }
}

// ─── Delete ticket type ───────────────────────────────────────────────────────

export async function deleteTicketType(ticketTypeId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const tt = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { eventId: true, sold: true, event: { select: { organizerId: true } } },
  })

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!tt || !organizer || tt.event.organizerId !== organizer.id) {
    return { success: false, error: 'Not found' }
  }
  if (tt.sold > 0) {
    return { success: false, error: 'Cannot delete a ticket type with sold tickets' }
  }

  await db.ticketType.delete({ where: { id: ticketTypeId } })
  revalidatePath(`/dashboard/events/${tt.eventId}`)
  return { success: true, data: undefined }
}

// ─── Save event images (replace all images for an event) ─────────────────────

export async function saveEventImages(eventId: string, imageUrls: string[]): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  await db.$transaction(async (tx) => {
    // Replace all existing images
    await tx.eventImage.deleteMany({ where: { eventId } })

    if (imageUrls.length > 0) {
      await tx.eventImage.createMany({
        data: imageUrls.map((url, position) => ({ eventId, url, position })),
      })
    }

    // Keep Event.imageUrl in sync with the primary (position 0)
    await tx.event.update({
      where: { id: eventId },
      data: { imageUrl: imageUrls[0] ?? null },
    })
  })

  revalidatePath(`/dashboard/events/${eventId}`)
  return { success: true, data: undefined }
}

// ─── Cancel event ─────────────────────────────────────────────────────────────

export async function cancelEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, status: true, slug: true },
  })
  if (!event) return { success: false, error: 'Event not found' }
  if (event.status === EventStatus.CANCELLED) {
    return { success: false, error: 'Event is already cancelled' }
  }

  await db.event.update({
    where: { id: eventId },
    data: { status: EventStatus.CANCELLED },
  })

  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${eventId}`)
  revalidatePath(`/events/${event.slug}`)
  return { success: true, data: undefined }
}

// ─── Update ticket type ───────────────────────────────────────────────────────

export async function updateTicketType(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const raw = Object.fromEntries(formData)

  // Normalise nullable fields: empty string → null
  if (raw.quantity === '') raw.quantity = null as unknown as string
  if (raw.salesStart === '') raw.salesStart = null as unknown as string
  if (raw.salesEnd === '') raw.salesEnd = null as unknown as string

  const parsed = updateTicketTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { ticketTypeId, ...updates } = parsed.data

  const tt = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { eventId: true, event: { select: { organizerId: true } } },
  })
  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!tt || !organizer || tt.event.organizerId !== organizer.id) {
    return { success: false, error: 'Not found' }
  }

  await db.ticketType.update({
    where: { id: ticketTypeId },
    data: {
      ...updates,
      salesStart: updates.salesStart ? new Date(updates.salesStart) : updates.salesStart,
      salesEnd: updates.salesEnd ? new Date(updates.salesEnd) : updates.salesEnd,
    },
  })

  revalidatePath(`/dashboard/events/${tt.eventId}`)
  return { success: true, data: undefined }
}
