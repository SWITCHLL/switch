'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { upsertTimeSlot, deleteTimeSlot } from '@/features/time-slots/actions'
import type { UpsertTimeSlotInput } from '@/features/time-slots/schemas'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapacityEntry {
  ticketTypeId: string
  capacity: number
}

interface SlotCapacityDetail {
  ticketTypeId:   string
  ticketTypeName: string
  price:          number
  currency:       string
  capacity:       number
  booked:         number
  available:      number
}

interface TimeSlotRow {
  id:         string
  label:      string
  startsAt:   Date | string
  endsAt:     Date | string
  status:     string
  capacities: SlotCapacityDetail[]
}

interface TicketTypeOption {
  id:       string
  name:     string
  price:    number
  currency: string
}

interface TimeSlotConfigTabProps {
  eventId:     string
  timeSlots:   TimeSlotRow[]
  ticketTypes: TicketTypeOption[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 ' +
  'placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none ' +
  'focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50'

const labelCls = 'block text-[11.5px] font-medium text-zinc-400 mb-1'

function toLocalISO(d: Date | string): string {
  const date = new Date(d)
  const p    = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtPrice(p: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(p / 100)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimeSlotConfigTab({
  eventId,
  timeSlots: initial,
  ticketTypes,
}: TimeSlotConfigTabProps) {
  const [slots, setSlots]               = useState(initial)
  const [editingId, setEditingId]       = useState<string | 'new' | null>(null)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()

  // ── Form state ──────────────────────────────────────────────────────────────

  const [formLabel, setFormLabel]     = useState('')
  const [formStartsAt, setFormStartsAt] = useState('')
  const [formEndsAt, setFormEndsAt]   = useState('')
  // Per-ticket-type capacity: ticketTypeId → capacity string
  const [formCapacities, setFormCapacities] = useState<Record<string, string>>({})

  function openNew() {
    setEditingId('new')
    setFormLabel('')
    setFormStartsAt('')
    setFormEndsAt('')
    // Default capacity = '' (user must fill)
    const caps: Record<string, string> = {}
    for (const tt of ticketTypes) caps[tt.id] = ''
    setFormCapacities(caps)
    setError(null)
  }

  function openEdit(slot: TimeSlotRow) {
    setEditingId(slot.id)
    setFormLabel(slot.label)
    setFormStartsAt(toLocalISO(slot.startsAt))
    setFormEndsAt(toLocalISO(slot.endsAt))
    // Seed capacities from existing data, default to '' for any new ticket types
    const caps: Record<string, string> = {}
    for (const tt of ticketTypes) {
      const existing = slot.capacities.find((c) => c.ticketTypeId === tt.id)
      caps[tt.id] = existing ? String(existing.capacity) : ''
    }
    setFormCapacities(caps)
    setError(null)
  }

  function closeForm() {
    setEditingId(null)
    setError(null)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Build capacities array — only include rows with a value
    const capacities: CapacityEntry[] = []
    for (const tt of ticketTypes) {
      const raw = formCapacities[tt.id]
      if (raw && raw.trim() !== '') {
        const n = parseInt(raw, 10)
        if (isNaN(n) || n < 1) {
          setError(`Capacity for "${tt.name}" must be a positive number`)
          return
        }
        capacities.push({ ticketTypeId: tt.id, capacity: n })
      }
    }

    if (capacities.length === 0) {
      setError('Set a capacity for at least one ticket type')
      return
    }

    if (!formStartsAt || !formEndsAt) {
      setError('Start and end time are required')
      return
    }

    if (new Date(formStartsAt) >= new Date(formEndsAt)) {
      setError('Start time must be before end time')
      return
    }

    startTransition(async () => {
      const payload: UpsertTimeSlotInput = {
        eventId,
        ...(editingId !== 'new' ? { timeSlotId: editingId! } : {}),
        label:    formLabel,
        startsAt: new Date(formStartsAt).toISOString(),
        endsAt:   new Date(formEndsAt).toISOString(),
        capacities,
      }

      const result = await upsertTimeSlot(payload)
      if (!result.success) { setError(result.error); return }

      // Build the updated slot for optimistic UI
      const updatedCapacities: SlotCapacityDetail[] = capacities.map((cap) => {
        const tt = ticketTypes.find((t) => t.id === cap.ticketTypeId)!
        const existingCap = editingId !== 'new'
          ? slots.find((s) => s.id === editingId)?.capacities.find((c) => c.ticketTypeId === cap.ticketTypeId)
          : undefined
        return {
          ticketTypeId:   cap.ticketTypeId,
          ticketTypeName: tt.name,
          price:          tt.price,
          currency:       tt.currency,
          capacity:       cap.capacity,
          booked:         existingCap?.booked ?? 0,
          available:      cap.capacity - (existingCap?.booked ?? 0),
        }
      })

      const updatedSlot: TimeSlotRow = {
        id:         result.timeSlotId,
        label:      formLabel,
        startsAt:   new Date(formStartsAt),
        endsAt:     new Date(formEndsAt),
        status:     'ACTIVE',
        capacities: updatedCapacities,
      }

      if (editingId === 'new') {
        setSlots((prev) =>
          [...prev, updatedSlot].sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          )
        )
      } else {
        setSlots((prev) => prev.map((s) => (s.id === editingId ? updatedSlot : s)))
      }

      closeForm()
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteTimeSlot(id, eventId)
      if (!result.success) { setError(result.error) }
      else { setSlots((prev) => prev.filter((s) => s.id !== id)) }
      setDeleteConfirmId(null)
    })
  }

  const hasTicketTypes = ticketTypes.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-medium text-zinc-300">Show Times</h3>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Each show has its own capacity per ticket type.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          disabled={isPending || editingId !== null || !hasTicketTypes}
          title={!hasTicketTypes ? 'Add ticket types first' : undefined}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-600/10 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 transition-colors hover:bg-violet-600/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Show
        </button>
      </div>

      {!hasTicketTypes && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-400">
          Add ticket types above before configuring show times — capacity is set per ticket type per show.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">
          {error}
        </p>
      )}

      {/* Inline add/edit form */}
      {editingId !== null && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-zinc-200">
              {editingId === 'new' ? 'New Show' : 'Edit Show'}
            </p>
            <button type="button" onClick={closeForm} disabled={isPending} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Label + times */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className={labelCls}>Show Label *</label>
              <input
                className={inputCls}
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                placeholder="e.g. 26 Dec — 4pm Show"
                disabled={isPending}
              />
            </div>
            <div>
              <label className={labelCls}>Start Time *</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div>
              <label className={labelCls}>End Time *</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          {/* Per-ticket-type capacity */}
          <div>
            <p className={labelCls}>Capacity per Ticket Type</p>
            <div className="space-y-2">
              {ticketTypes.map((tt) => (
                <div key={tt.id} className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-[12.5px] text-zinc-200">{tt.name}</span>
                    <span className="shrink-0 text-[11px] text-zinc-500">
                      {fmtPrice(tt.price, tt.currency)}
                    </span>
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={formCapacities[tt.id] ?? ''}
                      onChange={(e) =>
                        setFormCapacities((prev) => ({ ...prev, [tt.id]: e.target.value }))
                      }
                      placeholder="—"
                      disabled={isPending}
                      aria-label={`Capacity for ${tt.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Leave blank to exclude a ticket type from this show.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              disabled={isPending}
              className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Show
            </button>
          </div>
        </form>
      )}

      {/* Slot list */}
      {slots.length === 0 && editingId === null ? (
        <p className="py-6 text-center text-[13px] text-zinc-500">No shows configured yet.</p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => {
            const totalBooked   = slot.capacities.reduce((s, c) => s + c.booked, 0)
            const totalCapacity = slot.capacities.reduce((s, c) => s + c.capacity, 0)
            const isExpanded    = expandedId === slot.id
            const hasBookings   = totalBooked > 0

            return (
              <div key={slot.id} className="rounded-lg border border-zinc-800 bg-zinc-950">
                {/* Row header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : slot.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-100">{slot.label}</p>
                      <p className="text-[11.5px] text-zinc-500">
                        {fmtDate(slot.startsAt)} · {fmtTime(slot.startsAt)} – {fmtTime(slot.endsAt)}
                        {totalCapacity > 0 && ` · ${totalBooked}/${totalCapacity} sold`}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(slot)}
                      disabled={isPending || editingId !== null}
                      aria-label={`Edit ${slot.label}`}
                      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {deleteConfirmId === slot.id ? (
                      <div className="ml-1 flex items-center gap-1">
                        <span className="text-[11px] text-zinc-400">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot.id)}
                          disabled={isPending}
                          className="rounded bg-red-600 px-2 py-0.5 text-[11px] text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={isPending}
                          className="rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(slot.id)}
                        disabled={isPending || hasBookings}
                        title={hasBookings ? 'Cannot delete — tickets exist' : 'Delete show'}
                        aria-label={`Delete ${slot.label}`}
                        className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded capacity breakdown */}
                {isExpanded && slot.capacities.length > 0 && (
                  <div className="border-t border-zinc-800 px-4 pb-3 pt-2">
                    <div className="space-y-1.5">
                      {slot.capacities.map((cap) => (
                        <div
                          key={cap.ticketTypeId}
                          className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[12.5px] text-zinc-200">{cap.ticketTypeName}</span>
                            <span className="text-[11px] text-zinc-500">
                              {fmtPrice(cap.price, cap.currency)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[12.5px] font-medium text-zinc-100">
                              {cap.booked}
                            </span>
                            <span className="text-[12px] text-zinc-500">/{cap.capacity}</span>
                            {cap.available === 0 && (
                              <span className="ml-2 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                                SOLD OUT
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
