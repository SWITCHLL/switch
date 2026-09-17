'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { updateCalendarEvent, deleteCalendarEvent } from '../actions'
import type { CalendarEventItem } from '../types'

interface EditEventDialogProps {
  event: CalendarEventItem
  open: boolean
  onClose: () => void
}

export function EditEventDialog({ event, open, onClose }: EditEventDialogProps) {
  const [startsAt, setStartsAt] = useState(format(event.startsAt, "yyyy-MM-dd'T'HH:mm"))
  const [endsAt, setEndsAt] = useState(
    event.endsAt ? format(event.endsAt, "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!startsAt) {
      setError('Start date is required')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('eventId', event.id)
    formData.set('calendarId', event.calendarId)
    formData.set('startsAt', new Date(startsAt).toISOString())
    if (endsAt) {
      formData.set('endsAt', new Date(endsAt).toISOString())
    } else {
      formData.set('endsAt', '')
    }

    startTransition(async () => {
      const result = await updateCalendarEvent(formData)
      if (result.success) {
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteCalendarEvent(event.id)
      if (result.success) {
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-ev-title">
              Title
            </label>
            <Input
              id="edit-ev-title"
              name="title"
              defaultValue={event.title}
              maxLength={200}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-ev-desc">
              Description{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="edit-ev-desc"
              name="description"
              defaultValue={event.description ?? ''}
              maxLength={2000}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-ev-loc">
              Location{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="edit-ev-loc"
              name="location"
              defaultValue={event.location ?? ''}
              maxLength={300}
            />
          </div>

          {/* Dates — native datetime-local inputs avoid Popover-in-Dialog z-index issues */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-ev-starts">
                Start
              </label>
              <input
                id="edit-ev-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-ev-ends">
                End{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="edit-ev-ends"
                type="datetime-local"
                value={endsAt}
                min={startsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="border-border bg-surface text-foreground w-full rounded-xl border px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:dark]"
              />
            </div>
          </div>

          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
