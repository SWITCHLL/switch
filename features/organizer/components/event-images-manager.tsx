'use client'

import { useState, useTransition } from 'react'
import { Images, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventImageUploader } from '@/components/ui/event-image-uploader'
import { saveEventImages } from '../actions'

interface EventImagesManagerProps {
  eventId: string
  initialUrls: string[]
}

export function EventImagesManager({ eventId, initialUrls }: EventImagesManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [savedUrls, setSavedUrls] = useState<string[]>(initialUrls)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Track whether there are unsaved changes
  const isDirty = JSON.stringify(urls) !== JSON.stringify(savedUrls)

  function handleSave() {
    setStatus('idle')
    startTransition(async () => {
      const result = await saveEventImages(eventId, urls)
      if (result.success) {
        setSavedUrls(urls)
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-500/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Images className="text-brand-400 h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold">Event Images</h2>
            <p className="text-muted-foreground text-[12px]">
              Upload up to 6 images. The first image is used as the banner.
            </p>
          </div>
        </div>

        {/* Save button — only shown when there are unsaved changes */}
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-opacity',
              isPending
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
            )}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        )}
      </div>

      {/* Feedback */}
      {status === 'success' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Images saved successfully.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Uploader */}
      <EventImageUploader initialUrls={initialUrls} onChange={setUrls} maxImages={6} />

      {/* Unsaved changes notice */}
      {isDirty && !isPending && (
        <p className="text-muted-foreground mt-3 text-[12px]">
          You have unsaved changes — click <strong className="text-foreground">Save</strong> to
          apply them.
        </p>
      )}
    </section>
  )
}
