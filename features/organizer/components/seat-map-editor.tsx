'use client'

import { useState, useRef, useCallback, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  MousePointer,
  Loader2,
  X,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  toggleSeatBlocked,
  bulkToggleSeatsBlocked,
  saveSectionPositions,
  updateSeatType,
} from '../seat-map-editor-actions'
import type { SeatMapEditorData, EditorSection, EditorSeat } from '../seat-map-editor-queries'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEAT_SIZE = 22
const SEAT_GAP = 3
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP
const SECTION_PADDING = 36
const SECTION_HEADER_HEIGHT = 44
const LABEL_COL_WIDTH = 20

const MIN_SCALE = 0.3
const MAX_SCALE = 2.5
const SCALE_STEP = 0.15

// ─── Seat status colours ──────────────────────────────────────────────────────

const SEAT_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  AVAILABLE: { fill: '#1e1e1c', stroke: '#3f3f3b', text: '#a8a29e' },
  HELD: { fill: '#451a03', stroke: '#92400e', text: '#fbbf24' },
  RESERVED: { fill: '#451a03', stroke: '#92400e', text: '#fbbf24' },
  SOLD: { fill: '#0f172a', stroke: '#1e293b', text: '#475569' },
  BLOCKED: { fill: '#1c0505', stroke: '#7f1d1d', text: '#ef4444' },
  SELECTED: { fill: '#312e81', stroke: '#6366f1', text: '#e0e7ff' },
}

// ─── Seat type accent dot colours ─────────────────────────────────────────────

const SEAT_TYPE_COLOR: Record<string, string> = {
  VVIP: '#c084fc',
  VIP: '#818cf8',
  PREMIUM: '#fbbf24',
  ACCESSIBLE: '#34d399',
  COMPANION: '#2dd4bf',
  STANDARD: '',
}

const SEAT_TYPES = ['STANDARD', 'VIP', 'VVIP', 'PREMIUM', 'ACCESSIBLE', 'COMPANION'] as const
type SeatTypeValue = (typeof SEAT_TYPES)[number]

// ─── Tool modes ───────────────────────────────────────────────────────────────

type ToolMode = 'select' | 'block' | 'unblock'

// ─── Section block dimensions helper ─────────────────────────────────────────

function computeSectionDimensions(section: EditorSection): { w: number; h: number } {
  const maxCols = Math.max(...section.rows.map((r) => r.seats.length), 1)
  const w = LABEL_COL_WIDTH + maxCols * (SEAT_SIZE + SEAT_GAP) + SECTION_PADDING * 2
  const h = SECTION_HEADER_HEIGHT + section.rows.length * ROW_HEIGHT + SECTION_PADDING
  return { w: Math.max(w, 160), h: Math.max(h, 80) }
}

// ─── Seat node (SVG) ──────────────────────────────────────────────────────────

interface SeatNodeProps {
  seat: EditorSeat
  seatType: string
  x: number
  y: number
  isSelected: boolean
  isToggling: boolean
  mode: ToolMode
  onClick: (seat: EditorSeat) => void
  onContextMenu: (seat: EditorSeat, screenX: number, screenY: number) => void
}

function SeatNode({
  seat,
  seatType,
  x,
  y,
  isSelected,
  isToggling,
  mode,
  onClick,
  onContextMenu,
}: SeatNodeProps) {
  const colorKey = isSelected ? 'SELECTED' : seat.status
  const colors = SEAT_COLORS[colorKey] ?? SEAT_COLORS.AVAILABLE
  const dot = SEAT_TYPE_COLOR[seatType]
  const seatNum = seat.label.replace(/^[A-Z]+/, '')
  const canInteract =
    (mode === 'block' && seat.status === 'AVAILABLE') ||
    (mode === 'unblock' && seat.status === 'BLOCKED') ||
    mode === 'select'

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={canInteract ? () => onClick(seat) : undefined}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(seat, e.clientX, e.clientY)
      }}
      style={{ cursor: canInteract ? 'pointer' : 'default', opacity: isToggling ? 0.5 : 1 }}
    >
      <rect
        x={0}
        y={0}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        rx={4}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isSelected ? 1.5 : 1}
        opacity={seat.status === 'SOLD' ? 0.45 : 1}
      />
      {dot && <circle cx={SEAT_SIZE - 3} cy={3} r={2.5} fill={dot} />}
      <text
        x={SEAT_SIZE / 2}
        y={SEAT_SIZE / 2 + 3.5}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill={colors.text}
        style={{ userSelect: 'none', fontFamily: 'monospace' }}
      >
        {seatNum}
      </text>
    </g>
  )
}

