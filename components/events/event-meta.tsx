'use client'

import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import type { EventDetail } from '@/features/events/types'
import { EventShare } from './event-share'
import { AddToCalendarButton } from '@/features/calendar/components/add-to-calendar-button'

interface CalendarProps {
  switchEventId: string
  calendars: { id: string; title: string; color: string }[]
}

interface EventMetaProps {
  event: Pick<
    EventDetail,
    'title' | 'startsAt' | 'endsAt' | 'venue' | 'speakers' | '_count' | 'slug' | 'timeSlots'
  >
  calendarProps?: CalendarProps
}

export function EventMeta({ event, calendarProps }: EventMetaProps) {
  const { startsAt, endsAt, venue, speakers, _count, timeSlots } = event

  // ── Date / time strings ───────────────────────────────────────────────────
  let dateStr: string
  let timeStr: string

  if (timeSlots && timeSlots.length > 1) {
    // Multi-date: show the span from first slot to last slot
    const first = new Date(timeSlots[0].startsAt)
    const last = new Date(timeSlots[timeSlots.length - 1].startsAt)
    dateStr = `${format(first, 'MMM d')} — ${format(last, 'MMM d, yyyy')} · ${timeSlots.length} dates`
    timeStr = `${timeSlots.length} shows — see dates below`
  } else if (timeSlots && timeSlots.length === 1) {
    const slotStart = new Date(timeSlots[0].startsAt)
    const slotEnd = new Date(timeSlots[0].endsAt)
    dateStr = format(slotStart, 'EEEE, MMMM d, yyyy')
    timeStr = `${format(slotStart, 'h:mm a')} — ${format(slotEnd, 'h:mm a')}`
  } else {
    // Single-date event
    dateStr = format(new Date(startsAt), 'EEEE, MMMM d, yyyy')

    const start = new Date(startsAt)
    const end = endsAt ? new Date(endsAt) : null

    if (!end || (isSameDay(start, end) && start.getTime() === end.getTime())) {
      timeStr = format(start, 'h:mm a')
    } else if (isSameDay(start, end)) {
      timeStr = `${format(start, 'h:mm a')} — ${format(end, 'h:mm a')}`
    } else {
      timeStr = `${format(start, 'h:mm a')} — ${format(end, 'EEE, MMM d · h:mm a')}`
    }
  }

  // Primary host from speakers (first speaker with role Host, or first speaker)
  const host =
    speakers?.find((s) => s.role?.toLowerCase() === 'host') ?? speakers?.[0] ?? null

  const locationStr = venue
    ? [venue.name, venue.city, venue.state].filter(Boolean).join(', ')
    : null

  return (
    <div className="flex flex-col gap-3 sm:gap-2.5">
      {/* Date */}
      <MetaRow icon={<Calendar className="h-4 w-4 shrink-0" aria-hidden />} label="Date">
        {dateStr}
      </MetaRow>

      {/* Time */}
      <MetaRow icon={<Clock className="h-4 w-4 shrink-0" aria-hidden />} label="Time">
        {timeStr}
      </MetaRow>

      {/* Location */}
      {locationStr && (
        <MetaRow icon={<MapPin className="h-4 w-4 shrink-0" aria-hidden />} label="Location">
          {locationStr}
        </MetaRow>
      )}

      {/* Host */}
      {host && (
        <MetaRow icon={<Users className="h-4 w-4 shrink-0" aria-hidden />} label="Host">
          {host.name}
          {host.role && host.role.toLowerCase() !== 'host' && (
            <span className="text-muted-foreground ml-1 text-[13px]">· {host.role}</span>
          )}
        </MetaRow>
      )}

      {/* Attendees */}
      {_count.tickets > 0 && (
        <MetaRow icon={<Users className="h-4 w-4 shrink-0" aria-hidden />} label="Attending">
          {_count.tickets.toLocaleString()} {_count.tickets === 1 ? 'person' : 'people'} going
        </MetaRow>
      )}

      {/* Share */}
      <div className="mt-1 flex items-center gap-2">
        <EventShare title={event.title} slug={event.slug} />
        {calendarProps && (
          <AddToCalendarButton
            switchEventId={calendarProps.switchEventId}
            calendars={calendarProps.calendars}
          />
        )}
      </div>
    </div>
  )
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <span className="sr-only">{label}:</span>
      <span className="text-[14px] leading-snug text-foreground">{children}</span>
    </div>
  )
}
