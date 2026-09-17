'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Building2, CheckCircle2, AlertCircle, Loader2, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBanks, saveBankAccount } from '../actions'

interface BankAccountFormProps {
  /** Currently saved bank details — null if not yet configured */
  currentBank: {
    bankCode: string | null
    bankAccountNumber: string | null
    bankAccountName: string | null
    [key: string]: unknown
  } | null
}

type Bank = { name: string; code: string; id: number }

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

export function BankAccountForm({ currentBank }: BankAccountFormProps) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [banksError, setBanksError] = useState(false)
  const [banksLoading, setBanksLoading] = useState(true)

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Form state
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [accountNumber, setAccountNumber] = useState(currentBank?.bankAccountNumber ?? '')

  // Submission
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Load banks on mount
  useEffect(() => {
    getBanks().then((result) => {
      if (result.success) {
        const sorted = [...result.data].sort((a, b) => a.name.localeCompare(b.name))
        setBanks(sorted)
        // Pre-select saved bank
        if (currentBank?.bankCode) {
          const saved = sorted.find((b) => b.code === currentBank.bankCode)
          if (saved) setSelectedBank(saved)
        }
      } else {
        setBanksError(true)
      }
      setBanksLoading(false)
    })
  }, [currentBank?.bankCode])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')

    if (!selectedBank) {
      setStatus('error')
      setErrorMsg('Please select a bank.')
      return
    }

    const fd = new FormData()
    fd.set('bankCode', selectedBank.code)
    fd.set('accountNumber', accountNumber.trim())

    startTransition(async () => {
      const result = await saveBankAccount(fd)
      if (result.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  const isEditing =
    !currentBank?.bankAccountNumber ||
    selectedBank?.code !== currentBank.bankCode ||
    accountNumber !== currentBank.bankAccountNumber

  return (
    <div className="border-border bg-surface rounded-2xl border p-6">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="bg-brand-500/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="text-brand-500 h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Payout Bank Account</h2>
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">
            Add your Nigerian bank account to receive event payouts.
          </p>
        </div>
      </div>

      {/* Currently saved — shown when not actively editing */}
      {currentBank?.bankAccountName && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{currentBank.bankAccountName}</p>
            <p className="text-muted-foreground text-[12px]">
              {banks.find((b) => b.code === currentBank.bankCode)?.name ?? currentBank.bankCode} ···{' '}
              {currentBank.bankAccountNumber?.slice(-4)}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success feedback */}
        {status === 'success' && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Bank account saved and verified successfully.
          </div>
        )}

        {/* Error feedback */}
        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-[13px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Bank selector */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium">
            Bank <span className="text-red-500">*</span>
          </label>

          {banksLoading ? (
            <div className={cn(inputCls, 'flex items-center gap-2 text-muted-foreground')}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading banks…
            </div>
          ) : banksError ? (
            <div className={cn(inputCls, 'flex items-center gap-2 text-red-500')}>
              <AlertCircle className="h-4 w-4" />
              Failed to load banks. Refresh to retry.
            </div>
          ) : (
            <div ref={dropdownRef} className="relative">
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className={cn(
                  inputCls,
                  'flex cursor-pointer items-center justify-between text-left',
                  !selectedBank && 'text-muted-foreground'
                )}
              >
                <span className="truncate">{selectedBank?.name ?? 'Select bank…'}</span>
                <ChevronDown
                  className={cn(
                    'ml-2 h-4 w-4 shrink-0 transition-transform',
                    dropdownOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="border-border bg-surface absolute z-20 mt-1.5 w-full rounded-xl border shadow-lg">
                  {/* Search */}
                  <div className="border-border flex items-center gap-2 border-b px-3.5 py-2.5">
                    <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search banks…"
                      className="bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>

                  {/* List */}
                  <ul className="max-h-52 overflow-y-auto py-1.5">
                    {filteredBanks.length === 0 ? (
                      <li className="text-muted-foreground px-4 py-3 text-[13px]">
                        No banks found
                      </li>
                    ) : (
                      filteredBanks.map((bank) => (
                        <li key={bank.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBank(bank)
                              setDropdownOpen(false)
                              setSearch('')
                              setStatus('idle')
                            }}
                            className={cn(
                              'w-full px-4 py-2.5 text-left text-[13.5px] transition-colors hover:bg-brand-500/10',
                              selectedBank?.code === bank.code &&
                                'text-brand-500 font-medium'
                            )}
                          >
                            {bank.name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account number */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => {
              // Only allow digits
              setAccountNumber(e.target.value.replace(/\D/g, ''))
              setStatus('idle')
            }}
            placeholder="0000000000"
            required
            className={cn(inputCls, 'font-mono tracking-widest')}
          />
          <p className="text-muted-foreground text-[11.5px]">
            Must be a 10-digit NUBAN account number. We&apos;ll verify the account name automatically.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending || banksLoading || banksError || !isEditing}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
              isPending || banksLoading || banksError || !isEditing
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
            )}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Verifying…' : 'Save Bank Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