// ─── Section block (SVG) ──────────────────────────────────────────────────────

interface SectionBlockProps {
  section: EditorSection
  x: number
  y: number
  w: number
  h: number
  selectedSeatIds: Set<string>
  togglingId: string | null
  seatTypes: Map<string, string>
  mode: ToolMode
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSeatClick: (seat: EditorSeat) => void
  onSeatContextMenu: (seat: EditorSeat, screenX: number, screenY: number) => void
  onDragStart: (e: React.MouseEvent, sectionId: string) => void
}

function SectionBlock({
  section,
  x,
  y,
  w,
  h,
  selectedSeatIds,
  togglingId,
  seatTypes,
  mode,
  isCollapsed,
  onToggleCollapse,
  onSeatClick,
  onSeatContextMenu,
  onDragStart,
}: SectionBlockProps) {
  const blockH = isCollapsed ? SECTION_HEADER_HEIGHT : h

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Background */}
      <rect x={0} y={0} width={w} height={blockH} rx={10} fill="#111110" stroke="#282826" strokeWidth={1} />

      {/* Header drag handle */}
      <rect
        x={0} y={0} width={w} height={SECTION_HEADER_HEIGHT} rx={10}
        fill="#1a1a18" stroke="none"
        style={{ cursor: mode === 'select' ? 'grab' : 'default' }}
        onMouseDown={(e) => onDragStart(e, section.id)}
      />
      {/* Flatten bottom corners of header */}
      <rect x={0} y={SECTION_HEADER_HEIGHT / 2} width={w} height={SECTION_HEADER_HEIGHT / 2} fill="#1a1a18" stroke="none" />

      {/* Section name */}
      <text x={14} y={SECTION_HEADER_HEIGHT / 2 + 5} fontSize={11} fontWeight={700} fill="#fafaf9" style={{ userSelect: 'none' }}>
        {section.name}
        <tspan fill="#a8a29e" fontWeight={400} fontSize={9}> {section.code}</tspan>
      </text>

      {/* Stats row */}
      <text x={14} y={SECTION_HEADER_HEIGHT - 7} fontSize={8.5} fill="#a8a29e" style={{ userSelect: 'none' }}>
        {section.availableSeats} avail · {section.soldSeats} sold
        {section.blockedSeats > 0 ? ` · ${section.blockedSeats} blocked` : ''}
      </text>

      {/* Collapse toggle */}
      <g transform={`translate(${w - 26}, ${SECTION_HEADER_HEIGHT / 2 - 8})`} onClick={onToggleCollapse} style={{ cursor: 'pointer' }}>
        <rect x={0} y={0} width={18} height={16} rx={4} fill="#282826" />
        <text x={9} y={11.5} textAnchor="middle" fontSize={9} fill="#a8a29e" style={{ userSelect: 'none' }}>
          {isCollapsed ? '▼' : '▲'}
        </text>
      </g>

      {/* Seat grid */}
      {!isCollapsed &&
        section.rows.map((row, rowIdx) => {
          const rowY = SECTION_HEADER_HEIGHT + rowIdx * ROW_HEIGHT + 8
          return (
            <g key={row.id}>
              <text
                x={10} y={rowY + SEAT_SIZE / 2 + 3.5}
                fontSize={8} fontWeight={600} fill="#525252"
                style={{ userSelect: 'none', fontFamily: 'monospace' }}
              >
                {row.label}
              </text>
              {row.seats.map((seat, seatIdx) => (
                <SeatNode
                  key={seat.id}
                  seat={seat}
                  seatType={seatTypes.get(seat.id) ?? seat.seatType}
                  x={LABEL_COL_WIDTH + seatIdx * (SEAT_SIZE + SEAT_GAP)}
                  y={rowY}
                  isSelected={selectedSeatIds.has(seat.eventSeatId)}
                  isToggling={togglingId === seat.eventSeatId}
                  mode={mode}
                  onClick={onSeatClick}
                  onContextMenu={onSeatContextMenu}
                />
              ))}
            </g>
          )
        })}
    </g>
  )
}

