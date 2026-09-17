'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { StarRating } from './star-rating'
import { submitEventReview } from '../actions'

interface ReviewFormProps {
  ticketId: string
  eventTitle: string
  /** Called when review is successfully submitted */
  onSuccess?: () => void
}

export function ReviewForm({ ticketId, eventTitle, onSuccess }: ReviewFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Validate rating was selected
    const rating = Number(formData.get('rating'))
    if (!rating || rating < 1) {
      setError('Please select a star rating')
      return
    }

    startTransition(async () => {
      const result = await submitEventReview(formData)
      if (result.success) {
        setDone(true)
        onSuccess?.()
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-400" />
        <p className="text-[14px] font-medium text-zinc-200">Thanks for your review!</p>
        <p className="text-[12px] text-zinc-500">Your feedback helps the community.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-zinc-400">
          How would you rate <span className="text-zinc-200">{eventTitle}</span>?
        </label>
        <StarRating name="rating" size="lg" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="review-body" className="text-[12px] font-medium text-zinc-400">
          Leave a comment <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={3}
          maxLength={1000}
          placeholder="Share your experience…"
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-brand-500/60 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
        />
      </div>

      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit Review
      </button>
    </form>
  )
}
