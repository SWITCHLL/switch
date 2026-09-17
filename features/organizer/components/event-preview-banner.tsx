'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, ArrowLeft, Globe, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { publishEvent } from '../actions'

interface EventPreviewBannerProps {
  eventId: string
  status: string
}

export function EventPreviewBanner({ eventId, status }: EventPreviewBannerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isDraft = status === 'DRAFT'

  const handlePublish = () => {
    setError(null)
    startTransition(async () => {
      const result = await publishEvent(eventId)
      if (!result.success) {
        setError(result.error)
      } else {
        router.push(`/dashboard/events/${eventId}`)
      }
    })
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-500/30 bg-amber-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Eye className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-[13px] font-semibold text-amber-300">Preview mode</span>
          <span className="hidden text-[12.5px] text-amber-400/70 sm:inline">
            — this is how your event will look to attendees
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              status === 'PUBLISHED'
                ? 'bg-emerald-500/15 text-emerald-400'
                : status === 'CANCELLED'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-zinc-500/15 text-zinc-400'
            )}
          >
            {status}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push(`/dashboard/events/${eventId}`)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-[12.5px] font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to edit
          </button>

          {isDraft && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              Publish now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
