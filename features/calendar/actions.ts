'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CALENDAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
]

const createCalendarSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80).trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#7c3aed'),
})

const updateCalendarSchema = z.object({
  calendarId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(80).trim().optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
})

const calendarEventSchema = z.object({
  calendarId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  startsAt: z.string().datetime({ message: 'Invalid start date' }),
  endsAt: z.string().datetime({ message: 'Invalid end date' }).optional(),
  allDay: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  linkedEventId: z.string().optional(),
})

const updateCalendarEventSchema = calendarEventSchema.partial().extend({
  eventId: z.string().min(1),
})

const shareCalendarSchema = z.object({
  calendarId: z.string().min(1),
  email: z.string().email('Enter a valid email').toLowerCase().trim(),
  canCopy: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
})

// ─── Create calendar ──────────────────────────────────────────────────────────

export async function createCalendar(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = createCalendarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const calendar = await db.userCalendar.create({
    data: {
      userId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
    },
    select: { id: true },
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: calendar }
}

// ─── Update calendar ──────────────────────────────────────────────────────────

export async function updateCalendar(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updateCalendarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { calendarId, ...updates } = parsed.data

  const cal = await db.userCalendar.findUnique({
    where: { id: calendarId, userId: session.userId },
    select: { id: true },
  })
  if (!cal) return { success: false, error: 'Calendar not found' }

  await db.userCalendar.update({
    where: { id: calendarId },
    data: updates,
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Delete calendar ──────────────────────────────────────────────────────────

export async function deleteCalendar(calendarId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const cal = await db.userCalendar.findUnique({
    where: { id: calendarId, userId: session.userId },
    select: { id: true },
  })
  if (!cal) return { success: false, error: 'Calendar not found' }

  await db.userCalendar.delete({ where: { id: calendarId } })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Add event to calendar ────────────────────────────────────────────────────

export async function addCalendarEvent(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = calendarEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { calendarId, startsAt, endsAt, ...rest } = parsed.data

  const cal = await db.userCalendar.findUnique({
    where: { id: calendarId, userId: session.userId },
    select: { id: true },
  })
  if (!cal) return { success: false, error: 'Calendar not found' }

  const event = await db.calendarEvent.create({
    data: {
      calendarId,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      title: rest.title,
      description: rest.description ?? null,
      location: rest.location ?? null,
      allDay: rest.allDay,
      linkedEventId: rest.linkedEventId ?? null,
    },
    select: { id: true },
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: event }
}

// ─── Update calendar event ────────────────────────────────────────────────────

export async function updateCalendarEvent(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updateCalendarEventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { eventId, startsAt, endsAt, calendarId: _calId, ...rest } = parsed.data

  // Verify ownership via calendar → userId
  const existing = await db.calendarEvent.findFirst({
    where: { id: eventId, calendar: { userId: session.userId } },
    select: { id: true, calendarId: true },
  })
  if (!existing) return { success: false, error: 'Event not found' }

  await db.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...rest,
      description: rest.description ?? null,
      location: rest.location ?? null,
      linkedEventId: rest.linkedEventId ?? null,
      ...(startsAt && { startsAt: new Date(startsAt) }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
    },
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Delete calendar event ────────────────────────────────────────────────────

export async function deleteCalendarEvent(eventId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const existing = await db.calendarEvent.findFirst({
    where: { id: eventId, calendar: { userId: session.userId } },
    select: { id: true },
  })
  if (!existing) return { success: false, error: 'Event not found' }

  await db.calendarEvent.delete({ where: { id: eventId } })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Share calendar with another user ────────────────────────────────────────

export async function shareCalendar(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = shareCalendarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { calendarId, email, canCopy } = parsed.data

  if (email === session.email) {
    return { success: false, error: "You can't share a calendar with yourself" }
  }

  const cal = await db.userCalendar.findUnique({
    where: { id: calendarId, userId: session.userId },
    select: { id: true, title: true },
  })
  if (!cal) return { success: false, error: 'Calendar not found' }

  const targetUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!targetUser) {
    return { success: false, error: 'No user found with that email address' }
  }

  // Upsert — update canCopy if share already exists
  await db.calendarShare.upsert({
    where: { calendarId_sharedWithId: { calendarId, sharedWithId: targetUser.id } },
    create: { calendarId, sharedWithId: targetUser.id, canCopy },
    update: { canCopy },
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Remove a share ───────────────────────────────────────────────────────────

export async function removeCalendarShare(shareId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  // Owner can remove any share on their calendar; recipient can remove themselves
  const share = await db.calendarShare.findUnique({
    where: { id: shareId },
    select: { id: true, sharedWithId: true, calendar: { select: { userId: true } } },
  })
  if (!share) return { success: false, error: 'Share not found' }

  const isOwner = share.calendar.userId === session.userId
  const isRecipient = share.sharedWithId === session.userId

  if (!isOwner && !isRecipient) {
    return { success: false, error: 'Unauthorized' }
  }

  await db.calendarShare.delete({ where: { id: shareId } })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: undefined }
}

// ─── Copy events from a shared calendar into user's own calendar ──────────────

const copyEventsSchema = z.object({
  shareId: z.string().min(1),
  targetCalendarId: z.string().min(1),
  eventIds: z.string().min(1), // JSON array of event ids
})

export async function copySharedEvents(formData: FormData): Promise<ActionResult<{ count: number }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = copyEventsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { shareId, targetCalendarId, eventIds: rawIds } = parsed.data

  let ids: string[]
  try {
    ids = JSON.parse(rawIds) as string[]
  } catch {
    return { success: false, error: 'Invalid event IDs' }
  }

  // Verify recipient is actually shared with
  const share = await db.calendarShare.findUnique({
    where: { id: shareId, sharedWithId: session.userId },
    select: { canCopy: true, calendarId: true },
  })
  if (!share) return { success: false, error: 'Share not found' }
  if (!share.canCopy) return { success: false, error: 'Copying is not allowed for this calendar' }

  // Verify target calendar belongs to user
  const targetCal = await db.userCalendar.findUnique({
    where: { id: targetCalendarId, userId: session.userId },
    select: { id: true },
  })
  if (!targetCal) return { success: false, error: 'Target calendar not found' }

  // Fetch source events
  const sourceEvents = await db.calendarEvent.findMany({
    where: { id: { in: ids }, calendarId: share.calendarId },
    select: {
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      allDay: true,
      linkedEventId: true,
    },
  })
  if (!sourceEvents.length) return { success: false, error: 'No events found to copy' }

  await db.calendarEvent.createMany({
    data: sourceEvents.map((e) => ({
      ...e,
      calendarId: targetCalendarId,
    })),
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: { count: sourceEvents.length } }
}

// ─── Add a SWITCH platform event to a user calendar ──────────────────────────

const addSwitchEventSchema = z.object({
  calendarId: z.string().min(1),
  switchEventId: z.string().min(1),
})

export async function addSwitchEventToCalendar(
  calendarId: string,
  switchEventId: string
): Promise<ActionResult<{ id: string; alreadyExists: boolean }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  // Verify calendar belongs to this user
  const cal = await db.userCalendar.findUnique({
    where: { id: calendarId, userId: session.userId },
    select: { id: true },
  })
  if (!cal) return { success: false, error: 'Calendar not found' }

  // Fetch the SWITCH event
  const switchEvent = await db.event.findUnique({
    where: { id: switchEventId },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      venueName: true,
      venueAddress: true,
      venueCity: true,
      venueState: true,
      isVirtual: true,
      virtualLink: true,
    },
  })
  if (!switchEvent) return { success: false, error: 'Event not found' }

  // Check if already added to this calendar
  const existing = await db.calendarEvent.findFirst({
    where: { calendarId, linkedEventId: switchEventId },
    select: { id: true },
  })
  if (existing) {
    return { success: true, data: { id: existing.id, alreadyExists: true } }
  }

  const location = switchEvent.isVirtual
    ? (switchEvent.virtualLink ?? '')
    : [switchEvent.venueName, switchEvent.venueAddress, switchEvent.venueCity, switchEvent.venueState]
        .filter(Boolean)
        .join(', ')

  const event = await db.calendarEvent.create({
    data: {
      calendarId,
      title: switchEvent.title,
      description: switchEvent.description
        ? switchEvent.description.slice(0, 500)
        : null,
      location: location || null,
      startsAt: switchEvent.startsAt,
      endsAt: switchEvent.endsAt ?? null,
      allDay: false,
      linkedEventId: switchEventId,
    },
    select: { id: true },
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: { id: event.id, alreadyExists: false } }
}

// ─── Create a new calendar and immediately add a SWITCH event to it ───────────

const createCalendarWithEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#7c3aed'),
  switchEventId: z.string().min(1),
})

export async function createCalendarAndAddEvent(
  input: { title: string; color: string; switchEventId: string }
): Promise<ActionResult<{ calendarId: string; eventId: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = createCalendarWithEventSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, color, switchEventId } = parsed.data

  const switchEvent = await db.event.findUnique({
    where: { id: switchEventId },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      venueName: true,
      venueAddress: true,
      venueCity: true,
      venueState: true,
      isVirtual: true,
      virtualLink: true,
    },
  })
  if (!switchEvent) return { success: false, error: 'Event not found' }

  const location = switchEvent.isVirtual
    ? (switchEvent.virtualLink ?? '')
    : [switchEvent.venueName, switchEvent.venueAddress, switchEvent.venueCity, switchEvent.venueState]
        .filter(Boolean)
        .join(', ')

  const [calendar, calEvent] = await db.$transaction(async (tx) => {
    const cal = await tx.userCalendar.create({
      data: { userId: session.userId, title, color },
      select: { id: true },
    })
    const ev = await tx.calendarEvent.create({
      data: {
        calendarId: cal.id,
        title: switchEvent.title,
        description: switchEvent.description ? switchEvent.description.slice(0, 500) : null,
        location: location || null,
        startsAt: switchEvent.startsAt,
        endsAt: switchEvent.endsAt ?? null,
        allDay: false,
        linkedEventId: switchEventId,
      },
      select: { id: true },
    })
    return [cal, ev]
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: { calendarId: calendar.id, eventId: calEvent.id } }
}


export async function acceptShareByToken(shareToken: string): Promise<ActionResult<{ calendarId: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const cal = await db.userCalendar.findUnique({
    where: { shareToken },
    select: { id: true, userId: true, title: true },
  })
  if (!cal) return { success: false, error: 'Invalid or expired share link' }
  if (cal.userId === session.userId) {
    return { success: false, error: "This is your own calendar" }
  }

  // Create share if it doesn't already exist
  await db.calendarShare.upsert({
    where: { calendarId_sharedWithId: { calendarId: cal.id, sharedWithId: session.userId } },
    create: { calendarId: cal.id, sharedWithId: session.userId, canCopy: true },
    update: {}, // already shared — nothing to update
  })

  revalidatePath('/dashboard/calendar')
  return { success: true, data: { calendarId: cal.id } }
}
