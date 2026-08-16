'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Tag,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPromoCode, updatePromoCode, deletePromoCode } from '../actions'
import { formatPrice } from '@/features/events/utils'
import type { PromoCodeRow } from '../types'
import type { TicketType } from '@/app/generated/prisma/client'

interface PromoCodesManagerProps {
  eventId: string
  promoCodes: PromoCodeRow[]
  ticketTypes: Pick<TicketType, 'id' | 'name'>[]
}

interface AddFormState {
  code: string
  discountType: 'PERCENTAGE' | 'FLAT'
  discountValue: string
  maxUses: string
  expiresAt: string
  ticketTypeId: string
}

const EMPTY_ADD: AddFormState = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxUses: '',
  expiresAt: '',
  ticketTypeId: '',
}

export function PromoCodesManager({ eventId, promoCodes, ticketTypes }: PromoCodesManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Copy code to clipboard ──────────────────────────────────────────────

  function handleCopy(code: string, id: string) {
    void navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // ── Add ──────────────────────────────────────────────────────────────────

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('eventId', eventId)
    fd.set('code', addForm.code)
    fd.set('discountType', addForm.discountType)
    fd.set('discountValue', addForm.discountValue)
    if (addForm.maxUses) fd.set('maxUses', addForm.maxUses)
    if (addForm.expiresAt) fd.set('expiresAt', new Date(addForm.expiresAt).toISOString())
    if (addForm.ticketTypeId) fd.set('ticketTypeId', addForm.ticketTypeId)

    startTransition(async () => {
      const result = await createPromoCode(fd)
      if (result.success) {
        setShowAdd(false)
        setAddForm(EMPTY_ADD)
      } else {
        setError(result.error)
      }
    })
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  function handleToggle(id: string, current: boolean) {
    setError(null)
    const fd = new FormData()
    fd.set('promoCodeId', id)
    fd.set('isActive', String(!current))
    startTransition(async () => {
      const result = await updatePromoCode(fd)
      if (!result.success) setError(result.error)
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    setError(null)
    const fd = new FormData()
    fd.set('promoCodeId', id)
    startTransition(async () => {
      const result = await deletePromoCode(fd)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="text-brand-500 h-4 w-4" />
          <h2 className="text-[14px] font-semibold">Promo Codes</h2>
        </div>
        <button
          onClick={() => {
            setShowAdd((v) => !v)
            setError(null)
          }}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add code
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Existing promo codes */}
      {promoCodes.length === 0 && !showAdd && (
        <p className="text-muted-foreground text-[13px]">
          No promo codes yet. Add one for early-bird deals, influencer partnerships, or corporate
          blocks.
        </p>
      )}

      <div className="space-y-2">
        {promoCodes.map((pc) => (
          <div
            key={pc.id}
            className={cn(
              'border-border flex items-center justify-between rounded-xl border px-4 py-3',
              !pc.isActive && 'opacity-50'
            )}
          >
            <div className="min-w-0">
              {/* Code + copy button */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13.5px] font-bold tracking-wider">{pc.code}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(pc.code, pc.id)}
                  aria-label="Copy code"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === pc.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Metadata */}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
                <span className="text-brand-500 font-semibold">
                  {pc.discountType === 'PERCENTAGE'
                    ? `${pc.discountValue}% off`
                    : `${formatPrice(pc.discountValue)} off`}
                </span>
                <span className="text-muted-foreground">
                  {pc.usedCount}/{pc.maxUses ?? '∞'} used
                </span>
                {pc.ticketTypeName && (
                  <span className="text-muted-foreground">Only: {pc.ticketTypeName}</span>
                )}
                {pc.expiresAt && (
                  <span className="text-muted-foreground">
                    Expires {new Date(pc.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                    pc.isActive
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-zinc-500/10 text-zinc-400'
                  )}
                >
                  {pc.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-2 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggle(pc.id, pc.isActive)}
                disabled={isPending}
                aria-label={pc.isActive ? 'Deactivate code' : 'Activate code'}
                title={pc.isActive ? 'Deactivate' : 'Activate'}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
              >
                {pc.isActive ? (
                  <ToggleRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pc.id)}
                disabled={isPending || pc.usedCount > 0}
                aria-label={`Delete ${pc.code}`}
                title={pc.usedCount > 0 ? 'Cannot delete used code — deactivate instead' : 'Delete'}
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  pc.usedCount > 0
                    ? 'cursor-not-allowed opacity-30'
                    : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="border-border mt-4 space-y-3 rounded-xl border border-dashed p-4"
        >
          <p className="text-[13px] font-semibold">New Promo Code</p>

          {/* Code + type row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Code *</label>
              <input
                value={addForm.code}
                onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. EARLYBIRD20"
                className={inputCls}
                maxLength={30}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Discount Type *</label>
              <select
                value={addForm.discountType}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    discountType: e.target.value as 'PERCENTAGE' | 'FLAT',
                    discountValue: '',
                  })
                }
                className={inputCls}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat amount (kobo)</option>
              </select>
            </div>
          </div>

          {/* Value + max uses */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">
                {addForm.discountType === 'PERCENTAGE'
                  ? 'Discount % (1–100) *'
                  : 'Flat discount (kobo) *'}
              </label>
              <input
                type="number"
                min={1}
                max={addForm.discountType === 'PERCENTAGE' ? 100 : undefined}
                required
                value={addForm.discountValue}
                onChange={(e) => setAddForm({ ...addForm, discountValue: e.target.value })}
                placeholder={
                  addForm.discountType === 'PERCENTAGE'
                    ? 'e.g. 20 = 20% off'
                    : 'e.g. 500000 = ₦5,000 off'
                }
                className={inputCls}
              />
              {addForm.discountType === 'FLAT' && (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Amount in kobo — 100 kobo = ₦1
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Max Uses</label>
              <input
                type="number"
                min={1}
                value={addForm.maxUses}
                onChange={(e) => setAddForm({ ...addForm, maxUses: e.target.value })}
                placeholder="Blank = unlimited"
                className={inputCls}
              />
            </div>
          </div>

          {/* Ticket type scope + expiry */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Scoped Ticket Type</label>
              <select
                value={addForm.ticketTypeId}
                onChange={(e) => setAddForm({ ...addForm, ticketTypeId: e.target.value })}
                className={inputCls}
              >
                <option value="">All ticket types</option>
                {ticketTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Expires At</label>
              <input
                type="datetime-local"
                value={addForm.expiresAt}
                onChange={(e) => setAddForm({ ...addForm, expiresAt: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false)
                setAddForm(EMPTY_ADD)
                setError(null)
              }}
              className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[12.5px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-brand-600 flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const inputCls = cn(
  'w-full rounded-lg border border-border bg-background px-3 py-2',
  'text-[13px] text-foreground placeholder:text-muted-foreground',
  'outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30'
)
