'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPrice } from '../../utils'
import type { EventDetail, SectionData, SelectedSeat } from '../../types'
import { SeatButton } from './seat-button'

interface SeatMapGridProps {
  section: SectionData
  event: EventDetail
  selectedSeats: SelectedSeat[]
  onToggleSeat: (seat: SelectedSeat) => void
  maxSeats: number
}

export function SeatMapGrid({
  section,
  event,
  selectedSeats,
  onToggleSeat,
  maxSeats,
}: SeatMapGridProps) {
  const selectedIds = new Set(selectedSeats.map((s) => s.eventSeatId))
  const atMax = selectedSeats.length >= maxSeats

  // For GA sections — show capacity info instead of individual seats
  if (section.type === 'GENERAL_ADMISSION') {
    return <GASectionDisplay section={section} event={event} />
  }

  if (!section.rows.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-[13px]">
        No seats configured for this section.
      </p>
    )
  }

  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-foreground text-[12px] font-semibold tracking-widest uppercase">
          {section.name}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Scrollable grid container */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {section.rows.map((row) => (
            <div key={row.id} className="mb-1.5 flex items-center gap-2">
              {/* Row label */}
              <span className="text-muted-foreground w-6 shrink-0 text-center text-[11px] font-semibold tabular-nums">
                {row.label}
              </span>

              {/* Seats */}
              <div className="flex flex-wrap gap-1">
                {row.seats.map((seat) => {
                  const eventSeat = seat.eventSeats[0]
                  if (!eventSeat) return null

                  const isSelected = selectedIds.has(eventSeat.id)
                  const status = eventSeat.status as string

                  // Find the matching ticket type for display
                  const ticketType =
                    event.ticketTypes.find(
                      (tt) =>
                        // EventSeat price matches ticket type price (or fallback to first)
                        tt.price === eventSeat.price
                    ) ?? event.ticketTypes[0]

                  return (
                    <SeatButton
                      key={seat.id}
                      seatId={seat.id}
                      label={seat.label}
                      status={status}
                      price={eventSeat.price}
                      seatType={seat.type}
                      isSelected={isSelected}
                      isDisabled={(status !== 'AVAILABLE' && !isSelected) || (atMax && !isSelected)}
                      onClick={() => {
                        if (!ticketType) return
                        onToggleSeat({
                          eventSeatId: eventSeat.id,
                          seatId: seat.id,
                          seatLabel: seat.label,
                          sectionName: section.name,
                          rowLabel: row.label,
                          ticketTypeId: ticketType.id,
                          ticketTypeName: ticketType.name,
                          price: eventSeat.price,
                          currency: ticketType.currency,
                        })
                      }}
                    />
                  )
                })}
              </div>

              {/* Row label (right side mirror) */}
              <span className="text-muted-foreground w-6 shrink-0 text-center text-[11px] font-semibold tabular-nums">
                {row.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── General admission section ────────────────────────────────────────────────

function GASectionDisplay({ section, event }: { section: SectionData; event: EventDetail }) {
  const gaTicketTypes = event.ticketTypes.filter(
    (tt) =>
      tt.status !== 'INACTIVE' &&
      (!tt.salesEnd || new Date(tt.salesEnd) > new Date()) &&
      (!tt.salesStart || new Date(tt.salesStart) <= new Date())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-8"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-foreground text-[12px] font-semibold tracking-widest uppercase">
          {section.name} — General Admission
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      <div className="bg-muted/30 border-border rounded-2xl border p-6 text-center">
        <p className="text-muted-foreground text-[13px]">Open standing area — no assigned seats.</p>
        {section.capacity && (
          <p className="text-muted-foreground mt-1 text-[12px]">
            Capacity: {section.capacity.toLocaleString()}
          </p>
        )}
        {gaTicketTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {gaTicketTypes.map((tt) => (
              <span
                key={tt.id}
                className="border-border bg-surface rounded-lg border px-3 py-1.5 text-[12px] font-medium"
              >
                {tt.name} —{' '}
                <span className="text-brand-500 font-semibold">
                  {tt.price === 0 ? 'Free' : formatPrice(tt.price, tt.currency)}
                </span>
              </span>
            ))}
          </div>
        )}
        <p className="text-muted-foreground mt-4 text-[12px]">
          Select ticket quantity on the order panel →
        </p>
      </div>
    </motion.div>
  )
}
