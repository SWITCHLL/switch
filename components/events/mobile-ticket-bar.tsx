'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'

interface MobileTicketBarProps {
  eventSlug: string
  minPrice: number | null
  soldOut: boolean
  salesEnded: boolean
  salesNotStarted: boolean
  isLoggedIn: boolean
  isReserved: boolean
}

export function MobileTicketBar({
  eventSlug,
  minPrice,
  soldOut,
  salesEnded,
  salesNotStarted,
  isLoggedIn,
  isReserved,
}: MobileTicketBarProps) {
  const unavailable = soldOut || salesEnded || salesNotStarted

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        'border-t border-white/10 bg-[#111110]/95 backdrop-blur-xl',
        'px-4 py-3'
      )}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3">
        {/* Price */}
        <div className="flex-1">
          {soldOut ? (
            <p className="text-[13px] font-semibold text-red-400">Sold out</p>
          ) : salesEnded ? (
            <p className="text-[13px] font-semibold text-white/50">Sales ended</p>
          ) : salesNotStarted ? (
            <p className="text-[13px] font-semibold text-white/50">Coming soon</p>
          ) : minPrice !== null ? (
            <div>
              <p className="text-[11px] text-white/40">From</p>
              <p className="text-[16px] font-semibold tracking-tight text-white">
                {minPrice === 0 ? 'Free' : formatPrice(minPrice)}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-white/50">No tickets available</p>
          )}
        </div>

        {/* CTA */}
        {unavailable ? (
          <button
            disabled
            className={cn(
              'flex-shrink-0 rounded-xl px-6 py-3 text-[14px] font-semibold',
              'cursor-not-allowed bg-white/10 text-white/30'
            )}
          >
            {soldOut ? 'Sold Out' : salesEnded ? 'Sales Ended' : 'Coming Soon'}
          </button>
        ) : !isLoggedIn ? (
          <Link
            href={`/login?redirect=/events/${eventSlug}`}
            className={cn(
              'flex flex-shrink-0 items-center gap-2 rounded-xl px-6 py-3',
              'bg-white text-[14px] font-semibold text-black',
              'transition-opacity active:opacity-80'
            )}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Sign in
          </Link>
        ) : isReserved ? (
          <Link
            href={`/events/${eventSlug}/seats`}
            className={cn(
              'flex-shrink-0 rounded-xl px-6 py-3',
              'bg-white text-[14px] font-semibold text-black',
              'transition-opacity active:opacity-80'
            )}
          >
            Choose Seats
          </Link>
        ) : (
          <a
            href="#tickets"
            className={cn(
              'flex-shrink-0 rounded-xl px-6 py-3',
              'bg-white text-[14px] font-semibold text-black',
              'transition-opacity active:opacity-80'
            )}
          >
            Get Tickets
          </a>
        )}
      </div>
    </motion.div>
  )
}
