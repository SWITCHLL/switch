'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ManageEventError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('[ManageEventPage]', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center gap-5 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div>
        <h1 className="text-[18px] font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-1.5 text-[13.5px]">
          Failed to load this event. It may have been deleted or you may not have access.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-1 font-mono text-[11px]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={retry}
        className="from-brand-600 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}
