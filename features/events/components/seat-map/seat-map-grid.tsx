'use client'

import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  // refs[rowIndex][seatIndex] → button element
  const buttonRefs = useRef<(HTMLButtonElement | null)[][]>([])

  const selectedIds = new Set(selectedSeats.map((s) => s.eventSeatId))
  const atMax = selectedSeats.length >= maxSeats

  const focusSeat = useCallback((rowIdx: number, seatIdx: number) => {
    const rows = buttonRefs.current
    const row = rows[rowIdx]
    if (!row) return
    // Find next available button in that row (skip nulls)
    const btn = row[seatIdx]
    if (btn) {
      btn.focus()
    }
  }, [])

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

  // Build a flat list of [rowIdx, seatIdx] for each visible seat (for up/down nav)
  // rowSeats[rowIdx] = number of rendered seats in that row
  const rowSeatCounts = section.rows.map((row) => row.seats.filter((s) => s.eventSeats[0]).length)

  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
      role="group"
      aria-label={`${section.name} seating section`}
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
          {section.rows.map((row, rowIdx) => {
            // Ensure refs array is sized
            if (!buttonRefs.current[rowIdx]) {
              buttonRefs.current[rowIdx] = []
            }

            const visibleSeats = row.seats.filter((s) => s.eventSeats[0])

            return (
              <div
                key={row.id}
                className="mb-1.5 flex items-center gap-2"
                role="row"
                aria-label={`Row ${row.label}`}
              >
                {/* Row label */}
                <span
                  className="text-muted-foreground w-6 shrink-0 text-center text-[11px] font-semibold tabular-nums"
                  aria-hidden="true"
                >
                  {row.label}
                </span>

                {/* Seats */}
                <div className="flex flex-wrap gap-1" role="group">
                  {visibleSeats.map((seat, seatIdx) => {
                    const eventSeat = seat.eventSeats[0]
                    if (!eventSeat) return null

                    const isSelected = selectedIds.has(eventSeat.id)
                    const status = eventSeat.status as string

                    // Match ticket type by ticketTypeId on the EventSeat, then fall back to price match
                    const ticketType =
                      event.ticketTypes.find(
                        (tt) => tt.price === eventSeat.price
                      ) ?? event.ticketTypes[0]

                    return (
                      <SeatButton
                        key={seat.id}
                        ref={(el) => {
                          if (!buttonRefs.current[rowIdx]) buttonRefs.current[rowIdx] = []
                          buttonRefs.current[rowIdx]![seatIdx] = el
                        }}
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
                        // ── Arrow key navigation ──
                        onArrowLeft={() => {
                          if (seatIdx > 0) focusSeat(rowIdx, seatIdx - 1)
                        }}
                        onArrowRight={() => {
                          if (seatIdx < (rowSeatCounts[rowIdx] ?? 0) - 1)
                            focusSeat(rowIdx, seatIdx + 1)
                        }}
                        onArrowUp={() => {
                          if (rowIdx > 0) {
                            // Try same seat index in previous row, clamp to last seat
                            const prevCount = rowSeatCounts[rowIdx - 1] ?? 0
                            focusSeat(rowIdx - 1, Math.min(seatIdx, prevCount - 1))
                          }
                        }}
                        onArrowDown={() => {
                          if (rowIdx < section.rows.length - 1) {
                            const nextCount = rowSeatCounts[rowIdx + 1] ?? 0
                            focusSeat(rowIdx + 1, Math.min(seatIdx, nextCount - 1))
                          }
                        }}
                      />
                    )
                  })}
                </div>

                {/* Row label (right side mirror) */}
                <span
                  className="text-muted-foreground w-6 shrink-0 text-center text-[11px] font-semibold tabular-nums"
                  aria-hidden="true"
                >
                  {row.label}
                </span>
              </div>
            )
          })}
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
