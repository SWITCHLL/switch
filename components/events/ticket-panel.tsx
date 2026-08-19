import { Suspense } from 'react'
import type { EventDetail } from '@/features/events/types'
import { TicketSelector } from '@/features/events/components/ticket-selector'
import { TicketSelectorSkeleton } from '@/features/events/components/ticket-selector-skeleton'
import { getMinPrice, isSoldOut } from '@/features/events'
import { formatPrice } from '@/features/events/utils'

interface TicketPanelProps {
  event: EventDetail
  isLoggedIn: boolean
}

export function TicketPanel({ event, isLoggedIn }: TicketPanelProps) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)

  return (
    <div className="lg:sticky lg:top-[96px] lg:self-start">
      {/* Section label */}
      <p className="mb-4 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40">
        Tickets
      </p>

      {/* Price summary */}
      {!soldOut && minPrice !== null && (
        <div className="mb-4">
          <span className="text-[13px] text-white/60">Starting from </span>
          <span className="text-[20px] font-semibold tracking-tight text-white">
            {minPrice === 0 ? 'Free' : formatPrice(minPrice)}
          </span>
        </div>
      )}

      <Suspense fallback={<TicketSelectorSkeleton />}>
        <TicketSelector
          event={event}
          minPrice={minPrice}
          soldOut={soldOut}
          isLoggedIn={isLoggedIn}
        />
      </Suspense>
    </div>
  )
}
