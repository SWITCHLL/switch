'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ReviewForm } from './review-form'
import { StarRating } from './star-rating'
import { cn } from '@/lib/utils'

interface ReviewAuthor {
  name: string | null
  email: string
  image: string | null
}

interface Review {
  id: string
  rating: number
  body: string | null
  reply: string | null
  replyAt: Date | null
  createdAt: Date
  user: ReviewAuthor
}

interface EventReviewsSectionProps {
  reviews: Review[]
  /** Present only when the logged-in user has a valid unreviewed ticket */
  pendingTicketId?: string | null
  eventTitle: string
}

export function EventReviewsSection({ reviews, pendingTicketId, eventTitle }: EventReviewsSectionProps) {
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      {/* ── Heading & summary ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="text-[17px] font-semibold">
            Reviews
          </h2>
          {avgRating !== null && (
            <div className="mt-1 flex items-center gap-2">
              <StarRating name="_avg" defaultValue={Math.round(avgRating)} readOnly size="sm" />
              <span className="text-[13px] text-muted-foreground">
                {avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* CTA for users with a pending review */}
        {pendingTicketId && !submitted && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        )}
      </div>

      {/* ── Inline review form ── */}
      {pendingTicketId && showForm && !submitted && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <ReviewForm
            ticketId={pendingTicketId}
            eventTitle={eventTitle}
            onSuccess={() => {
              setSubmitted(true)
              setShowForm(false)
            }}
          />
        </div>
      )}

      {/* ── Review list ── */}
      {reviews.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-muted/30 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13.5px] text-muted-foreground">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.user.name
    ? review.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : review.user.email.slice(0, 2).toUpperCase()

  const displayName = review.user.name || review.user.email.split('@')[0]

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      {/* Author */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
          {review.user.image ? (
            <Image src={review.user.image} alt={displayName} fill className="object-cover" sizes="32px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">
            {format(review.createdAt, 'MMM d, yyyy')}
          </p>
        </div>
        {/* Stars */}
        <div className="flex shrink-0 items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={cn(
                'h-3.5 w-3.5',
                s <= review.rating ? 'fill-amber-400 stroke-amber-400' : 'fill-transparent stroke-zinc-600'
              )}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      {review.body && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">{review.body}</p>
      )}

      {/* Organizer reply */}
      {review.reply && (
        <div className="mt-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
          <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">Organizer reply</p>
          <p className="text-[12.5px] text-foreground">{review.reply}</p>
        </div>
      )}
    </div>
  )
}
