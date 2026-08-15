'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingCart, Lock, AlertCircle, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, getMinPrice } from '../utils'
import type { EventDetail } from '../types'
import { format } from 'date-fns'

interface TicketSelectorProps {
  event: EventDetail
  minPrice: number | null
  soldOut: boolean
  isLoggedIn: boolean
}

export function TicketSelector({ event, minPrice, soldOut, isLoggedIn }: TicketSelectorProps) {
  const isReserved = event.seatingType === 'RESERVED' || event.seatingType === 'MIXED'

  const salesNotStarted = Boolean(event.salesStart && new Date(event.salesStart) > new Date())
  const salesEnded = Boolean(event.salesEnd && new Date(event.salesEnd) < new Date())
  const unavailable = soldOut || salesEnded || salesNotStarted

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <h2 className="mb-4 text-[15px] font-semibold">Get Tickets</h2>

      {/* Sales window notices */}
      {salesNotStarted && (
        <Notice icon={AlertCircle} variant="info">
          Sales open {format(event.salesStart!, 'MMM d, yyyy')} at{' '}
          {format(event.salesStart!, 'h:mm a')}
        </Notice>
      )}
      {salesEnded && (
        <Notice icon={AlertCircle} variant="warning">
          Ticket sales have ended for this event.
        </Notice>
      )}
      {soldOut && (
        <Notice icon={AlertCircle} variant="error">
          This event is sold out.
        </Notice>
      )}

      {/* ── Reserved / Mixed: show pricing summary + seat map CTA ── */}
      {isReserved && !unavailable && (
        <ReservedTicketSummary event={event} isLoggedIn={isLoggedIn} />
      )}

      {/* ── General Admission: quantity pickers ── */}
      {!isReserved && !unavailable && <GATicketSelector event={event} isLoggedIn={isLoggedIn} />}

      {/* Unavailable CTA */}
      {unavailable && (
        <button
          disabled
          className="border-border text-muted-foreground mt-2 w-full cursor-not-allowed rounded-xl border py-3 text-[14px] font-semibold"
        >
          {soldOut ? 'Sold Out' : salesEnded ? 'Sales Ended' : 'Sales Not Open Yet'}
        </button>
      )}

      <p className="text-muted-foreground mt-3 text-center text-[11px]">
        Secure checkout · Instant confirmation
      </p>
    </div>
  )
}

// ─── Reserved: pricing tiers + "Choose seats" button ─────────────────────────

function ReservedTicketSummary({ event, isLoggedIn }: { event: EventDetail; isLoggedIn: boolean }) {
  const activeTypes = event.ticketTypes.filter(
    (t) =>
      t.status !== 'INACTIVE' &&
      (!t.salesEnd || new Date(t.salesEnd) > new Date()) &&
      (!t.salesStart || new Date(t.salesStart) <= new Date())
  )

  return (
    <div className="space-y-3">
      {/* Ticket type pricing overview */}
      {activeTypes.map((tt) => {
        const available = tt.quantity === null ? null : tt.quantity - tt.sold
        const soldOut = available !== null && available <= 0
        return (
          <div
            key={tt.id}
            className={cn(
              'border-border flex items-center justify-between rounded-xl border px-3.5 py-3',
              soldOut && 'opacity-50'
            )}
          >
            <div>
              <p className="text-[13.5px] font-semibold">{tt.name}</p>
              {available !== null && available <= 20 && available > 0 && (
                <p className="mt-0.5 text-[11px] text-amber-600">Only {available} left</p>
              )}
              {soldOut && <p className="mt-0.5 text-[11px] text-red-500">Sold out</p>}
            </div>
            <p className="text-brand-500 text-[14px] font-bold">
              {tt.price === 0 ? 'Free' : formatPrice(tt.price, tt.currency)}
            </p>
          </div>
        )
      })}

      {/* Choose seats CTA */}
      <div className="pt-1">
        {!isLoggedIn ? (
          <Link
            href={`/login?redirect=/events/${event.slug}/seats`}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-opacity hover:opacity-90',
              'from-brand-600 bg-gradient-to-r to-violet-600'
            )}
          >
            <Lock className="h-4 w-4" />
            Sign in to choose seats
          </Link>
        ) : (
          <Link
            href={`/events/${event.slug}/seats`}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-opacity hover:opacity-90',
              'from-brand-600 bg-gradient-to-r to-violet-600'
            )}
          >
            <Map className="h-4 w-4" />
            Choose your seats
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── General Admission: quantity steppers ─────────────────────────────────────

