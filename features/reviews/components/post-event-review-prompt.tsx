'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ReviewForm } from './review-form'
import { cn } from '@/lib/utils'

interface PendingReviewTicket {
  id: string
  ticketNumber: string
  event: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
    endsAt: Date | null
  }
}

interface PostEventReviewPromptProps {
  tickets: PendingReviewTicket[]
}

export function PostEventReviewPrompt({ tickets }: PostEventReviewPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  const pendingTickets = tickets.filter((t) => !reviewed.has(t.id))

  if (dismissed || pendingTickets.length === 0) return null

  const ticket = pendingTickets[Math.min(currentIndex, pendingTickets.length - 1)]

  function handleReviewed() {
    setReviewed((prev) => new Set([...prev, ticket.id]))
    // Move to next if available
    const remaining = pendingTickets.filter((t) => t.id !== ticket.id)
    if (remaining.length === 0) {
      setDismissed(true)
    } else {
      setCurrentIndex(0)
    }
  }

  const pendingCount = pendingTickets.length

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl ring-1 ring-white/10',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Rate event"
      >
        {/* Close */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Event image */}
        <div className="relative h-36 w-full">
          {ticket.event.imageUrl ? (
            <Image
              src={ticket.event.imageUrl}
              alt={ticket.event.title}
              fill
              className="object-cover object-center"
              sizes="448px"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-900/60 to-indigo-900/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70" />

          {/* Star icon overlay */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-500/40">
              <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
            </div>
            <span className="text-[11px] font-medium text-white/80">Rate this event</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 pt-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h2 className="text-[15px] font-semibold leading-tight text-zinc-100">
              {ticket.event.title}
            </h2>
            {pendingCount > 1 && (
              <span className="mt-0.5 shrink-0 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-400 ring-1 ring-brand-500/30">
                {pendingCount - reviewed.size} pending
              </span>
            )}
          </div>
          <p className="mb-4 text-[11.5px] text-zinc-500">
            {format(ticket.event.startsAt, 'EEEE, MMMM d, yyyy')}
          </p>

          <ReviewForm
            ticketId={ticket.id}
            eventTitle={ticket.event.title}
            onSuccess={handleReviewed}
          />

          <button
            onClick={() => setDismissed(true)}
            className="mt-3 w-full text-center text-[12px] text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
