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
import { cn } from '@/lib/utils'
import { createCalendar } from '../actions'

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
]

interface CreateCalendarDialogProps {
  trigger?: React.ReactNode
}

export function CreateCalendarDialog({ trigger }: CreateCalendarDialogProps) {
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(PRESET_COLORS[0]!)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('color', color)

    startTransition(async () => {
      const result = await createCalendar(formData)
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
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Calendar
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Calendar</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="cal-title">
              Title
            </label>
            <Input
              id="cal-title"
              name="title"
              placeholder="e.g. Work, Personal, Events"
              maxLength={80}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" htmlFor="cal-desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="cal-desc"
              name="description"
              placeholder="What's this calendar for?"
              maxLength={500}
            />
          </div>

          {/* Color */}
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
              {isPending ? 'Creating…' : 'Create Calendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
