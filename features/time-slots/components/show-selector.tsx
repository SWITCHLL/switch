'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, ShoppingCart, Lock, CheckCircle2, X, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeSlotWithAvailability } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShowSelectorSlot extends TimeSlotWithAvailability {
  // inherits id, label, startsAt, endsAt, status, capacities, isSoldOut
}

interface CartEntry {
  timeSlotId:   string
  ticketTypeId: string
  quantity:     number
  price:        number
  currency:     string
  showLabel:    string
  tierName:     string
}

interface ShowSelectorProps {
  eventSlug:   string
  timeSlots:   ShowSelectorSlot[]
  isLoggedIn:  boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-NG', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  })
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-NG', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function fmtPrice(kobo: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100)
}

function cartKey(timeSlotId: string, ticketTypeId: string) {
  return `${timeSlotId}::${ticketTypeId}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShowSelector({ eventSlug, timeSlots, isLoggedIn }: ShowSelectorProps) {
  const router = useRouter()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    timeSlots.length > 0 ? timeSlots[0]!.id : null
  )
  // cart: key = "slotId::ticketTypeId" → CartEntry
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map())

  const selectedSlot = timeSlots.find((s) => s.id === selectedSlotId) ?? null

  // ── Cart helpers ────────────────────────────────────────────────────────────

  function adjustQty(slot: ShowSelectorSlot, ticketTypeId: string, delta: number) {
    const cap  = slot.capacities.find((c) => c.ticketTypeId === ticketTypeId)
    if (!cap) return

    const key     = cartKey(slot.id, ticketTypeId)
    const current = cart.get(key)?.quantity ?? 0
    const next    = Math.max(0, Math.min(cap.available, current + delta))

    setCart((prev) => {
      const next_ = new Map(prev)
      if (next === 0) {
        next_.delete(key)
      } else {
        next_.set(key, {
          timeSlotId:   slot.id,
          ticketTypeId,
          quantity:     next,
          price:        cap.price,
          currency:     cap.currency,
          showLabel:    slot.label,
          tierName:     cap.ticketTypeName,
        })
      }
      return next_
    })
  }

  function removeCartEntry(key: string) {
    setCart((prev) => { const m = new Map(prev); m.delete(key); return m })
  }

  // ── Derived totals ──────────────────────────────────────────────────────────

  const cartEntries  = Array.from(cart.values())
  const totalTickets = cartEntries.reduce((s, e) => s + e.quantity, 0)
  const totalPrice   = cartEntries.reduce((s, e) => s + e.price * e.quantity, 0)
  const isFree       = totalPrice === 0

  // ── Checkout navigation ─────────────────────────────────────────────────────

  function handleCheckout() {
    if (totalTickets === 0) return
    // Encode as: slotId:ticketTypeId:qty pairs, joined by comma
    const param = cartEntries
      .map((e) => `${e.timeSlotId}:${e.ticketTypeId}:${e.quantity}`)
      .join(',')
    router.push(`/events/${eventSlug}/checkout?shows=${encodeURIComponent(param)}`)
  }

  if (timeSlots.length === 0) {
    return (
      <p className="text-muted-foreground text-[13px]">
        No shows are currently scheduled for this event.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Show picker ── */}
      <div>
        <p className="mb-2 text-[11.5px] font-semibold tracking-wide text-zinc-400 uppercase">
          Select a Show
        </p>
        <div className="grid gap-2">
          {timeSlots.map((slot) => {
            const isSelected = slot.id === selectedSlotId
            const hasInCart  = cartEntries.some((e) => e.timeSlotId === slot.id)

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                disabled={slot.isSoldOut}
                className={cn(
                  'relative flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                  isSelected
                    ? 'border-brand-500 bg-brand-500/8'
                    : 'border-border hover:border-brand-500/50 bg-surface',
                  slot.isSoldOut && 'cursor-not-allowed opacity-50'
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isSelected ? 'text-brand-500' : 'text-muted-foreground'
                    )}
                  />
                  <div>
                    <p className="text-[13px] font-semibold">{slot.label}</p>
                    <p className="text-muted-foreground text-[11.5px]">
                      {fmtDate(slot.startsAt)} · {fmtTime(slot.startsAt)} – {fmtTime(slot.endsAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {slot.isSoldOut && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-red-500">
                      Sold out
                    </span>
                  )}
                  {hasInCart && !slot.isSoldOut && (
                    <CheckCircle2 className="text-brand-500 h-4 w-4" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Ticket tier picker for selected show ── */}
      {selectedSlot && !selectedSlot.isSoldOut && (
        <div>
          <p className="mb-2 text-[11.5px] font-semibold tracking-wide text-zinc-400 uppercase">
            Ticket Type
          </p>
          <div className="space-y-2">
            {selectedSlot.capacities.map((cap) => {
              const key          = cartKey(selectedSlot.id, cap.ticketTypeId)
              const qty          = cart.get(key)?.quantity ?? 0
              const isTierSoldOut = cap.available === 0

              return (
                <div
                  key={cap.ticketTypeId}
                  className={cn(
                    'border-border rounded-xl border p-3.5 transition-colors',
                    qty > 0 && 'border-brand-500/50 bg-brand-500/5',
                    isTierSoldOut && 'opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold">{cap.ticketTypeName}</p>
                      <p className="text-brand-500 mt-0.5 text-[13px] font-bold">
                        {cap.price === 0 ? 'Free' : fmtPrice(cap.price, cap.currency)}
                      </p>
                      {!isTierSoldOut && cap.available <= 20 && (
                        <p className="mt-0.5 text-[11px] text-amber-500">
                          Only {cap.available} left
                        </p>
                      )}
                      {isTierSoldOut && (
                        <p className="mt-0.5 text-[11px] text-red-500">Sold out</p>
                      )}
                    </div>

                    {!isTierSoldOut && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQty(selectedSlot, cap.ticketTypeId, -1)}
                          disabled={qty === 0}
                          aria-label={`Remove ${cap.ticketTypeName}`}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                            qty === 0
                              ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                              : 'border-border text-foreground hover:bg-muted'
                          )}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-[14px] font-semibold tabular-nums">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQty(selectedSlot, cap.ticketTypeId, 1)}
                          disabled={qty >= cap.available}
                          aria-label={`Add ${cap.ticketTypeName}`}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                            qty >= cap.available
                              ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                              : 'border-border text-foreground hover:bg-muted'
                          )}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Cart summary ── */}
      {cartEntries.length > 0 && (
        <div className="border-border rounded-xl border">
          <div className="border-border border-b px-4 py-2.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-zinc-400 uppercase">
              Your Order
            </p>
          </div>
          <div className="divide-border divide-y px-4">
            {cartEntries.map((entry) => {
              const key = cartKey(entry.timeSlotId, entry.ticketTypeId)
              return (
                <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">
                      {entry.showLabel} — {entry.tierName}
                    </p>
                    <p className="text-muted-foreground text-[11.5px]">
                      {entry.quantity} × {fmtPrice(entry.price, entry.currency)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[13px] font-semibold">
                      {fmtPrice(entry.price * entry.quantity, entry.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCartEntry(key)}
                      aria-label="Remove"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-border flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-[13px] text-zinc-400">
              {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
            </span>
            <span className="text-[14px] font-bold">
              {isFree ? 'Free' : fmtPrice(totalPrice)}
            </span>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div>
        {!isLoggedIn ? (
          <a
            href={`/login?redirect=/events/${eventSlug}`}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-opacity hover:opacity-90',
              'from-brand-600 bg-gradient-to-r to-violet-600'
            )}
          >
            <Lock className="h-4 w-4" />
            Sign in to buy tickets
          </a>
        ) : (
          <button
            type="button"
            disabled={totalTickets === 0}
            onClick={handleCheckout}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-all',
              totalTickets > 0
                ? 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {totalTickets === 0 ? 'Select tickets' : 'Continue to checkout'}
          </button>
        )}
      </div>

      <p className="text-muted-foreground text-center text-[11px]">
        Secure checkout · Instant confirmation
      </p>
    </div>
  )
}
