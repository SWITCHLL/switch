'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { refundGroupSlot } from '../actions'

interface GroupSlotRefundActionsProps {
  slotId: string
  /** Payment status — 'REFUNDED' means already processed */
  paymentStatus: string
}

export function GroupSlotRefundActions({ slotId, paymentStatus }: GroupSlotRefundActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (paymentStatus === 'REFUNDED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Refunded
      </span>
    )
  }

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await refundGroupSlot(slotId)
      if (!result.success) {
        setError(result.error)
        setConfirming(false)
      }
      // On success, revalidatePath in the action will refresh the page
    })
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        {error && (
          <p className="flex items-center gap-1.5 text-[12px] text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Confirm refund
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => { setConfirming(false); setError('') }}
            className={cn(
              'border-border text-muted-foreground hover:text-foreground rounded-lg border',
              'px-3 py-1.5 text-[12px] transition-colors disabled:opacity-60'
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5',
          'text-[12px] font-semibold text-red-400 transition-colors hover:bg-red-500/10'
        )}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Issue refund
      </button>
    </div>
  )
}
