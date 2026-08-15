'use client'

import { useState, useTransition } from 'react'
import { Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitReview } from '../actions'

interface ReviewFormProps {
  ticketId: string
  eventTitle: string
}

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none'
)

export function ReviewForm({ ticketId, eventTitle }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (rating === 0) return
    const fd = new FormData(e.currentTarget)
    fd.set('ticketId', ticketId)
    fd.set('rating', String(rating))

    startTransition(async () => {
      const result = await submitReview(fd)
      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Thank you for your review!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-[13px] font-medium">Rate {eventTitle}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  (hovered || rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium">Review (optional)</label>
        <textarea
          name="body"
          rows={3}
          maxLength={2000}
          placeholder="Share your experience…"
          className={inputCls}
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className={cn(
          'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
          isPending || rating === 0
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
        )}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit review
      </button>
    </form>
  )
}
