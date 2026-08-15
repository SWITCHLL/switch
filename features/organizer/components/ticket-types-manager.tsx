'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { addTicketType, deleteTicketType, updateTicketType } from '../actions'
import { formatPrice } from '@/features/events/utils'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import type { TicketType } from '@/app/generated/prisma/client'

type TTRow = Pick<
  TicketType,
  | 'id'
  | 'name'
  | 'description'
  | 'price'
  | 'currency'
  | 'quantity'
  | 'sold'
  | 'status'
  | 'salesStart'
  | 'salesEnd'
>

interface TicketTypesManagerProps {
  eventId: string
  ticketTypes: TTRow[]
}

// ─── Add form state ───────────────────────────────────────────────────────────

interface AddFormState {
  name: string
  price: string
  quantity: string
  currency: string
  description: string
  salesStart: string
  salesEnd: string
}

const EMPTY_ADD: AddFormState = {
  name: '',
  price: '',
  quantity: '',
  currency: 'NGN',
  description: '',
  salesStart: '',
  salesEnd: '',
}

// ─── Edit form state ──────────────────────────────────────────────────────────

interface EditFormState {
  name: string
  price: string
  quantity: string
  currency: string
  description: string
  salesStart: string
  salesEnd: string
}

function ttToEditState(tt: TTRow): EditFormState {
  return {
    name: tt.name,
    price: String(tt.price),
    quantity: tt.quantity != null ? String(tt.quantity) : '',
    currency: tt.currency,
    description: tt.description ?? '',
    salesStart: tt.salesStart ? toDatetimeLocal(tt.salesStart) : '',
    salesEnd: tt.salesEnd ? toDatetimeLocal(tt.salesEnd) : '',
  }
}

function toDatetimeLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TicketTypesManager({ eventId, ticketTypes }: TicketTypesManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ── Add ──────────────────────────────────────────────────────────────────

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('eventId', eventId)
    fd.set('name', addForm.name)
    fd.set('price', addForm.price)
    fd.set('currency', addForm.currency)
    if (addForm.quantity) fd.set('quantity', addForm.quantity)
    if (addForm.description) fd.set('description', addForm.description)
    if (addForm.salesStart) fd.set('salesStart', new Date(addForm.salesStart).toISOString())
    if (addForm.salesEnd) fd.set('salesEnd', new Date(addForm.salesEnd).toISOString())

    startTransition(async () => {
      const result = await addTicketType(fd)
      if (result.success) {
        setShowAdd(false)
        setAddForm(EMPTY_ADD)
      } else {
        setError(result.error)
      }
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteTicketType(id)
      if (!result.success) setError(result.error)
    })
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(tt: TTRow) {
    setEditingId(tt.id)
    setEditForm(ttToEditState(tt))
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  function handleEditSave(id: string) {
    if (!editForm) return
    setError(null)
    const fd = new FormData()
    fd.set('ticketTypeId', id)
    fd.set('name', editForm.name)
    fd.set('price', editForm.price)
    fd.set('currency', editForm.currency)
    fd.set('quantity', editForm.quantity) // empty string → cleared server-side
    if (editForm.description) fd.set('description', editForm.description)
    fd.set('salesStart', editForm.salesStart ? new Date(editForm.salesStart).toISOString() : '')
    fd.set('salesEnd', editForm.salesEnd ? new Date(editForm.salesEnd).toISOString() : '')

    startTransition(async () => {
      const result = await updateTicketType(fd)
      if (result.success) {
        cancelEdit()
      } else {
        setError(result.error)
      }
    })
  }

  // ── Status toggle ─────────────────────────────────────────────────────────

  function handleToggleStatus(tt: TTRow) {
    setError(null)
    const nextStatus = tt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const fd = new FormData()
    fd.set('ticketTypeId', tt.id)
    fd.set('status', nextStatus)
    startTransition(async () => {
      const result = await updateTicketType(fd)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Ticket Types</h2>
        <button
          onClick={() => {
            setShowAdd((v) => !v)
            setError(null)
          }}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add ticket type
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Existing ticket types */}
      {ticketTypes.length === 0 && !showAdd && (
        <p className="text-muted-foreground text-[13px]">
          No ticket types yet. Add at least one to publish your event.
        </p>
      )}

      <div className="space-y-2">
        {ticketTypes.map((tt) =>
          editingId === tt.id && editForm ? (
            // ── Inline edit form ─────────────────────────────────────────────
            <div
              key={tt.id}
              className="border-border space-y-3 rounded-xl border border-dashed p-4"
            >
              <p className="text-[13px] font-semibold">Edit Ticket Type</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Name *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Price (kobo) *</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    placeholder="Blank = unlimited"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Currency</label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className={inputCls}
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium">Description</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Sales Open</label>
                  <DateTimePicker
                    value={editForm.salesStart}
                    onChange={(v) => setEditForm({ ...editForm, salesStart: v })}
                    placeholder="No restriction"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium">Sales Close</label>
                  <DateTimePicker
                    value={editForm.salesEnd}
                    onChange={(v) => setEditForm({ ...editForm, salesEnd: v })}
                    placeholder="No restriction"
                    fromDate={editForm.salesStart ? new Date(editForm.salesStart) : undefined}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleEditSave(tt.id)}
                  disabled={isPending}
                  className="bg-brand-600 flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            // ── Row view ────────────────────────────────────────────────────
            <div
              key={tt.id}
              className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold">{tt.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[12px]">
                  <span className="text-brand-500 font-medium">
                    {tt.price === 0 ? 'Free' : formatPrice(tt.price, tt.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    {tt.sold}/{tt.quantity ?? '∞'} sold
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                      tt.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : tt.status === 'SOLD_OUT'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-zinc-500/10 text-zinc-400'
                    )}
                  >
                    {tt.status}
                  </span>
                  {(tt.salesStart || tt.salesEnd) && (
                    <span className="text-muted-foreground truncate">
                      {tt.salesStart ? new Date(tt.salesStart).toLocaleDateString() : '—'}
                      {' → '}
                      {tt.salesEnd ? new Date(tt.salesEnd).toLocaleDateString() : '∞'}
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-1">
                {/* Status toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(tt)}
                  disabled={isPending || tt.status === 'SOLD_OUT'}
                  aria-label={tt.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  title={tt.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  className={cn(
                    'rounded-lg p-1.5 transition-colors',
                    tt.status === 'SOLD_OUT'
                      ? 'cursor-not-allowed opacity-30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tt.status === 'ACTIVE' ? (
                    <ToggleRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => startEdit(tt)}
                  disabled={isPending}
                  aria-label={`Edit ${tt.name}`}
                  className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(tt.id)}
                  disabled={isPending || tt.sold > 0}
                  aria-label={`Delete ${tt.name}`}
                  className={cn(
                    'rounded-lg p-1.5 transition-colors',
                    tt.sold > 0
                      ? 'cursor-not-allowed opacity-30'
                      : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Add form ── */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="border-border mt-4 space-y-3 rounded-xl border border-dashed p-4"
        >
          <p className="text-[13px] font-semibold">New Ticket Type</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Name *</label>
              <input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
                placeholder="e.g. VIP, Regular, Early Bird"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Price (kobo) *</label>
              <input
                type="number"
                min={0}
                required
                value={addForm.price}
                onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                placeholder="e.g. 500000 = ₦5,000 · 0 = Free"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                placeholder="Blank = unlimited"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Currency</label>
              <select
                value={addForm.currency}
                onChange={(e) => setAddForm({ ...addForm, currency: e.target.value })}
                className={inputCls}
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium">Description</label>
            <input
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              placeholder="Optional — shown to attendees"
              className={inputCls}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Sales Open</label>
              <DateTimePicker
                value={addForm.salesStart}
                onChange={(v) => setAddForm({ ...addForm, salesStart: v })}
                placeholder="No restriction"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Sales Close</label>
              <DateTimePicker
                value={addForm.salesEnd}
                onChange={(v) => setAddForm({ ...addForm, salesEnd: v })}
                placeholder="No restriction"
                fromDate={addForm.salesStart ? new Date(addForm.salesStart) : undefined}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false)
                setAddForm(EMPTY_ADD)
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
              Add
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
