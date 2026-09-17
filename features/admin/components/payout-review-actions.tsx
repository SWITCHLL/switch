'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { approvePayout, rejectPayout } from '@/features/payments/actions'

interface PayoutReviewActionsProps {
  payoutRequestId: string
  currentStatus: string
}

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[13px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none'
)

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PROCESSING: { label: 'Transfer initiated', cls: 'bg-blue-500/10 text-blue-400' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-500/10 text-red-500' },
}

export function PayoutReviewActions({ payoutRequestId, currentStatus }: PayoutReviewActionsProps) {
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const terminal = STATUS_LABELS[currentStatus]
  if (terminal) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', terminal.cls)}>
        {terminal.label}
      </span>
    )
  }

  function handleApprove() {
    setError('')
    startTransition(async () => {
      const result = await approvePayout(payoutRequestId)
      if (!result.success) setError(result.error)
    })
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await rejectPayout(payoutRequestId, note)
      if (!result.success) setError(result.error)
      else setMode('idle')
    })
  }

  if (mode === 'rejecting') {
    return (
      <form onSubmit={handleReject} className="space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for rejection (required)"
          rows={2}
          required
          minLength={3}
          className={inputCls}
        />
        {error && (
          <p className="flex items-center gap-1.5 text-[12px] text-red-500">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm reject
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="border-border text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-[12px] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <p className="w-full text-[12px] text-red-500">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={handleApprove}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Approve &amp; transfer
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setMode('rejecting')}
        className="border-border text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-60"
      >
        <XCircle className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  )
}
