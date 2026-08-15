'use client'

import { useTransition, useState } from 'react'
import { Globe, EyeOff, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { publishEvent, unpublishEvent, cancelEvent } from '../actions'

interface EventStatusControlProps {
  eventId: string
  status: string
}

export function EventStatusControl({ eventId, status }: EventStatusControlProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isPublished = status === 'PUBLISHED'
  const isCancelled = status === 'CANCELLED'

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      const result = isPublished ? await unpublishEvent(eventId) : await publishEvent(eventId)
      if (!result.success) setError(result.error)
    })
  }

  const handleCancel = () => {
    setError(null)
    setConfirmCancel(false)
    startTransition(async () => {
      const result = await cancelEvent(eventId)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <h2 className="mb-3 text-[14px] font-semibold">Publication</h2>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isPublished ? 'bg-emerald-500' : isCancelled ? 'bg-red-500' : 'bg-zinc-500'
              )}
            />
            <p className="text-[13.5px] font-medium">
              {isPublished
                ? 'Published — visible to everyone'
                : isCancelled
                  ? 'Cancelled — event will not take place'
                  : 'Draft — only you can see this'}
            </p>
          </div>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            {isPublished
              ? 'Ticket sales are open. Unpublish to hide the event.'
              : isCancelled
                ? 'This event has been cancelled and is no longer accessible.'
                : 'Add at least one ticket type before publishing.'}
          </p>
        </div>

        {!isCancelled && (
          <button
            onClick={toggle}
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all',
              isPublished
                ? 'border-border text-muted-foreground hover:bg-muted border'
                : 'from-brand-600 bg-gradient-to-r to-violet-600 text-white hover:opacity-90',
              isPending && 'cursor-not-allowed opacity-60'
            )}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {isPublished ? 'Unpublish' : 'Publish Event'}
          </button>
        )}
      </div>

      {/* ── Cancel section ── */}
      {!isCancelled && (
        <div className="border-border mt-4 border-t pt-4">
          {confirmCancel ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="text-[13px] text-red-500">
                This will permanently cancel the event. Are you sure?
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[12px] transition-colors"
                >
                  No, keep it
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Yes, cancel event
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 text-[12.5px] text-red-500/70 transition-colors hover:text-red-500"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel this event
            </button>
          )}
        </div>
      )}
    </div>
  )
}
