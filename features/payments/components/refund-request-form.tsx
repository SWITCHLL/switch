'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitRefundRequest } from '../actions'

interface RefundRequestFormProps {
  paymentId: string
  eventTitle: string
}

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none'
)

export function RefundRequestForm({ paymentId, eventTitle }: RefundRequestFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('paymentId', paymentId)
    startTransition(async () => {
      const result = await submitRefundRequest(fd)
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
        Refund request submitted. We&apos;ll review it within 48 hours.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12.5px] text-red-500/70 transition-colors hover:text-red-500"
      >
        Request a refund
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3">
      <div>
        <p className="mb-1 text-[13px] font-medium">Complaint / Refund Request</p>
        <p className="text-muted-foreground mb-3 text-[12px]">
          You have 48 hours after <strong>{eventTitle}</strong> ends to submit a refund request.
        </p>
        <textarea
          name="reason"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          placeholder="Describe the issue — what went wrong, what you expected, etc."
          className={inputCls}
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit request
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground border-border rounded-xl border px-4 py-2 text-[13px] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
