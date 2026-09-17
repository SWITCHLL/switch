'use client'

import { useEffect, useState } from 'react'
import type { WaitlistStatus } from '../types'

interface WaitlistStatusBadgeProps {
  status: WaitlistStatus
  position?: number | null
  /** ISO string of the offer expiry (only relevant when status === 'OFFERED') */
  offerExpiresAt?: string | null
}

function formatCountdown(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now()
  if (diffMs <= 0) return 'Expired'

  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`
}

export function WaitlistStatusBadge({ status, position, offerExpiresAt }: WaitlistStatusBadgeProps) {
  const [countdown, setCountdown] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'OFFERED' || !offerExpiresAt) return

    const expiresDate = new Date(offerExpiresAt)
    // Update immediately
    setCountdown(formatCountdown(expiresDate))

    const interval = setInterval(() => {
      const remaining = formatCountdown(expiresDate)
      setCountdown(remaining)
      if (remaining === 'Expired') clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [status, offerExpiresAt])

  if (status === 'PENDING') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
        aria-label={position ? `Waitlist position ${position}` : 'On waitlist'}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
        {position ? `#${position} in queue` : 'Waitlisted'}
      </span>
    )
  }

  if (status === 'OFFERED') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300"
        aria-label={`Spot offered — ${countdown ?? 'check expiry'}`}
      >
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
        Spot offered{countdown ? ` — ${countdown}` : ''}
      </span>
    )
  }

  if (status === 'FULFILLED') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400"
        aria-label="Waitlist offer fulfilled — ticket purchased"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Fulfilled
      </span>
    )
  }

  if (status === 'EXPIRED') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400"
        aria-label="Waitlist offer expired"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/60" aria-hidden="true" />
        Expired
      </span>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-500"
        aria-label="Left waitlist"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600" aria-hidden="true" />
        Left waitlist
      </span>
    )
  }

  return null
}
