'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteCalendar } from '../actions'

interface DeleteCalendarButtonProps {
  calendarId: string
}

export function DeleteCalendarButton({ calendarId }: DeleteCalendarButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this calendar and all its events?')) return
    startTransition(async () => {
      await deleteCalendar(calendarId)
    })
  }

  return (
    <button
      type="button"
      aria-label="Delete calendar"
      disabled={isPending}
      onClick={handleClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
