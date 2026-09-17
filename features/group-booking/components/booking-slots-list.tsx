'use client'

import { ChevronDown, User, Users, Clock } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { GroupSlot } from '../types'

interface BookingSlotsListProps {
  slots: GroupSlot[]
  totalSlots: number
  totalAmount: number
}

const SLOT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'text-emerald-400' },
  HELD: { label: 'Claimed', color: 'text-amber-400' },
  PAID: { label: 'Paid', color: 'text-brand-400' },
  RELEASED: { label: 'Released', color: 'text-zinc-400' },
}

export function BookingSlotsList({ slots, totalSlots, totalAmount }: BookingSlotsListProps) {
  const [expanded, setExpanded] = useState(false)

  const paidSlots = slots.filter((s) => s.status === 'PAID')
  const heldSlots = slots.filter((s) => s.status === 'HELD')
  const openSlots = slots.filter((s) => s.status === 'OPEN')
  const releasedSlots = slots.filter((s) => s.status === 'RELEASED')

  const totalPrice = (totalAmount / 100).toFixed(2) // Convert from kobo to naira
  const pricePerSlot = totalAmount / totalSlots / 100

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center justify-between transition-colors hover:text-zinc-100"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium">Group Slots</span>
          <span className="text-xs text-zinc-500">({totalSlots} total)</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-300', expanded && 'rotate-180')}
        />
      </button>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-zinc-900 p-2">
          <div className="text-[10px] text-zinc-500">Paid</div>
          <div className="text-sm font-semibold text-emerald-400">{paidSlots.length}</div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-2">
          <div className="text-[10px] text-zinc-500">Pending</div>
          <div className="text-sm font-semibold text-amber-400">{heldSlots.length + openSlots.length}</div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-2">
          <div className="text-[10px] text-zinc-500">Total</div>
          <div className="text-sm font-semibold text-zinc-300">₦{totalPrice}</div>
        </div>
      </div>

      {/* Expanded slots list */}
      {expanded && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          {slots.length === 0 ? (
            <div className="text-center text-xs text-zinc-500">No slots</div>
          ) : (
            slots.map((slot, idx) => {
              const statusCfg = SLOT_STATUS_CONFIG[slot.status]
              const seatInfo = slot.seat
                ? `${slot.seat.rowLabel ? `Row ${slot.seat.rowLabel}` : ''} Seat ${slot.seat.label}`.trim()
                : null

              return (
                <div
                  key={slot.id}
                  className="flex items-start justify-between rounded-lg bg-zinc-900/50 px-3 py-2.5"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-zinc-400">Slot {idx + 1}</span>
                      <span className={cn('text-[10px] font-semibold', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Ticket type or seat info */}
                    <div className="text-xs text-zinc-300">
                      {seatInfo && <div>{seatInfo}</div>}
                      {slot.ticketTypeName && <div>{slot.ticketTypeName}</div>}
                      {slot.label && <div className="text-[10px] italic text-zinc-500">"{slot.label}"</div>}
                    </div>

                    {/* Claimer info */}
                    {slot.claimer && (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <User className="h-3 w-3" />
                        <span>{slot.claimer.name || 'Anonymous'}</span>
                        {slot.claimedAt && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span>{format(slot.claimedAt, 'MMM d, h:mm a')}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xs font-semibold text-zinc-300">₦{pricePerSlot.toFixed(2)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
