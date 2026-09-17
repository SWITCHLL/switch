'use client'

/**
 * TimeSlotSelector — legacy single-slot selector.
 * For multi-show / per-tier selection, use ShowSelector instead.
 */

import { useState, useTransition } from 'react'
import { reserveTimeSlots } from '../actions'
import type { TimeSlotWithAvailability } from '../types'

interface TimeSlotSelectorProps {
  eventId:     string
  slots:       TimeSlotWithAvailability[]
  onReserved?: (result: { reservationId: string; expiresAt: Date }) => void
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtPrice(kobo: number, currency = 'NGN') {
  if (kobo === 0) return 'Free'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 })
    .format(kobo / 100)
}

export function TimeSlotSelector({ eventId, slots, onReserved }: TimeSlotSelectorProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedSlot   = slots.find((s) => s.id === selectedSlotId) ?? null
  const selectedCapacity = selectedSlot?.capacities.find((c) => c.ticketTypeId === selectedTicketTypeId) ?? null

  function handleSelectSlot(slot: TimeSlotWithAvailability) {
    if (slot.isSoldOut) return
    setSelectedSlotId(slot.id)
    // Auto-select first available tier
    const firstAvail = slot.capacities.find((c) => c.available > 0)
    setSelectedTicketTypeId(firstAvail?.ticketTypeId ?? null)
    setQuantity(1)
    setError(null)
  }

  function handleReserve() {
    if (!selectedSlotId || !selectedTicketTypeId) return
    startTransition(async () => {
      setError(null)
      const result = await reserveTimeSlots({
        eventId,
        selections: [{ timeSlotId: selectedSlotId, ticketTypeId: selectedTicketTypeId, quantity }],
      })
      if (!result.success) { setError(result.error); return }
      onReserved?.({ reservationId: result.reservationId, expiresAt: result.expiresAt })
    })
  }

  if (slots.length === 0) {
    return <p className="text-sm text-zinc-500">No time slots available.</p>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-200">Select a show</h3>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Available shows">
        {slots.map((slot) => {
          const isSoldOut  = slot.isSoldOut
          const isSelected = selectedSlotId === slot.id
          const totalAvail = slot.capacities.reduce((s, c) => s + c.available, 0)
          const minPrice   = slot.capacities.reduce((min, c) => Math.min(min, c.price), Infinity)
          const currency   = slot.capacities[0]?.currency ?? 'NGN'

          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isSoldOut}
              disabled={isSoldOut || isPending}
              onClick={() => handleSelectSlot(slot)}
              className={[
                'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all',
                isSoldOut ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-50'
                  : isSelected ? 'border-violet-500 bg-violet-500/10'
                  : 'cursor-pointer border-zinc-700 bg-zinc-900 hover:border-zinc-500',
              ].join(' ')}
            >
              <span className="text-sm font-semibold text-zinc-100">{slot.label}</span>
              <span className="text-xs text-zinc-400">{fmtDate(slot.startsAt)}</span>
              <span className="text-xs text-zinc-300">{fmtTime(slot.startsAt)} – {fmtTime(slot.endsAt)}</span>
              {minPrice !== Infinity && (
                <span className="text-sm font-medium text-zinc-100">
                  from {fmtPrice(minPrice, currency)}
                </span>
              )}
              <span className={`text-xs ${isSoldOut ? 'text-red-400' : totalAvail <= 5 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {isSoldOut ? 'Sold out' : `${totalAvail} spots left`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tier + quantity picker */}
      {selectedSlot && (
        <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          {selectedSlot.capacities.length > 1 && (
            <div>
              <p className="mb-2 text-xs text-zinc-400">Ticket type</p>
              <div className="space-y-1.5">
                {selectedSlot.capacities.map((cap) => (
                  <button
                    key={cap.ticketTypeId}
                    type="button"
                    disabled={cap.available === 0 || isPending}
                    onClick={() => { setSelectedTicketTypeId(cap.ticketTypeId); setQuantity(1) }}
                    className={[
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all',
                      selectedTicketTypeId === cap.ticketTypeId
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-zinc-700 hover:border-zinc-500',
                      cap.available === 0 ? 'cursor-not-allowed opacity-50' : '',
                    ].join(' ')}
                  >
                    <span className="font-medium text-zinc-100">{cap.ticketTypeName}</span>
                    <span className="text-zinc-300">{fmtPrice(cap.price, cap.currency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCapacity && (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={quantity <= 1 || isPending}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
                >−</button>
                <span className="w-8 text-center text-sm font-medium text-zinc-100">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= selectedCapacity.available || isPending}
                  onClick={() => setQuantity((q) => Math.min(selectedCapacity.available, q + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
                >+</button>
              </div>
              <button
                type="button"
                onClick={handleReserve}
                disabled={isPending}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {isPending ? 'Reserving…' : 'Reserve'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