// ─── Context menu (seat type picker) ─────────────────────────────────────────

interface SeatContextMenuProps {
  seat: EditorSeat
  currentType: string
  screenX: number
  screenY: number
  onSelect: (seat: EditorSeat, type: SeatTypeValue) => void
  onClose: () => void
}

function SeatContextMenu({ seat, currentType, screenX, screenY, onSelect, onClose }: SeatContextMenuProps) {
  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-context-menu]')) onClose()
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  return (
    <motion.div
      data-context-menu
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="border-border bg-surface fixed z-50 min-w-[160px] overflow-hidden rounded-xl border shadow-2xl"
      style={{ left: screenX, top: screenY }}
    >
      <div className="border-border border-b px-3 py-2">
        <p className="text-[11px] font-semibold">{seat.label}</p>
        <p className="text-muted-foreground text-[10px]">Set seat type</p>
      </div>
      <div className="py-1">
        {SEAT_TYPES.map((type) => {
          const dot = SEAT_TYPE_COLOR[type]
          const isActive = currentType === type
          return (
            <button
              key={type}
              onClick={() => onSelect(seat, type)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-[12px] transition-colors',
                isActive
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border"
                style={{
                  background: dot || 'transparent',
                  borderColor: dot || '#3f3f3b',
                }}
              />
              <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
              {isActive && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Main editor component ────────────────────────────────────────────────────

interface SeatMapEditorProps {
  data: SeatMapEditorData
}

export function SeatMapEditor({ data }: SeatMapEditorProps) {
  // ── Section positions ────────────────────────────────────────────────────
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(() => {
    const map = new Map<string, { x: number; y: number }>()
    let autoX = 40
    let autoY = 80
    let colCount = 0
    const AUTO_COL_MAX = 3

    for (const sec of data.sections) {
      map.set(sec.id, { x: sec.positionX ?? autoX, y: sec.positionY ?? autoY })
      if (sec.positionX == null) {
        autoX += computeSectionDimensions(sec).w + 30
        colCount++
        if (colCount >= AUTO_COL_MAX) { colCount = 0; autoX = 40; autoY += 260 }
      }
    }
    return map
  })

  // ── Seat statuses (optimistic) ───────────────────────────────────────────
  const [seatStatuses, setSeatStatuses] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>()
    for (const sec of data.sections)
      for (const row of sec.rows)
        for (const seat of row.seats)
          map.set(seat.eventSeatId, seat.status)
    return map
  })

  // ── Seat types (optimistic) ──────────────────────────────────────────────
  const [seatTypes, setSeatTypes] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>()
    for (const sec of data.sections)
      for (const row of sec.rows)
        for (const seat of row.seats)
          map.set(seat.id, seat.seatType)
    return map
  })

  // ── Collapsed sections ───────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // ── Tool mode ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ToolMode>('select')

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set())

  // ── Zoom / pan ───────────────────────────────────────────────────────────
  const [scale, setScale] = useState(0.85)
  const [translate, setTranslate] = useState({ x: 40, y: 40 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateRef = useRef({ x: 40, y: 40 })
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Drag ─────────────────────────────────────────────────────────────────
  const draggingSection = useRef<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // ── Async states ─────────────────────────────────────────────────────────
  const [isSaving, startSaveTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null)

  // ── Context menu ─────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    seat: EditorSeat
    screenX: number
    screenY: number
  } | null>(null)

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getSeatStatus = useCallback(
    (eventSeatId: string) => seatStatuses.get(eventSeatId) ?? 'AVAILABLE',
    [seatStatuses]
  )

  const showMsg = useCallback((msg: string, ms = 2500) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), ms)
  }, [])

  // ── Sections with live statuses ───────────────────────────────────────────
  const sectionsWithStatus = data.sections.map((sec) => ({
    ...sec,
    rows: sec.rows.map((row) => ({
      ...row,
      seats: row.seats.map((seat) => ({
        ...seat,
        status: getSeatStatus(seat.eventSeatId),
      })),
    })),
    availableSeats: sec.rows.flatMap((r) => r.seats).filter((s) => getSeatStatus(s.eventSeatId) === 'AVAILABLE').length,
    blockedSeats: sec.rows.flatMap((r) => r.seats).filter((s) => getSeatStatus(s.eventSeatId) === 'BLOCKED').length,
  }))

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))
  const zoomIn = useCallback(() => setScale((s) => clampScale(s + SCALE_STEP)), [])
  const zoomOut = useCallback(() => setScale((s) => clampScale(s - SCALE_STEP)), [])
  const resetView = useCallback(() => {
    setScale(0.85)
    setTranslate({ x: 40, y: 40 })
    translateRef.current = { x: 40, y: 40 }
  }, [])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setScale((s) => clampScale(s + (e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      switch (e.key) {
        case 's': case 'S': setMode('select'); break
        case 'b': case 'B': setMode('block'); break
        case 'u': case 'U': setMode('unblock'); break
        case '+': case '=': e.preventDefault(); zoomIn(); break
        case '-': e.preventDefault(); zoomOut(); break
        case '0': e.preventDefault(); resetView(); break
        case 'Escape':
          setSelectedSeatIds(new Set())
          setContextMenu(null)
          setMode('select')
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomIn, zoomOut, resetView])

  // ── Pan ───────────────────────────────────────────────────────────────────
  function onBgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    const tag = (e.target as SVGElement).tagName
    if (tag !== 'svg' && tag !== 'rect') return
    if (draggingSection.current) return
    isPanning.current = true
    panStart.current = { x: e.clientX - translateRef.current.x, y: e.clientY - translateRef.current.y }
  }

  function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (draggingSection.current) {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return
      const mx = (e.clientX - svgRect.left - translateRef.current.x) / scale
      const my = (e.clientY - svgRect.top - translateRef.current.y) / scale
      const nx = Math.max(0, mx - dragOffset.current.x)
      const ny = Math.max(0, my - dragOffset.current.y)
      setPositions((prev) => { const n = new Map(prev); n.set(draggingSection.current!, { x: nx, y: ny }); return n })
      return
    }
    if (!isPanning.current) return
    const nx = e.clientX - panStart.current.x
    const ny = e.clientY - panStart.current.y
    translateRef.current = { x: nx, y: ny }
    setTranslate({ x: nx, y: ny })
  }

  function onSvgMouseUp() {
    draggingSection.current = null
    isPanning.current = false
  }

  // ── Section drag start ────────────────────────────────────────────────────
  const handleSectionDragStart = useCallback(
    (e: React.MouseEvent, sectionId: string) => {
      e.stopPropagation()
      if (mode !== 'select') return
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return
      const pos = positions.get(sectionId) ?? { x: 0, y: 0 }
      const mx = (e.clientX - svgRect.left - translateRef.current.x) / scale
      const my = (e.clientY - svgRect.top - translateRef.current.y) / scale
      dragOffset.current = { x: mx - pos.x, y: my - pos.y }
      draggingSection.current = sectionId
    },
    [mode, positions, scale]
  )

  // ── Seat click (block/unblock/select) ─────────────────────────────────────
  const handleSeatClick = useCallback(
    async (seat: EditorSeat) => {
      const currentStatus = getSeatStatus(seat.eventSeatId)

      if (mode === 'select') {
        setSelectedSeatIds((prev) => {
          const n = new Set(prev)
          n.has(seat.eventSeatId) ? n.delete(seat.eventSeatId) : n.add(seat.eventSeatId)
          return n
        })
        return
      }

      if (mode === 'block' && currentStatus !== 'AVAILABLE') return
      if (mode === 'unblock' && currentStatus !== 'BLOCKED') return
      const blocking = mode === 'block'

      setSeatStatuses((prev) => { const n = new Map(prev); n.set(seat.eventSeatId, blocking ? 'BLOCKED' : 'AVAILABLE'); return n })
      setIsTogglingId(seat.eventSeatId)

      const result = await toggleSeatBlocked({ eventId: data.eventId, eventSeatId: seat.eventSeatId, blocked: blocking })
      setIsTogglingId(null)

      if (!result.success) {
        setSeatStatuses((prev) => { const n = new Map(prev); n.set(seat.eventSeatId, currentStatus); return n })
        showMsg(`Error: ${result.error}`, 3000)
      }
    },
    [mode, getSeatStatus, data.eventId, showMsg]
  )

  // ── Seat right-click → context menu ──────────────────────────────────────
  const handleSeatContextMenu = useCallback(
    (seat: EditorSeat, screenX: number, screenY: number) => {
      setContextMenu({ seat, screenX, screenY })
    },
    []
  )

  // ── Seat type selection from context menu ─────────────────────────────────
  const handleSeatTypeSelect = useCallback(
    async (seat: EditorSeat, type: SeatTypeValue) => {
      setContextMenu(null)
      const prev = seatTypes.get(seat.id) ?? 'STANDARD'
      if (prev === type) return

      // Optimistic update
      setSeatTypes((m) => { const n = new Map(m); n.set(seat.id, type); return n })

      const result = await updateSeatType({ seatId: seat.id, eventId: data.eventId, seatType: type })
      if (!result.success) {
        setSeatTypes((m) => { const n = new Map(m); n.set(seat.id, prev); return n })
        showMsg(`Error: ${result.error}`, 3000)
      } else {
        showMsg(`Seat ${seat.label} → ${type.charAt(0) + type.slice(1).toLowerCase()}`)
      }
    },
    [seatTypes, data.eventId, showMsg]
  )

  // ── Bulk block/unblock ────────────────────────────────────────────────────
  async function handleBulkToggle(block: boolean) {
    if (selectedSeatIds.size === 0) return
    const ids = Array.from(selectedSeatIds).filter((id) => {
      const s = getSeatStatus(id)
      return block ? s === 'AVAILABLE' : s === 'BLOCKED'
    })
    if (ids.length === 0) return

    setSeatStatuses((prev) => { const n = new Map(prev); for (const id of ids) n.set(id, block ? 'BLOCKED' : 'AVAILABLE'); return n })
    setSelectedSeatIds(new Set())

    const result = await bulkToggleSeatsBlocked({ eventId: data.eventId, eventSeatIds: ids, blocked: block })
    if (!result.success) {
      showMsg(`Error: ${result.error}`, 3000)
    } else {
      showMsg(`${result.data.affected} seat(s) ${block ? 'blocked' : 'unblocked'}`)
    }
  }

  // ── Save layout ───────────────────────────────────────────────────────────
  function handleSaveLayout() {
    startSaveTransition(async () => {
      const sections = data.sections.map((sec) => {
        const pos = positions.get(sec.id) ?? { x: 0, y: 0 }
        const dims = computeSectionDimensions(sec)
        return { sectionId: sec.id, positionX: pos.x, positionY: pos.y, width: dims.w, height: dims.h }
      })
      const result = await saveSectionPositions({ eventId: data.eventId, sections })
      showMsg(result.success ? 'Layout saved' : `Error: ${result.error}`)
    })
  }

  // ── Collapse ─────────────────────────────────────────────────────────────
  function toggleCollapsed(sectionId: string) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(sectionId) ? n.delete(sectionId) : n.add(sectionId); return n })
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalAvailable = [...seatStatuses.values()].filter((s) => s === 'AVAILABLE').length
  const totalBlocked = [...seatStatuses.values()].filter((s) => s === 'BLOCKED').length
  const totalSold = [...seatStatuses.values()].filter((s) => s === 'SOLD' || s === 'RESERVED').length

  const svgCursor = draggingSection.current
    ? 'grabbing'
    : mode === 'select'
      ? isPanning.current ? 'grabbing' : 'grab'
      : mode === 'block' ? 'crosshair' : 'cell'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="border-border bg-surface flex h-12 shrink-0 items-center gap-2 border-b px-4">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <ToolButton active={mode === 'select'} onClick={() => setMode('select')} title="Select & move (S)">
            <MousePointer className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={mode === 'block'} onClick={() => setMode('block')} title="Block seats (B)">
            <Lock className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={mode === 'unblock'} onClick={() => setMode('unblock')} title="Unblock seats (U)">
            <Unlock className="h-3.5 w-3.5" />
          </ToolButton>
        </div>

        <div className="bg-border h-4 w-px" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <ToolButton onClick={zoomOut} title="Zoom out (−)"><ZoomOut className="h-3.5 w-3.5" /></ToolButton>
          <span className="text-muted-foreground min-w-[40px] text-center font-mono text-[11px]">
            {Math.round(scale * 100)}%
          </span>
          <ToolButton onClick={zoomIn} title="Zoom in (+)"><ZoomIn className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton onClick={resetView} title="Reset view (0)"><RotateCcw className="h-3.5 w-3.5" /></ToolButton>
        </div>

        <div className="bg-border h-4 w-px" />

        {/* Seat type hint */}
        <span className="text-muted-foreground hidden items-center gap-1 text-[11px] sm:flex">
          <Tag className="h-3 w-3" />
          Right-click seat to set type
        </span>

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedSeatIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex items-center gap-2"
            >
              <div className="bg-border h-4 w-px" />
              <span className="text-brand-400 text-[12px] font-semibold">{selectedSeatIds.size} selected</span>
              <button
                onClick={() => handleBulkToggle(true)}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Lock className="h-3 w-3" /> Block all
              </button>
              <button
                onClick={() => handleBulkToggle(false)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <Unlock className="h-3 w-3" /> Unblock all
              </button>
              <button onClick={() => setSelectedSeatIds(new Set())} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Mode hint */}
        <span className="text-muted-foreground hidden text-[11px] sm:block">
          {mode === 'select' && 'Drag headers to move · click seats to select'}
          {mode === 'block' && 'Click available seats to block them'}
          {mode === 'unblock' && 'Click blocked seats to unblock them'}
        </span>

        {/* Save message */}
        <AnimatePresence>
          {saveMsg && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={cn('text-[11.5px] font-medium', saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400')}
            >
              {saveMsg}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Save button */}
        <button
          onClick={handleSaveLayout}
          disabled={isSaving}
          className="from-brand-600 flex items-center gap-1.5 rounded-lg bg-gradient-to-r to-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save layout
        </button>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground rounded-lg border border-border p-1.5 transition-colors"
          title="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronDown className="h-3.5 w-3.5 rotate-90" /> : <ChevronUp className="h-3.5 w-3.5 rotate-90" />}
        </button>
      </div>

      {/* ── Canvas + Sidebar ── */}
      <div className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative min-w-0 flex-1 overflow-hidden bg-[#080807]"
          style={{ backgroundImage: 'radial-gradient(circle, #282826 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        >
          {/* Stage label */}
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2">
            <div className="rounded-lg border border-border/50 bg-surface/80 px-8 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase backdrop-blur-sm">
              Stage / Screen
            </div>
          </div>

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ cursor: svgCursor }}
            onMouseDown={onBgMouseDown}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
          >
            <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
              {sectionsWithStatus.map((sec) => {
                const pos = positions.get(sec.id) ?? { x: 40, y: 80 }
                const dims = computeSectionDimensions(sec)
                return (
                  <SectionBlock
                    key={sec.id}
                    section={sec}
                    x={pos.x}
                    y={pos.y}
                    w={dims.w}
                    h={dims.h}
                    selectedSeatIds={selectedSeatIds}
                    togglingId={isTogglingId}
                    seatTypes={seatTypes}
                    mode={mode}
                    isCollapsed={collapsed.has(sec.id)}
                    onToggleCollapse={() => toggleCollapsed(sec.id)}
                    onSeatClick={handleSeatClick}
                    onSeatContextMenu={handleSeatContextMenu}
                    onDragStart={handleSectionDragStart}
                  />
                )
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute right-3 bottom-3 text-[10px] text-muted-foreground/60">
            Ctrl+scroll to zoom · drag canvas to pan
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-border bg-surface shrink-0 overflow-hidden border-l"
            >
              <div className="h-full overflow-y-auto p-4">
                <SidebarContent
                  sections={sectionsWithStatus}
                  totalAvailable={totalAvailable}
                  totalBlocked={totalBlocked}
                  totalSold={totalSold}
                  seatTypeCounts={data.seatTypeCounts}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context menu portal */}
      <AnimatePresence>
        {contextMenu && (
          <SeatContextMenu
            seat={contextMenu.seat}
            currentType={seatTypes.get(contextMenu.seat.id) ?? contextMenu.seat.seatType}
            screenX={contextMenu.screenX}
            screenY={contextMenu.screenY}
            onSelect={handleSeatTypeSelect}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarContentProps {
  sections: EditorSection[]
  totalAvailable: number
  totalBlocked: number
  totalSold: number
  seatTypeCounts: Record<string, number>
}

function SidebarContent({ sections, totalAvailable, totalBlocked, totalSold, seatTypeCounts }: SidebarContentProps) {
  const totalSeats = totalAvailable + totalBlocked + totalSold

  return (
    <div className="space-y-5">
      {/* Status legend */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Legend</p>
        <div className="space-y-1.5">
          {[
            { color: '#3f3f3b', bg: '#1e1e1c', label: 'Available' },
            { color: '#92400e', bg: '#451a03', label: 'Held / Reserved' },
            { color: '#1e293b', bg: '#0f172a', label: 'Sold' },
            { color: '#7f1d1d', bg: '#1c0505', label: 'Blocked' },
          ].map(({ color, bg, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="h-4 w-4 shrink-0 rounded" style={{ background: bg, border: `1px solid ${color}` }} />
              <span className="text-[11.5px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seat type dots */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Seat Types</p>
        <p className="text-muted-foreground mb-2 text-[10px]">Right-click any seat to assign</p>
        <div className="space-y-1.5">
          {Object.entries(SEAT_TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border"
                style={{ background: color || 'transparent', borderColor: color || '#3f3f3b' }}
              />
              <span className="text-[11.5px] text-muted-foreground">
                {type.charAt(0) + type.slice(1).toLowerCase()}
                {seatTypeCounts[type] ? <span className="ml-1 text-foreground/50">({seatTypeCounts[type]})</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Summary</p>
        <div className="space-y-1">
          <StatRow label="Total seats" value={totalSeats} />
          <StatRow label="Available" value={totalAvailable} color="text-foreground" />
          <StatRow label="Sold / Reserved" value={totalSold} color="text-amber-400" />
          <StatRow label="Blocked" value={totalBlocked} color="text-red-400" />
        </div>
      </div>

      {/* Per-section */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Sections</p>
        <div className="space-y-2">
          {sections.map((sec) => (
            <div key={sec.id} className="rounded-lg border border-border p-2.5">
              <p className="text-[12px] font-semibold">{sec.name}</p>
              <p className="text-muted-foreground mt-0.5 text-[10.5px]">
                {sec.totalSeats} seats · {sec.availableSeats} avail
                {sec.blockedSeats > 0 && <span className="text-red-400"> · {sec.blockedSeats} blocked</span>}
              </p>
              {sec.ticketTypeName && <p className="text-brand-400 mt-0.5 text-[10px]">{sec.ticketTypeName}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Shortcuts</p>
        <div className="space-y-1.5 text-[11px] text-muted-foreground">
          {[
            ['S', 'Select mode'],
            ['B', 'Block mode'],
            ['U', 'Unblock mode'],
            ['+/−', 'Zoom in/out'],
            ['0', 'Reset view'],
            ['Esc', 'Clear selection'],
            ['Ctrl+Scroll', 'Zoom'],
            ['Right-click', 'Set seat type'],
          ].map(([key, label]) => (
            <p key={key}>
              <kbd className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono">{key}</kbd>
              {label}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded px-2 py-1.5 text-[11px] transition-colors',
        active ? 'bg-brand-600/20 text-brand-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value, color = 'text-muted-foreground' }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className={cn('text-[12px] font-semibold tabular-nums', color)}>{value}</span>
    </div>
  )
}
