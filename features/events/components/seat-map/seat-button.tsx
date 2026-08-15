'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPrice } from '../../utils'

// Maps seat status → visual style
const STATUS_STYLES: Record<string, string> = {
  AVAILABLE:
    'bg-surface border-border hover:border-brand-400 hover:bg-brand-500/10 cursor-pointer text-foreground',
  HELD: 'bg-amber-500/15 border-amber-500/40 cursor-not-allowed text-amber-600',
  RESERVED: 'bg-amber-500/15 border-amber-500/40 cursor-not-allowed text-amber-600',
  SOLD: 'bg-muted/60 border-border/40 cursor-not-allowed text-muted-foreground/40',
  BLOCKED: 'bg-muted/40 border-border/30 cursor-not-allowed text-muted-foreground/30',
}

const SELECTED_STYLE =
  'bg-brand-600 border-brand-500 text-white cursor-pointer shadow-[0_0_0_2px_rgba(99,102,241,0.4)]'

const DISABLED_STYLE = 'opacity-40 cursor-not-allowed'

// Seat type → colour dot
const SEAT_TYPE_DOT: Record<string, string> = {
  VVIP: 'bg-purple-400',
  VIP: 'bg-brand-400',
  PREMIUM: 'bg-amber-400',
  ACCESSIBLE: 'bg-emerald-400',
  COMPANION: 'bg-teal-400',
  STANDARD: '',
}

interface SeatButtonProps {
  seatId: string
  label: string
  status: string
  price: number
  seatType: string
  isSelected: boolean
  isDisabled: boolean
  onClick: () => void
}

export function SeatButton({
  seatId,
  label,
  status,
  price,
  seatType,
  isSelected,
  isDisabled,
  onClick,
}: SeatButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const baseStyle = isSelected ? SELECTED_STYLE : (STATUS_STYLES[status] ?? STATUS_STYLES.AVAILABLE)

  const isInteractive = status === 'AVAILABLE' && !isDisabled

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.button
        type="button"
        whileHover={isInteractive || isSelected ? { scale: 1.12 } : undefined}
        whileTap={isInteractive || isSelected ? { scale: 0.95 } : undefined}
        transition={{ duration: 0.12 }}
        onClick={isInteractive || isSelected ? onClick : undefined}
        aria-label={`Seat ${label} — ${status === 'AVAILABLE' ? formatPrice(price) : status.toLowerCase()}`}
        aria-pressed={isSelected}
        disabled={!isInteractive && !isSelected}
        className={cn(
          'relative flex h-7 w-7 items-center justify-center rounded-md border text-[9.5px] font-semibold transition-colors duration-150',
          baseStyle,
          !isInteractive && !isSelected && DISABLED_STYLE
        )}
      >
        {/* Seat type dot (top-left corner) */}
        {SEAT_TYPE_DOT[seatType] && (
          <span
            className={cn(
              'absolute top-[2px] right-[2px] h-1 w-1 rounded-full',
              SEAT_TYPE_DOT[seatType]
            )}
          />
        )}

        {/* Selected checkmark */}
        {isSelected ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-white" aria-hidden>
            <path
              d="M1.5 6l3 3 6-6"
              stroke="white"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span>{label.replace(/^[A-Z]+/, '')}</span>
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && status === 'AVAILABLE' && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md px-2 py-1 text-[10px] font-medium whitespace-nowrap shadow-lg"
          >
            {label} · {price === 0 ? 'Free' : formatPrice(price)}
            <div className="bg-foreground absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-[1px] rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
