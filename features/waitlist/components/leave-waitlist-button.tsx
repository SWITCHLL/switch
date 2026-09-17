'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leaveWaitlist } from '../actions'

interface LeaveWaitlistButtonProps {
  waitlistEntryId: string
  className?: string
}

export function LeaveWaitlistButton({ waitlistEntryId, className }: LeaveWaitlistButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const result = await leaveWaitlist({ waitlistEntryId })
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleLeave}
        disabled={isPending}
        className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Leave this waitlist"
      >
        {isPending ? 'Leaving…' : 'Leave waitlist'}
      </button>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
