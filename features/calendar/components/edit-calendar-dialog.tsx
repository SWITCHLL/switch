'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { updateCalendar } from '../actions'
import type { CalendarWithCount } from '../types'

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
]

interface EditCalendarDialogProps {
  calendar: CalendarWithCount
}

export function EditCalendarDialog({ calendar }: EditCalendarDialogProps) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(calendar.color)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('color', color)
    formData.set('calendarId', calendar.id)

    startTransition(async () => {
      const result = await updateCalendar(formData)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit calendar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Calendar</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-cal-title">
              Title
            </label>
            <Input
              id="edit-cal-title"
              name="title"
              defaultValue={calendar.title}
              maxLength={80}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="edit-cal-desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="edit-cal-desc"
              name="description"
              defaultValue={calendar.description ?? ''}
              maxLength={500}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium">Color</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-black'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
