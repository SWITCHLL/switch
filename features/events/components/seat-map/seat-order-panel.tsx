'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '../../utils'
import type { EventDetail, SelectedSeat } from '../../types'

interface SeatOrderPanelProps {
  event: EventDetail
  selectedSeats: SelectedSeat[]
  onRemove: (eventSeatId: string) => void
  onCheckout: () => void
  maxSeats: number
}

export function SeatOrderPanel({
  event,
  selectedSeats,
  onRemove,
  onCheckout,
  maxSeats,
}: SeatOrderPanelProps) {
  const total = selectedSeats.reduce((sum, s) => sum + s.price, 0)
  const count = selectedSeats.length

  // Group by ticket type for a cleaner summary
  const byType = selectedSeats.reduce<Record<string, { name: string; seats: SelectedSeat[] }>>(
    (acc, s) => {
      if (!acc[s.ticketTypeId]) {
        acc[s.ticketTypeId] = { name: s.ticketTypeName, seats: [] }
      }
      acc[s.ticketTypeId]!.seats.push(s)
      return acc
    },
    {}
  )

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Your Selection</h2>
        {count > 0 && (
          <span className="bg-brand-600/15 text-brand-500 rounded-full px-2 py-0.5 text-[11.5px] font-semibold">
            {count}/{maxSeats}
          </span>
        )}
      </div>

      {/* Max seats hint */}
      {count >= maxSeats && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-[12px] font-medium text-amber-600">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Maximum {maxSeats} seats per order
        </div>
      )}

      {/* Empty state */}
      {count === 0 && (
        <div className="py-8 text-center">
          <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <ShoppingCart className="text-muted-foreground h-5 w-5" />
          </div>
          <p className="text-muted-foreground text-[13px]">
            Click on an available seat to select it
          </p>
        </div>
      )}

      {/* Selected seats list */}
      <AnimatePresence initial={false}>
        {Object.values(byType).map((group) => (
          <div key={group.name} className="mb-3">
            <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {group.name}
            </p>
            <div className="space-y-1.5">
              {group.seats.map((seat) => (
                <motion.div
                  key={seat.eventSeatId}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="border-border flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">
                      {seat.sectionName} · Row {seat.rowLabel} · {seat.seatLabel}
                    </p>
                    <p className="text-brand-500 text-[12px] font-medium">
                      {seat.price === 0 ? 'Free' : formatPrice(seat.price, seat.currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(seat.eventSeatId)}
                    aria-label={`Remove seat ${seat.seatLabel}`}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted ml-2 shrink-0 rounded-md p-1 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>

      {/* Order total */}
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-border/60 mt-4 border-t pt-4"
        >
          <div className="mb-1 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">
              {count} seat{count !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold">{total === 0 ? 'Free' : formatPrice(total)}</span>
          </div>
          <p className="text-muted-foreground text-[11px]">Taxes and fees calculated at checkout</p>
        </motion.div>
      )}

      {/* CTA */}
      <div className="mt-4">
        <button
          onClick={onCheckout}
          disabled={count === 0}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3',
            'text-[14px] font-semibold text-white transition-all duration-200',
            count > 0
              ? 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {count === 0 ? 'Select seats to continue' : 'Continue to checkout'}
        </button>
      </div>

      <p className="text-muted-foreground mt-3 text-center text-[11px]">
        Seats are held for 10 minutes during checkout
      </p>
    </div>
  )
}
