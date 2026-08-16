'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GroupCountdownProps {
  expiresAt: Date
  onExpired?: () => void
}

function getTimeLeft(expiresAt: Date) {
  const ms = expiresAt.getTime() - Date.now()
  if (ms <= 0) return { total: 0, minutes: 0, seconds: 0 }
  const total = ms
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return { total, minutes, seconds }
}

export function GroupCountdown({ expiresAt, onExpired }: GroupCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt))

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft(expiresAt)
      setTimeLeft(t)
      if (t.total <= 0) {
        clearInterval(interval)
        onExpired?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  const isUrgent = timeLeft.total > 0 && timeLeft.minutes < 3

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-red-400">
        <Clock className="h-4 w-4" />
        <span className="text-[13px] font-semibold">Expired</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-3.5 py-2.5',
        isUrgent ? 'animate-pulse bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span className="font-mono text-[13px] font-semibold">
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
      <span className="text-[12px] opacity-70">remaining</span>
    </div>
  )
}
