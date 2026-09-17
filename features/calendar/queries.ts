import 'server-only'
import { db } from '@/lib/db'
import type { CalendarWithCount, CalendarWithEvents, SharedCalendar } from './types'

// ─── Shared selects ───────────────────────────────────────────────────────────

const eventSelect = {
  id: true,
  calendarId: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  linkedEventId: true,
  createdAt: true,
} as const

// ─── Get all calendars for a user ─────────────────────────────────────────────

export async function getUserCalendars(userId: string): Promise<CalendarWithCount[]> {
  return db.userCalendar.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      color: true,
      shareToken: true,
      createdAt: true,
      _count: { select: { events: true, shares: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Get a single calendar with events + shares ───────────────────────────────

export async function getCalendarById(
  calendarId: string,
  userId: string
): Promise<CalendarWithEvents | null> {
  return db.userCalendar.findUnique({
    where: { id: calendarId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      color: true,
      shareToken: true,
      createdAt: true,
      updatedAt: true,
      events: {
        select: eventSelect,
        orderBy: { startsAt: 'asc' },
      },
      shares: {
        select: {
          id: true,
          calendarId: true,
          canCopy: true,
          createdAt: true,
          sharedWith: { select: { id: true, email: true, name: true } },
        },
      },
    },
  })
}

// ─── Get all events across all user calendars ─────────────────────────────────

export async function getAllUserCalendarEvents(userId: string) {
  return db.calendarEvent.findMany({
    where: { calendar: { userId } },
    select: {
      ...eventSelect,
      calendar: { select: { id: true, title: true, color: true } },
    },
    orderBy: { startsAt: 'asc' },
  })
}

// ─── Get all calendars shared with the user ───────────────────────────────────

export async function getSharedCalendars(userId: string): Promise<SharedCalendar[]> {
  return db.calendarShare.findMany({
    where: { sharedWithId: userId },
    select: {
      id: true,
      canCopy: true,
      createdAt: true,
      calendar: {
        select: {
          id: true,
          title: true,
          description: true,
          color: true,
          shareToken: true,
          user: { select: { id: true, email: true, name: true } },
          events: {
            select: eventSelect,
            orderBy: { startsAt: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Look up a calendar by share token (for accept-share flow) ────────────────

export async function getCalendarByShareToken(shareToken: string) {
  return db.userCalendar.findUnique({
    where: { shareToken },
    select: {
      id: true,
      title: true,
      description: true,
      color: true,
      shareToken: true,
      userId: true,
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { events: true } },
    },
  })
}

// ─── Get a single calendar event ──────────────────────────────────────────────

export async function getCalendarEvent(eventId: string, userId: string) {
  return db.calendarEvent.findFirst({
    where: {
      id: eventId,
      calendar: { userId },
    },
    select: eventSelect,
  })
}
