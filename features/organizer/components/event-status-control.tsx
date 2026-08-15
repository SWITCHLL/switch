'use client'

import { useTransition, useState } from 'react'
import { Globe, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { publishEvent, unpublishEvent } from '../actions'

interface EventStatusControlProps {
  eventId: string
  status: string
}

export function EventStatusControl({ eventId, status }: EventStatusControlProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isPublished = status === 'PUBLISHED'

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      const result = isPublished ? await unpublishEvent(eventId) : await publishEvent(eventId)
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
              className={cn('h-2 w-2 rounded-full', isPublished ? 'bg-emerald-500' : 'bg-zinc-500')}
            />
            <p className="text-[13.5px] font-medium">
              {isPublished ? 'Published — visible to everyone' : 'Draft — only you can see this'}
            </p>
          </div>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            {isPublished
              ? 'Ticket sales are open. Unpublish to hide the event.'
              : 'Add at least one ticket type before publishing.'}
          </p>
        </div>

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
      </div>
    </div>
  )
}
