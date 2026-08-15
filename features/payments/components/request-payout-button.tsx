'use client'

import { useTransition, useState } from 'react'
import { Banknote, Loader2 } from 'lucide-react'
import { requestPayout } from '../actions'

export function RequestPayoutButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (done) {
    return <span className="text-[12px] font-medium text-emerald-500">Request submitted ✓</span>
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await requestPayout(eventId)
            if (result.success) {
              setDone(true)
            } else {
              setError(result.error)
            }
          })
        }}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Banknote className="h-3.5 w-3.5" />
        )}
        Request payout
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