function GATicketSelector({ event, isLoggedIn }: { event: EventDetail; isLoggedIn: boolean }) {
  const [selections, setSelections] = useState<Record<string, number>>({})

  const activeTypes = event.ticketTypes.filter(
    (t) =>
      t.status !== 'INACTIVE' &&
      (!t.salesEnd || new Date(t.salesEnd) > new Date()) &&
      (!t.salesStart || new Date(t.salesStart) <= new Date())
  )

  const totalItems = Object.values(selections).reduce((sum, q) => sum + q, 0)
  const totalPrice = Object.entries(selections).reduce((sum, [id, qty]) => {
    const tt = event.ticketTypes.find((t) => t.id === id)
    return sum + (tt?.price ?? 0) * qty
  }, 0)

  const updateQty = (ticketTypeId: string, delta: number) => {
    setSelections((prev) => {
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

  if (!activeTypes.length) {
    return <p className="text-muted-foreground text-[13px]">No tickets are currently on sale.</p>
  }

  return (
    <div className="space-y-3">
      {activeTypes.map((tt) => {
        const available = tt.quantity === null ? null : tt.quantity - tt.sold
        const isTicketSoldOut = available !== null && available <= 0
        const qty = selections[tt.id] ?? 0

        return (
          <div
            key={tt.id}
            className={cn(
              'border-border rounded-xl border p-3.5 transition-colors',
              qty > 0 && 'border-brand-500/50 bg-brand-500/5',
              isTicketSoldOut && 'opacity-50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{tt.name}</p>
                {tt.description && (
                  <p className="text-muted-foreground mt-0.5 text-[12px]">{tt.description}</p>
                )}
                <p className="text-brand-500 mt-1 text-[14px] font-bold">
                  {tt.price === 0 ? 'Free' : formatPrice(tt.price, tt.currency)}
                </p>
                {available !== null && available <= 20 && available > 0 && (
                  <p className="mt-0.5 text-[11px] text-amber-600">Only {available} left</p>
                )}
                {isTicketSoldOut && <p className="mt-0.5 text-[11px] text-red-500">Sold out</p>}
              </div>

              {!isTicketSoldOut && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => updateQty(tt.id, -1)}
                    disabled={qty === 0}
                    aria-label={`Remove one ${tt.name}`}
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
                    onClick={() => updateQty(tt.id, 1)}
                    disabled={available !== null && qty >= available}
                    aria-label={`Add one ${tt.name}`}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                      available !== null && qty >= available
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

      {/* Order summary */}
      {totalItems > 0 && (
        <div className="border-border/60 border-t pt-4">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-muted-foreground">
              {totalItems} ticket{totalItems !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold">
              {totalPrice === 0 ? 'Free' : formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="pt-1">
        {!isLoggedIn ? (
          <Link
            href={`/login?redirect=/events/${event.slug}`}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-opacity hover:opacity-90',
              'from-brand-600 bg-gradient-to-r to-violet-600'
            )}
          >
            <Lock className="h-4 w-4" />
            Sign in to buy tickets
          </Link>
        ) : (
          <button
            disabled={totalItems === 0}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3',
              'text-[14px] font-semibold text-white transition-all',
              totalItems > 0
                ? 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            // TODO: wire to checkout flow
          >
            <ShoppingCart className="h-4 w-4" />
            {totalItems === 0 ? 'Select tickets' : 'Continue to checkout'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Notice ───────────────────────────────────────────────────────────────────

function Notice({
  icon: Icon,
  variant,
  children,
}: {
  icon: React.ElementType
  variant: 'info' | 'warning' | 'error'
  children: React.ReactNode
}) {
  const styles = {
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    error: 'bg-red-500/10 text-red-600 border-red-500/20',
  }
  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium',
        styles[variant]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </div>
  )
}
