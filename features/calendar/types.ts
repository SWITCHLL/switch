import type { UserCalendar, CalendarEvent, CalendarShare, User } from '@/app/generated/prisma/client'

// ─── Calendar with event count ────────────────────────────────────────────────

export type CalendarWithCount = Pick<
  UserCalendar,
  'id' | 'title' | 'description' | 'color' | 'shareToken' | 'createdAt'
> & {
  _count: { events: number; shares: number }
}

// ─── Full calendar with events ────────────────────────────────────────────────

export type CalendarWithEvents = Pick<
  UserCalendar,
  'id' | 'title' | 'description' | 'color' | 'shareToken' | 'createdAt' | 'updatedAt'
> & {
  events: CalendarEventItem[]
  shares: CalendarShareItem[]
}

// ─── Calendar event ───────────────────────────────────────────────────────────

export type CalendarEventItem = Pick<
  CalendarEvent,
  | 'id'
  | 'calendarId'
  | 'title'
  | 'description'
  | 'location'
  | 'startsAt'
  | 'endsAt'
  | 'allDay'
  | 'linkedEventId'
  | 'createdAt'
>

// ─── Calendar share ───────────────────────────────────────────────────────────

export type CalendarShareItem = Pick<CalendarShare, 'id' | 'calendarId' | 'canCopy' | 'createdAt'> & {
  sharedWith: Pick<User, 'id' | 'email' | 'name'>
}

// ─── Shared-with-me calendar ──────────────────────────────────────────────────

export type SharedCalendar = Pick<CalendarShare, 'id' | 'canCopy' | 'createdAt'> & {
  calendar: Pick<UserCalendar, 'id' | 'title' | 'description' | 'color' | 'shareToken'> & {
    user: Pick<User, 'id' | 'email' | 'name'>
    events: CalendarEventItem[]
  }
}
