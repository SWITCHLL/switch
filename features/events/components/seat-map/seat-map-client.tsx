'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { SeatMapGrid } from './seat-map-grid'
import { SeatMapLegend } from './seat-map-legend'
import { SeatOrderPanel } from './seat-order-panel'
import { SeatMapZoomControls } from './seat-map-zoom-controls'
import type { EventDetail, SelectedSeat } from '../../types'

const MAX_SEATS = 10 // per transaction
const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

interface SeatMapClientProps {
  event: EventDetail
  userId: string
}

export function SeatMapClient({ event, userId: _userId }: SeatMapClientProps) {
  const router = useRouter()
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    event.seatMap?.sections[0]?.id ?? null
  )

  // ── Zoom / pan state ────────────────────────────────────────────────────────
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })

  // Pan tracking (mouse + touch)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateRef = useRef({ x: 0, y: 0 })
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Pinch-to-zoom tracking
  const lastPinchDist = useRef<number | null>(null)

  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))

  const zoomIn = useCallback(() => setScale((s) => clampScale(s + SCALE_STEP)), [])
  const zoomOut = useCallback(() => setScale((s) => clampScale(s - SCALE_STEP)), [])
  const resetZoom = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    translateRef.current = { x: 0, y: 0 }
  }, [])

  // ── Keyboard zoom (+ / -) ────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Only when focus is inside the map container
      if (!mapContainerRef.current?.contains(document.activeElement)) return
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomIn, zoomOut, resetZoom])

  // ── Mouse wheel zoom ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return // only zoom with ctrl/cmd + scroll
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
      setScale((s) => clampScale(s + delta))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Mouse pan ────────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // Only pan if not clicking a button (seat)
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    if (scale === 1) return // no pan at default zoom
    isPanning.current = true
    panStart.current = { x: e.clientX - translateRef.current.x, y: e.clientY - translateRef.current.y }
    e.currentTarget.style.cursor = 'grabbing'
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPanning.current) return
    const newX = e.clientX - panStart.current.x
    const newY = e.clientY - panStart.current.y
    translateRef.current = { x: newX, y: newY }
    setTranslate({ x: newX, y: newY })
  }

  function onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    isPanning.current = false
    e.currentTarget.style.cursor = scale > 1 ? 'grab' : 'default'
  }

  // ── Touch pan + pinch zoom ───────────────────────────────────────────────
  function getTouchDist(t: React.TouchList) {
    const [a, b] = [t[0], t[1]]
    if (!a || !b) return 0
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      lastPinchDist.current = getTouchDist(e.touches)
    } else if (e.touches.length === 1 && scale > 1) {
      const touch = e.touches[0]!
      isPanning.current = true
      panStart.current = {
        x: touch.clientX - translateRef.current.x,
        y: touch.clientY - translateRef.current.y,
      }
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getTouchDist(e.touches)
      if (lastPinchDist.current) {
        const ratio = dist / lastPinchDist.current
        setScale((s) => clampScale(s * ratio))
      }
      lastPinchDist.current = dist
    } else if (e.touches.length === 1 && isPanning.current) {
      const touch = e.touches[0]!
      const newX = touch.clientX - panStart.current.x
      const newY = touch.clientY - panStart.current.y
      translateRef.current = { x: newX, y: newY }
      setTranslate({ x: newX, y: newY })
    }
  }

  function onTouchEnd() {
    isPanning.current = false
    lastPinchDist.current = null
  }

  // ── Seat selection ───────────────────────────────────────────────────────
  const toggleSeat = useCallback((seat: SelectedSeat) => {
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.eventSeatId === seat.eventSeatId)
      if (exists) return prev.filter((s) => s.eventSeatId !== seat.eventSeatId)
      if (prev.length >= MAX_SEATS) return prev
      return [...prev, seat]
    })
  }, [])

  const removeSeat = useCallback((eventSeatId: string) => {
    setSelectedSeats((prev) => prev.filter((s) => s.eventSeatId !== eventSeatId))
  }, [])

  const handleCheckout = () => {
    if (!selectedSeats.length) return
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
            <div
              className="mb-5 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Seating sections"
            >
              {sections.map((section) => (
                <button
                  key={section.id}
                  role="tab"
                  aria-selected={activeSectionId === section.id}
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
          <div className="mb-4 flex justify-center">
            <div className="border-border bg-muted/40 text-muted-foreground rounded-lg border px-8 py-2 text-[11px] font-semibold tracking-widest uppercase">
              Stage / Screen
            </div>
          </div>

          {/* Zoom controls + hint */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px]">
              {scale > 1 ? 'Drag to pan · ' : ''}
              Ctrl+scroll or pinch to zoom
            </p>
            <SeatMapZoomControls
              scale={scale}
              minScale={MIN_SCALE}
              maxScale={MAX_SCALE}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={resetZoom}
            />
          </div>

          {/* Zoomable / pannable map viewport */}
          <div
            ref={mapContainerRef}
            className="relative overflow-hidden rounded-2xl border border-border/40"
            style={{ cursor: scale > 1 ? 'grab' : 'default' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            aria-label="Seat map — use arrow keys to navigate seats, +/- to zoom"
          >
            <motion.div
              style={{
                scale,
                x: translate.x,
                y: translate.y,
                transformOrigin: 'center top',
              }}
              transition={{ type: 'tween', duration: 0.15 }}
              className="p-4"
            >
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
            </motion.div>
          </div>

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
