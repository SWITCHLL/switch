'use client'

import { useState, useTransition } from 'react'
import { CalendarPlus } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { copySharedEvents } from '../actions'
import type { SharedCalendar, CalendarWithCount } from '../types'

interface CopyEventsDialogProps {
  share: SharedCalendar
  myCalendars: CalendarWithCount[]
}

export function CopyEventsDialog({ share, myCalendars }: CopyEventsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetCalendarId, setTargetCalendarId] = useState(myCalendars[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const events = share.calendar.events

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)))
    }
  }

  function handleCopy() {
    if (!selectedIds.size) {
      setError('Select at least one event')
      return
    }
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('shareId', share.id)
    formData.set('targetCalendarId', targetCalendarId)
    formData.set('eventIds', JSON.stringify(Array.from(selectedIds)))

    startTransition(async () => {
      const result = await copySharedEvents(formData)
      if (result.success) {
        setSuccess(`${result.data.count} event${result.data.count !== 1 ? 's' : ''} added to your calendar`)
        setSelectedIds(new Set())
      } else {
        setError(result.error)
      }
    })
  }

  if (!share.canCopy) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-[12.5px]">
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to my calendar
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add events from &quot;{share.calendar.title}&quot;</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Target calendar */}
          {myCalendars.length > 1 && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">Add to</label>
              <select
                value={targetCalendarId}
                onChange={(e) => setTargetCalendarId(e.target.value)}
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {myCalendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium">Select events</p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-brand-400 hover:text-brand-300 text-[12px] transition-colors"
              >
                {selectedIds.size === events.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {events.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-[13px]">
                This calendar has no events yet.
              </p>
            ) : (
              <ul className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ev.id)}
                      className={cn(
                        'border-border w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                        selectedIds.has(ev.id)
                          ? 'border-violet-500/40 bg-violet-500/10'
                          : 'hover:bg-muted/60'
                      )}
                    >
                      <p className="text-[13px] font-medium">{ev.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-[11.5px]">
                        {format(ev.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
          {success && <p className="text-[12px] text-emerald-400">{success}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !selectedIds.size}
              onClick={handleCopy}
            >
              {isPending ? 'Adding…' : `Add ${selectedIds.size ? `(${selectedIds.size})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
