'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Link2, Loader2 } from 'lucide-react'
import { upsertTicketType } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTypeFormProps {
  eventId: string
  /** Present when editing an existing ticket type */
  initialData?: {
    ticketTypeId: string
    name: string
    description?: string | null
    price: number
    currency: string
    quantity?: number | null
    salesStart?: string | null
    salesEnd?: string | null
    minPerOrder?: number | null
    maxPerOrder?: number | null
    maxPerUser?: number | null
    visibility: 'PUBLIC' | 'HIDDEN' | 'PASSWORD_PROTECTED'
    directLinkToken?: string | null
    isTableType: boolean
    tableCapacity?: number | null
    requiresAssignedSeating: boolean
  }
  onSuccess?: (ticketTypeId: string) => void
  onCancel?: () => void
}

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50'

const labelCls = 'block text-[11.5px] font-medium text-zinc-400 mb-1'

// ─── Component ────────────────────────────────────────────────────────────────

export function TicketTypeForm({
  eventId,
  initialData,
  onSuccess,
  onCancel,
}: TicketTypeFormProps) {
  const isEditing = Boolean(initialData?.ticketTypeId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price ?? 0,
    currency: initialData?.currency ?? 'NGN',
    quantity: initialData?.quantity ?? '',
    salesStart: initialData?.salesStart ?? '',
    salesEnd: initialData?.salesEnd ?? '',
    minPerOrder: initialData?.minPerOrder ?? '',
    maxPerOrder: initialData?.maxPerOrder ?? '',
    maxPerUser: initialData?.maxPerUser ?? '',
    visibility: initialData?.visibility ?? 'PUBLIC',
    accessPassword: '',
    isTableType: initialData?.isTableType ?? false,
    tableCapacity: initialData?.tableCapacity ?? '',
    requiresAssignedSeating: initialData?.requiresAssignedSeating ?? false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await upsertTicketType({
        eventId,
        ...(initialData?.ticketTypeId ? { ticketTypeId: initialData.ticketTypeId } : {}),
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        currency: form.currency,
        quantity: form.quantity !== '' ? Number(form.quantity) : null,
        salesStart: form.salesStart || null,
        salesEnd: form.salesEnd || null,
        minPerOrder: form.minPerOrder !== '' ? Number(form.minPerOrder) : null,
        maxPerOrder: form.maxPerOrder !== '' ? Number(form.maxPerOrder) : null,
        maxPerUser: form.maxPerUser !== '' ? Number(form.maxPerUser) : null,
        visibility: form.visibility,
        ...(form.visibility === 'PASSWORD_PROTECTED' && form.accessPassword
          ? { accessPassword: form.accessPassword }
          : {}),
        isTableType: form.isTableType,
        tableCapacity: form.tableCapacity !== '' ? Number(form.tableCapacity) : null,
        requiresAssignedSeating: form.requiresAssignedSeating,
      })

      if (result.success) {
        onSuccess?.(result.ticketTypeId)
      } else {
        setError(result.error)
        if ('fieldErrors' in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        }
      }
    })
  }

  const directLinkUrl =
    initialData?.directLinkToken
      ? `${appUrl}/events?unlock=${initialData.directLinkToken}`
      : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={labelCls} htmlFor="tt-name">Name *</label>
        <input
          id="tt-name"
          className={inputCls}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Early Bird, VIP, General Admission"
          required
          disabled={isPending}
        />
        {fieldErrors.name && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.name}</p>}
      </div>

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="tt-price">Price (kobo/cents) *</label>
          <input
            id="tt-price"
            type="number"
            min={0}
            className={inputCls}
            value={form.price}
            onChange={(e) => set('price', e.target.valueAsNumber)}
            required
            disabled={isPending}
          />
          {fieldErrors.price && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.price}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="tt-currency">Currency</label>
          <input
            id="tt-currency"
            className={inputCls}
            value={form.currency}
            onChange={(e) => set('currency', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className={labelCls} htmlFor="tt-quantity">Quantity (blank = unlimited)</label>
        <input
          id="tt-quantity"
          type="number"
          min={1}
          className={inputCls}
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          placeholder="Leave blank for unlimited"
          disabled={isPending}
        />
        {fieldErrors.quantity && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.quantity}</p>}
      </div>

      {/* Sales window */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="tt-sales-start">Sales Start</label>
          <input
            id="tt-sales-start"
            type="datetime-local"
            className={inputCls}
            value={form.salesStart}
            onChange={(e) => set('salesStart', e.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="tt-sales-end">Sales End</label>
          <input
            id="tt-sales-end"
            type="datetime-local"
            className={inputCls}
            value={form.salesEnd}
            onChange={(e) => set('salesEnd', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Purchase limits */}
      <fieldset className="rounded-lg border border-zinc-800 p-3 space-y-3">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Purchase Limits</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls} htmlFor="tt-min">Min per order</label>
            <input
              id="tt-min"
              type="number"
              min={1}
              className={inputCls}
              value={form.minPerOrder}
              onChange={(e) => set('minPerOrder', e.target.value)}
              placeholder="No min"
              disabled={isPending}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="tt-max">Max per order</label>
            <input
              id="tt-max"
              type="number"
              min={1}
              className={inputCls}
              value={form.maxPerOrder}
              onChange={(e) => set('maxPerOrder', e.target.value)}
              placeholder="No max"
              disabled={isPending}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="tt-maxuser">Max per user</label>
            <input
              id="tt-maxuser"
              type="number"
              min={1}
              className={inputCls}
              value={form.maxPerUser}
              onChange={(e) => set('maxPerUser', e.target.value)}
              placeholder="No limit"
              disabled={isPending}
            />
          </div>
        </div>
      </fieldset>

      {/* Visibility */}
      <div>
        <label className={labelCls} htmlFor="tt-visibility">Visibility</label>
        <select
          id="tt-visibility"
          className={inputCls}
          value={form.visibility}
          onChange={(e) => set('visibility', e.target.value as typeof form.visibility)}
          disabled={isPending}
        >
          <option value="PUBLIC">Public — visible to everyone</option>
          <option value="PASSWORD_PROTECTED">Password Protected — requires a code</option>
          <option value="HIDDEN">Hidden — direct link only</option>
        </select>
      </div>

      {/* Password (PASSWORD_PROTECTED only) */}
      {form.visibility === 'PASSWORD_PROTECTED' && (
        <div>
          <label className={labelCls} htmlFor="tt-password">
            {isEditing ? 'New Password (leave blank to keep existing)' : 'Access Password *'}
          </label>
          <div className="relative">
            <input
              id="tt-password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputCls} pr-10`}
              value={form.accessPassword}
              onChange={(e) => set('accessPassword', e.target.value)}
              placeholder="Enter access password"
              required={!isEditing}
              disabled={isPending}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.accessPassword && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.accessPassword}</p>}
        </div>
      )}

      {/* Direct link (HIDDEN only) */}
      {form.visibility === 'HIDDEN' && directLinkUrl && (
        <div>
          <label className={labelCls}>Direct Link (read-only)</label>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate text-[12px] text-zinc-400">{directLinkUrl}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(directLinkUrl)}
              className="ml-auto shrink-0 rounded px-2 py-0.5 text-[11px] text-violet-400 hover:bg-zinc-800"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Table Type toggle */}
      <fieldset className="rounded-lg border border-zinc-800 p-3 space-y-3">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Table Configuration</legend>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isTableType}
            onChange={(e) => set('isTableType', e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-[13px] text-zinc-200">This is a table ticket type</span>
        </label>

        {form.isTableType && (
          <div className="space-y-3 pl-6">
            <div>
              <label className={labelCls} htmlFor="tt-table-cap">Seats per table</label>
              <input
                id="tt-table-cap"
                type="number"
                min={1}
                className={inputCls}
                value={form.tableCapacity}
                onChange={(e) => set('tableCapacity', e.target.value)}
                placeholder="e.g. 8"
                disabled={isPending}
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresAssignedSeating}
                onChange={(e) => set('requiresAssignedSeating', e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-[13px] text-zinc-200">Require assigned seating per seat</span>
            </label>
          </div>
        )}
      </fieldset>

      {/* Global error */}
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg px-3.5 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isPending}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Ticket Type'}
        </button>
      </div>
    </form>
  )
}
