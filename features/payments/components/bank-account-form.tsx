'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveBankAccount } from '../actions'

interface BankAccountFormProps {
  currentBank: {
    bankCode: string | null
    bankAccountNumber: string | null
    bankAccountName: string | null
  } | null
}

// Common Nigerian bank codes
const NIGERIAN_BANKS = [
  { code: '011', name: 'First Bank' },
  { code: '014', name: 'Mainstreet Bank' },
  { code: '023', name: 'Citibank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '035', name: 'Wema Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'EcoBank Nigeria' },
  { code: '057', name: 'Zenith Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '068', name: 'Standard Chartered' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '101', name: 'ProvidusBank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '318', name: 'Fidelity Mobile' },
  { code: '401', name: 'Stanbic IBTC Bank' },
  { code: '947', name: 'Opay (PayCom)' },
  { code: '999992', name: 'Kuda Bank' },
]

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
)

export function BankAccountForm({ currentBank }: BankAccountFormProps) {
  const [open, setOpen] = useState(!currentBank)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveBankAccount(fd)
      if (result.success) {
        setStatus('success')
        setOpen(false)
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[12.5px] transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        {currentBank ? 'Change' : 'Add bank account'}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 w-full max-w-sm space-y-3">
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-500">
          <CheckCircle2 className="h-4 w-4" /> Bank account saved.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      <div>
        <label className="mb-1 block text-[12px] font-medium">Bank</label>
        <select
          name="bankCode"
          required
          className={inputCls}
          defaultValue={currentBank?.bankCode ?? ''}
        >
          <option value="">Select bank</option>
          {NIGERIAN_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium">Account Number</label>
        <input
          name="accountNumber"
          type="text"
          inputMode="numeric"
          pattern="\d{10}"
          maxLength={10}
          required
          placeholder="10-digit account number"
          defaultValue={currentBank?.bankAccountNumber ?? ''}
          className={inputCls}
        />
        <p className="text-muted-foreground mt-1 text-[11.5px]">
          Account name will be verified via Paystack before saving.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPending ? 'Verifying…' : 'Save'}
        </button>
        {currentBank && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground border-border rounded-xl border px-4 py-2 text-[13px] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
