'use client'

import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import type { EventDetail } from '@/features/events/types'
import { EventShare } from './event-share'

interface EventMetaProps {
  event: Pick<
    EventDetail,
    'title' | 'startsAt' | 'endsAt' | 'venue' | 'speakers' | '_count' | 'slug'
  >
}

export function EventMeta({ event }: EventMetaProps) {
  const { startsAt, endsAt, venue, speakers, _count } = event

  // Build date/time display
  const dateStr = format(new Date(startsAt), 'EEEE, MMMM d, yyyy')

  let timeStr: string
  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : null

  if (!end || (isSameDay(start, end) && start.getTime() === end.getTime())) {
    timeStr = format(start, 'h:mm a')
  } else if (isSameDay(start, end)) {
    timeStr = `${format(start, 'h:mm a')} — ${format(end, 'h:mm a')}`
  } else {
    timeStr = `${format(start, 'h:mm a')} — ${format(end, 'EEE, MMM d · h:mm a')}`
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
      <div className="mt-1">
        <EventShare title={event.title} slug={event.slug} />
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
      <span className="text-[14px] leading-snug text-white/90">{children}</span>
    </div>
  )
}
