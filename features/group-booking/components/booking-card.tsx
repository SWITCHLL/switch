'use client'

import { format, formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { Calendar, MapPin, Users, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingCardProps {
  id: string
  code: string
  status: 'PENDING' | 'COMPLETE' | 'EXPIRED' | 'CANCELLED'
  expiresAt: Date
  event: {
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
  }
  totalSlots: number
  paidSlots: number
  requireFullPayment: boolean
  onClick?: () => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; bgColor: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'text-amber-400',
    bgColor: 'bg-amber-500/15 border-amber-500/30',
  },
  COMPLETE: {
    label: 'Complete',
    className: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15 border-emerald-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'text-zinc-400',
    bgColor: 'bg-zinc-500/15 border-zinc-500/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'text-red-400',
    bgColor: 'bg-red-500/15 border-red-500/30',
  },
}

export function BookingCard({
  id,
  code,
  status,
  expiresAt,
  event,
  totalSlots,
  paidSlots,
  requireFullPayment,
  onClick,
}: BookingCardProps) {
  const statusCfg = STATUS_CONFIG[status]
  const isPending = status === 'PENDING'
  const isActive = status === 'COMPLETE' || status === 'PENDING'
  const openSlots = totalSlots - paidSlots
  const allPaid = paidSlots === totalSlots
  const timeRemaining = formatDistanceToNow(expiresAt, { addSuffix: true })

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-zinc-950 transition-all duration-300',
        'hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10',
        'active:scale-95',
        isActive ? 'border-zinc-800' : 'border-zinc-800 opacity-75'
      )}
    >
      {/* Background image with overlay */}
      <div className="relative h-32 w-full bg-gradient-to-br from-violet-900/50 to-purple-900/50">
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

        {/* Status badge */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs font-semibold backdrop-blur-sm',
              statusCfg.bgColor,
              statusCfg.className
            )}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Mode badge (all-or-nothing) */}
        {requireFullPayment && (
          <div className="absolute top-3 left-3">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-sm">
              All-or-Nothing
            </span>
          </div>
        )}

        {/* Event title */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="line-clamp-2 text-left text-sm font-bold leading-snug text-white drop-shadow">
            {event.title}
          </p>
        </div>
      </div>

      {/* Details section */}
      <div className="space-y-2.5 px-3 py-3">
        {/* Event date */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{format(event.startsAt, 'MMM d, yyyy')}</span>
          <span className="text-zinc-600">·</span>
          <span>{format(event.startsAt, 'h:mm a')}</span>
        </div>

        {/* Group code */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-mono text-[11px] tracking-widest">{code}</span>
        </div>

        {/* Slot progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                {paidSlots} of {totalSlots} paid
              </span>
            </div>
            {isPending && !allPaid && (
              <span className="text-[10px] font-medium text-amber-400">{openSlots} open</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn(
                'h-full transition-all duration-300',
                allPaid ? 'bg-emerald-500' : 'bg-brand-500'
              )}
              style={{ width: `${(paidSlots / totalSlots) * 100}%` }}
            />
          </div>
        </div>

        {/* Expiry/Deadline */}
        {isPending && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Expires {timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Hover action */}
      <div className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  )
}
