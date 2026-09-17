import { Suspense } from 'react'
import type { EventDetail } from '@/features/events/types'
import { TicketSelector } from '@/features/events/components/ticket-selector'
import { TicketSelectorSkeleton } from '@/features/events/components/ticket-selector-skeleton'
import { getMinPrice, isSoldOut } from '@/features/events'
import { formatPrice } from '@/features/events/utils'
import { getEventTimeSlots } from '@/features/time-slots/queries'
import { ShowSelector } from '@/features/time-slots/components/show-selector'

interface TicketPanelProps {
  event:      EventDetail
  isLoggedIn: boolean
}

export function TicketPanel({ event, isLoggedIn }: TicketPanelProps) {
  const minPrice = getMinPrice(event)
  const soldOut  = isSoldOut(event)

  return (
    <div className="lg:sticky lg:top-[96px] lg:self-start">
      {/* Section label */}
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Tickets
      </p>

      {/* Price summary */}
      {!soldOut && minPrice !== null && (
        <div className="mb-4">
          <span className="text-[13px] text-muted-foreground">Starting from </span>
          <span className="text-[20px] font-semibold tracking-tight text-foreground">
            {minPrice === 0 ? 'Free' : formatPrice(minPrice)}
          </span>
        </div>
      )}

      <Suspense fallback={<TicketSelectorSkeleton />}>
        {/* SmartTicketSelector decides between ShowSelector and TicketSelector */}
        <SmartTicketSelector
          event={event}
          minPrice={minPrice}
          soldOut={soldOut}
          isLoggedIn={isLoggedIn}
        />
      </Suspense>
    </div>
  )
}

// ─── Async server component — fetches slots then picks the right selector ──────

async function SmartTicketSelector({
  event,
  minPrice,
  soldOut,
  isLoggedIn,
}: {
  event:      EventDetail
  minPrice:   number | null
  soldOut:    boolean
  isLoggedIn: boolean
}) {
  // Fetch time slots for this event
  const timeSlots = await getEventTimeSlots(event.id)

  const hasShows = timeSlots.length > 0

  if (hasShows) {
    return (
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Get Tickets</h2>
        <ShowSelector
          eventSlug={event.slug}
          timeSlots={timeSlots}
          isLoggedIn={isLoggedIn}
        />
      </div>
    )
  }

  // Fallback to the standard GA / Reserved selector
  return (
    <TicketSelector
      event={event}
      minPrice={minPrice}
      soldOut={soldOut}
      isLoggedIn={isLoggedIn}
    />
  )
}
