'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, ToggleLeft, ToggleRight, Minus, Plus, Share2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'
import { createGroupOrder } from '../actions'
import type { EventDetail } from '@/features/events/types'

interface GroupBookingPanelProps {
  event: EventDetail
  /** Pre-selected reserved seat IDs (passed from seat map page) */
  selectedSeatIds?: string[]
}

// ─── GA mode: qty selectors per ticket type ───────────────────────────────────

interface GABundle {
  ticketTypeId: string
  quantity: number
}

// ─── TTL options ──────────────────────────────────────────────────────────────

const TTL_OPTIONS = [
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
]

export function GroupBookingPanel({ event, selectedSeatIds = [] }: GroupBookingPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // GA ticket quantities
  const [gaSelections, setGaSelections] = useState<Record<string, number>>({})
  // Deadline TTL
  const [ttlMinutes, setTtlMinutes] = useState(15)
  // Payment mode
  const [requireFullPayment, setRequireFullPayment] = useState(false)

  const isReserved = event.seatingType !== 'GENERAL_ADMISSION'
  const activeTypes = event.ticketTypes.filter(
    (t) =>
      t.status !== 'INACTIVE' &&
      (!t.salesEnd || new Date(t.salesEnd) > new Date()) &&
      (!t.salesStart || new Date(t.salesStart) <= new Date())
  )

  // ── For GA: build slot list from qty selectors ──
  const gaSlots: GABundle[] = Object.entries(gaSelections)
    .filter(([, q]) => q > 0)
    .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))

  const totalGATickets = gaSlots.reduce((sum, b) => sum + b.quantity, 0)

  const totalReservedSeats = selectedSeatIds.length

  const totalSlots = isReserved ? totalReservedSeats : totalGATickets
  const canCreate = totalSlots > 0 && !isPending

  // GA total price estimate
  const gaTotal = gaSlots.reduce((sum, b) => {
    const tt = event.ticketTypes.find((t) => t.id === b.ticketTypeId)
    return sum + (tt?.price ?? 0) * b.quantity
  }, 0)

  function updateGA(ticketTypeId: string, delta: number) {
    setGaSelections((prev) => {
      const current = prev[ticketTypeId] ?? 0
      const tt = event.ticketTypes.find((t) => t.id === ticketTypeId)
      const available = tt ? (tt.quantity === null ? 99 : tt.quantity - tt.sold) : 0
      const next = Math.max(0, Math.min(available, current + delta))
      if (next === 0) {
        const { [ticketTypeId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [ticketTypeId]: next }
    })
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createGroupOrder({
        eventId: event.id,
        reservedSlots: isReserved ? selectedSeatIds.map((id) => ({ eventSeatId: id })) : [],
        gaSlots: !isReserved ? gaSlots : [],
        requireFullPayment,
        ttlMinutes,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Redirect to the shareable group join page
      router.push(`/group/${result.code}`)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-brand-500/10 flex h-8 w-8 items-center justify-center rounded-lg">
          <Users className="text-brand-400 h-4 w-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold">Group Booking</p>
          <p className="text-muted-foreground text-[11.5px]">Everyone pays for their own seat</p>
        </div>
      </div>

      {/* ── GA: ticket qty selectors ── */}
      {!isReserved && (
        <div className="space-y-2.5">
          <p className="text-[12px] font-medium text-zinc-400">Select tickets for your group</p>
          {activeTypes.length === 0 && (
            <p className="text-muted-foreground text-[13px]">No tickets available.</p>
          )}
          {activeTypes.map((tt) => {
            const available = tt.quantity === null ? null : tt.quantity - tt.sold
            const isSoldOut = available !== null && available <= 0
            const qty = gaSelections[tt.id] ?? 0

            return (
              <div
                key={tt.id}
                className={cn(
                  'border-border flex items-center justify-between rounded-xl border p-3',
                  qty > 0 && 'border-brand-500/40 bg-brand-500/5',
                  isSoldOut && 'opacity-40'
                )}
              >
                <div>
                  <p className="text-[13px] font-semibold">{tt.name}</p>
                  <p className="text-brand-400 text-[12px] font-bold">
                    {tt.price === 0 ? 'Free' : formatPrice(tt.price, tt.currency)}
                  </p>
                </div>

                {!isSoldOut && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateGA(tt.id, -1)}
                      disabled={qty === 0}
                      aria-label={`Remove one ${tt.name}`}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                        qty === 0
                          ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-[14px] font-semibold tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={() => updateGA(tt.id, 1)}
                      disabled={available !== null && qty >= available}
                      aria-label={`Add one ${tt.name}`}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                        available !== null && qty >= available
                          ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {totalGATickets > 0 && (
            <div className="border-border/60 flex items-center justify-between border-t pt-3 text-[13px]">
              <span className="text-muted-foreground">
                {totalGATickets} ticket{totalGATickets !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold">
                {gaTotal === 0 ? 'Free' : formatPrice(gaTotal)} total
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Reserved: seat summary ── */}
      {isReserved && (
        <div
          className={cn(
            'border-border rounded-xl border p-3.5',
            totalReservedSeats > 0 ? 'border-brand-500/40 bg-brand-500/5' : 'bg-muted/30'
          )}
        >
          {totalReservedSeats === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No seats selected.{' '}
              <a href={`/events/${event.slug}/seats`} className="text-brand-400 underline">
                Choose seats
              </a>{' '}
              first, then start a group.
            </p>
          ) : (
            <p className="text-[13px] font-medium">
              <span className="text-brand-400 font-bold">{totalReservedSeats}</span> seat
              {totalReservedSeats !== 1 ? 's' : ''} selected — one slot per seat
            </p>
          )}
        </div>
      )}

      {/* ── Deadline ── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Clock className="text-muted-foreground h-3.5 w-3.5" />
          <p className="text-[12px] font-medium text-zinc-400">Payment deadline</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {TTL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTtlMinutes(opt.value)}
              className={cn(
                'rounded-lg border py-1.5 text-[12px] font-semibold transition-all',
                ttlMinutes === opt.value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-border text-muted-foreground hover:border-zinc-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          Members must pay within this window or their slot is released
        </p>
      </div>

      {/* ── Payment mode ── */}
      <div>
        <button
          onClick={() => setRequireFullPayment((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent p-1 text-left transition-colors hover:border-zinc-700"
          aria-pressed={requireFullPayment}
        >
          <div>
            <p className="text-[13px] font-semibold">All-or-nothing</p>
            <p className="text-muted-foreground text-[11.5px]">
              {requireFullPayment
                ? 'If not everyone pays, paid slots are refunded'
                : 'Paid slots are confirmed even if others drop out'}
            </p>
          </div>
          {requireFullPayment ? (
            <ToggleRight className="text-brand-400 h-6 w-6 shrink-0" />
          ) : (
            <ToggleLeft className="text-muted-foreground h-6 w-6 shrink-0" />
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-400">{error}</p>
      )}

      {/* ── Create CTA ── */}
      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-all',
          canCreate
            ? 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating group…
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            {totalSlots === 0
              ? 'Select tickets first'
              : `Create group · ${totalSlots} slot${totalSlots !== 1 ? 's' : ''}`}
          </>
        )}
      </button>

      <p className="text-muted-foreground text-center text-[11px]">
        You&apos;ll get a shareable link to send to your group
      </p>
    </div>
  )
}
