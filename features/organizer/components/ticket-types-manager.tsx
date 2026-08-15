'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addTicketType, deleteTicketType } from '../actions'
import { formatPrice } from '@/features/events/utils'
import type { TicketType } from '@/app/generated/prisma/client'

interface TicketTypesManagerProps {
  eventId: string
  ticketTypes: Pick<
    TicketType,
    'id' | 'name' | 'description' | 'price' | 'currency' | 'quantity' | 'sold' | 'status'
  >[]
}

export function TicketTypesManager({ eventId, ticketTypes }: TicketTypesManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAdd = (formData: FormData) => {
    setError(null)
    formData.set('eventId', eventId)
    startTransition(async () => {
      const result = await addTicketType(formData)
      if (result.success) {
        setShowForm(false)
      } else {
        setError(result.error)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteTicketType(id)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Ticket Types</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
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
      {ticketTypes.length === 0 && !showForm && (
        <p className="text-muted-foreground text-[13px]">
          No ticket types yet. Add at least one to publish your event.
        </p>
      )}

      <div className="space-y-2">
        {ticketTypes.map((tt) => (
          <div
            key={tt.id}
            className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <div>
              <p className="text-[13.5px] font-semibold">{tt.name}</p>
              <div className="mt-0.5 flex items-center gap-3 text-[12px]">
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
              </div>
            </div>
            <button
              onClick={() => handleDelete(tt.id)}
              disabled={isPending || tt.sold > 0}
              aria-label={`Delete ${tt.name}`}
              className={cn(
                'text-muted-foreground rounded-lg p-1.5 transition-colors',
                tt.sold > 0
                  ? 'cursor-not-allowed opacity-30'
                  : 'hover:bg-red-500/10 hover:text-red-500'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form
          action={handleAdd}
          className="border-border mt-4 space-y-3 rounded-xl border border-dashed p-4"
        >
          <p className="text-[13px] font-semibold">New Ticket Type</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Name *</label>
              <input
                name="name"
                required
                placeholder="e.g. VIP, Regular, Early Bird"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Price (kobo) *</label>
              <input
                type="number"
                name="price"
                min={0}
                required
                placeholder="e.g. 500000 = ₦5,000"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium">Quantity</label>
              <input
                type="number"
                name="quantity"
                min={1}
                placeholder="Leave blank for unlimited"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">Currency</label>
              <select name="currency" className={inputCls}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium">Description</label>
            <input
              name="description"
              placeholder="Optional — shown to attendees"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
