'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  startsAt: Date
}

interface AttendeeEventFilterProps {
  events: Event[]
  selectedEventId?: string
  searchQuery?: string
}

export function AttendeeEventFilter({
  events,
  selectedEventId,
  searchQuery,
}: AttendeeEventFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleEventChange = useCallback(
    (eventId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (eventId) {
        params.set('event', eventId)
      } else {
        params.delete('event')
      }
      startTransition(() => {
        router.push(`?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <select
        value={selectedEventId ?? ''}
        onChange={(e) => handleEventChange(e.target.value)}
        className={cn(
          'border-border bg-surface w-full rounded-xl border px-3.5 py-2.5',
          'text-foreground text-[13.5px] outline-none',
          'focus:border-brand-500 focus:ring-brand-500/20 transition-colors focus:ring-2',
          'cursor-pointer'
        )}
        aria-label="Filter attendees by event"
      >
        <option value="">All events</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title} — {format(event.startsAt, 'MMM d, yyyy')}
          </option>
        ))}
      </select>
    </div>
  )
}
