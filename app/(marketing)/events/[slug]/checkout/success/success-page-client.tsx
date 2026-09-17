'use client'

import { useState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'

interface AddToCalendarButtonProps {
  /** The event slug — used to construct the ICS download URL */
  eventSlug: string
  /** Display name for the event (used in aria labels) */
  eventTitle?: string
}

/**
 * Client Component — "Add to Calendar" button.
 * Fetches the ICS file from /api/events/[slug]/ical and triggers a download.
 */
export function AddToCalendarButton({ eventSlug, eventTitle }: AddToCalendarButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/events/${eventSlug}/ical`)
      if (!res.ok) {
        setError('Could not generate calendar file. Please try again.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${eventSlug}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={eventTitle ? `Add ${eventTitle} to calendar` : 'Add to calendar'}
        aria-busy={isLoading}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        )}
        Add to Calendar
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-[12px] text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
