'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SeatMapGrid } from './seat-map-grid'
import { SeatMapLegend } from './seat-map-legend'
import { SeatOrderPanel } from './seat-order-panel'
import type { EventDetail, SelectedSeat } from '../../types'

const MAX_SEATS = 10 // per transaction

interface SeatMapClientProps {
  event: EventDetail
  userId: string
}

export function SeatMapClient({ event, userId }: SeatMapClientProps) {
  const router = useRouter()
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    // Default to first section
    event.seatMap?.sections[0]?.id ?? null
  )

  const toggleSeat = useCallback((seat: SelectedSeat) => {
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.eventSeatId === seat.eventSeatId)
      if (exists) {
        // Deselect
        return prev.filter((s) => s.eventSeatId !== seat.eventSeatId)
      }
      // Select — enforce max
      if (prev.length >= MAX_SEATS) return prev
      return [...prev, seat]
    })
  }, [])

  const removeSeat = useCallback((eventSeatId: string) => {
    setSelectedSeats((prev) => prev.filter((s) => s.eventSeatId !== eventSeatId))
  }, [])

  const handleCheckout = () => {
    if (!selectedSeats.length) return
    // Encode selection into URL for the checkout page
    const seatIds = selectedSeats.map((s) => s.eventSeatId).join(',')
    router.push(`/events/${event.slug}/checkout?seats=${seatIds}`)
  }

  if (!event.seatMap) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-muted-foreground text-[14px]">
          No seat map has been configured for this event.
        </p>
      </div>
    )
  }

  const sections = event.seatMap.sections

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* ── Left: seat map ── */}
        <div className="min-w-0 flex-1">
          {/* Section tabs (for MIXED or multi-section events) */}
          {sections.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`rounded-lg border px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
                    activeSectionId === section.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {section.name}
                  {section.type === 'GENERAL_ADMISSION' && (
                    <span className="text-muted-foreground ml-1.5 text-[10.5px]">(GA)</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Stage indicator */}
          <div className="mb-6 flex justify-center">
            <div className="border-border bg-muted/40 text-muted-foreground rounded-lg border px-8 py-2 text-[11px] font-semibold tracking-widest uppercase">
              Stage / Screen
            </div>
          </div>

          {/* Render active section(s) */}
          {sections
            .filter((s) => sections.length === 1 || s.id === activeSectionId)
            .map((section) => (
              <SeatMapGrid
                key={section.id}
                section={section}
                event={event}
                selectedSeats={selectedSeats}
                onToggleSeat={toggleSeat}
                maxSeats={MAX_SEATS}
              />
            ))}

          <SeatMapLegend />
        </div>

        {/* ── Right: order panel (sticky) ── */}
        <div className="w-full lg:sticky lg:top-[80px] lg:w-[320px] lg:shrink-0 lg:self-start">
          <SeatOrderPanel
            event={event}
            selectedSeats={selectedSeats}
            onRemove={removeSeat}
            onCheckout={handleCheckout}
            maxSeats={MAX_SEATS}
          />
        </div>
      </div>
    </div>
  )
}
