'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditEventDialog } from './edit-event-dialog'
import { AddEventDialog } from './add-event-dialog'
import type { CalendarEventItem, CalendarWithCount } from '../types'

interface CalendarViewEvent extends CalendarEventItem {
  calendarColor: string
  calendarTitle: string
  calendarId: string
}

interface CalendarViewProps {
  events: CalendarViewEvent[]
  calendars: CalendarWithCount[]
}

export function CalendarView({ events, calendars }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingEvent, setEditingEvent] = useState<CalendarViewEvent | null>(null)
  const [addingDate, setAddingDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Group events by day key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarViewEvent[]>()
    for (const ev of events) {
      const key = format(ev.startsAt, 'yyyy-MM-dd')
      const arr = map.get(key) ?? []
      arr.push(ev)
      map.set(key, arr)
    }
    return map
  }, [events])

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
            className="border-border hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="border-border hover:bg-muted rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
            className="border-border hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="border-border grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay.get(key) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)

          return (
            <div
              key={key}
              className={cn(
                'border-border group relative min-h-[88px] cursor-pointer border-b border-r p-1.5 transition-colors hover:bg-muted/30',
                !inMonth && 'opacity-40',
                // Remove right border from last column, bottom border from last row
                (i + 1) % 7 === 0 && 'border-r-0',
                i >= days.length - 7 && 'border-b-0'
              )}
              onClick={() => {
                if (calendars.length > 0) setAddingDate(day)
              }}
            >
              {/* Day number */}
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium',
                  today && 'bg-brand-600 text-white'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Events (max 3 visible) */}
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingEvent(ev)
                    }}
                    className="block w-full truncate rounded px-1 py-0.5 text-left text-[10.5px] font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: ev.calendarColor }}
                    title={ev.title}
                  >
                    {ev.allDay ? ev.title : `${format(ev.startsAt, 'h:mma')} ${ev.title}`}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-muted-foreground px-1 text-[10px]">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>

              {/* Add event hint */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (calendars.length > 0) setAddingDate(day)
                }}
                aria-label={`Add event on ${format(day, 'MMM d')}`}
                className="absolute top-1.5 right-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 transition-colors hover:bg-violet-500/40 group-hover:flex"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Edit event dialog */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Add event dialog (click on day) */}
      {addingDate && (
        <AddEventDialog
          calendars={calendars}
          defaultDate={addingDate}
          open
          onClose={() => setAddingDate(null)}
        />
      )}
    </div>
  )
}
