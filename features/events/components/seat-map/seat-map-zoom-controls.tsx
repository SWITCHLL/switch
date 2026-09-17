'use client'

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SeatMapZoomControlsProps {
  scale: number
  minScale: number
  maxScale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function SeatMapZoomControls({
  scale,
  minScale,
  maxScale,
  onZoomIn,
  onZoomOut,
  onReset,
}: SeatMapZoomControlsProps) {
  const pct = Math.round(scale * 100)

  return (
    <div
      className="border-border bg-surface flex items-center gap-0.5 rounded-xl border p-1 shadow-sm"
      role="group"
      aria-label="Zoom controls"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={scale <= minScale}
        aria-label="Zoom out"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
          scale <= minScale
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
        )}
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>

      <span className="text-muted-foreground w-10 text-center text-[11px] font-semibold tabular-nums select-none">
        {pct}%
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        aria-label="Zoom in"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
          scale >= maxScale
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
        )}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>

      <div className="bg-border mx-1 h-4 w-px" aria-hidden />

      <button
        type="button"
        onClick={onReset}
        aria-label="Reset zoom"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
