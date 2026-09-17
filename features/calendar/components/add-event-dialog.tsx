'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { addCalendarEvent } from '../actions'
import type { CalendarWithCount } from '../types'

interface AddEventDialogProps {
  calendars: CalendarWithCount[]
  defaultCalendarId?: string
  defaultDate?: Date
  trigger?: React.ReactNode
  /** Controlled open state (omit to use internal state) */
  open?: boolean
  onClose?: () => void
}

export function AddEventDialog({
  calendars,
  defaultCalendarId,
  defaultDate,
  trigger,
  open: controlledOpen,
  onClose,
}: AddEventDialogProps) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen

  const [startsAt, setStartsAt] = useState(
    defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [endsAt, setEndsAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(v: boolean) {
    if (!v) {
      if (isControlled) onClose?.()
      else setInternalOpen(false)
    } else {
      if (!isControlled) setInternalOpen(true)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!startsAt) {
      setError('Start date is required')
      return
    }

    const formData = new FormData(e.currentTarget)
    // Convert datetime-local values ("YYYY-MM-DDTHH:mm") to full ISO strings
    formData.set('startsAt', new Date(startsAt).toISOString())
    if (endsAt) {
      formData.set('endsAt', new Date(endsAt).toISOString())
    } else {
      formData.delete('endsAt')
    }

    startTransition(async () => {
      const result = await addCalendarEvent(formData)
      if (result.success) {
        handleOpenChange(false)
        setStartsAt('')
        setEndsAt('')
      } else {
        setError(result.error)
      }
    })
  }

  const selectedCalId = defaultCalendarId ?? calendars[0]?.id

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Calendar selector */}
          {calendars.length > 1 && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-calendar">
                Calendar
              </label>
              <select
                id="event-calendar"
                name="calendarId"
                defaultValue={selectedCalId}
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {calendars.length === 1 && (
            <input type="hidden" name="calendarId" value={selectedCalId} />
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-title">
              Title
            </label>
            <Input
              id="event-title"
              name="title"
              placeholder="Event title"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-desc">
              Description{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="event-desc"
              name="description"
              placeholder="Add a description"
              maxLength={2000}
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-location">
              Location{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="event-location"
              name="location"
              placeholder="Add a location"
              maxLength={300}
            />
          </div>

          {/* Dates — native datetime-local inputs avoid Popover-in-Dialog z-index issues */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-starts">
                Start
              </label>
              <input
                id="event-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="event-ends">
                End{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="event-ends"
                type="datetime-local"
                value={endsAt}
                min={startsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:dark]"
              />
            </div>
          </div>

          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
