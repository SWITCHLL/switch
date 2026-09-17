'use client'

import { useState, useTransition } from 'react'
import { joinWaitlist } from '../actions'

interface WaitlistButtonProps {
  eventId: string
  ticketTypeId: string
  quantity?: number
  /** If truthy, the user already has a waitlist entry — show position instead of join CTA */
  existingPosition?: number | null
  className?: string
}

export function WaitlistButton({
  eventId,
  ticketTypeId,
  quantity = 1,
  existingPosition,
  className,
}: WaitlistButtonProps) {
  const [position, setPosition] = useState<number | null>(existingPosition ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Already on waitlist — show current position
  if (position !== null) {
    return (
      <div
        className={`flex flex-col items-start gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 ${className ?? ''}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
          You&apos;re on the waitlist
        </p>
        <p className="text-sm text-zinc-300">
          Position <span className="font-bold text-white">#{position}</span> in the queue
        </p>
      </div>
    )
  }

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const result = await joinWaitlist({ eventId, ticketTypeId, quantity })
      if (result.success) {
        setPosition(result.position)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Join the waitlist for this ticket type"
      >
        {isPending ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200"
              aria-hidden="true"
            />
            Joining waitlist…
          </>
        ) : (
          'Join Waitlist'
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
