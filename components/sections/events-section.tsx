import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getUpcomingEvents } from '@/features/events'
import { EventCard } from '@/features/events/components/event-card'
import { FeaturedEventCard } from '@/features/events/components/featured-event-card'

export async function EventsSection() {
  const events = await getUpcomingEvents(7)

  if (!events.length) return null

  const [first, ...rest] = events
  const hasHero = Boolean(first?.imageUrl)

  return (
    <section className="bg-background py-14 sm:py-20" aria-label="Happening near you">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Section header ── */}
        <div className="mb-7 flex items-baseline justify-between gap-4 sm:mb-9">
          <h2
            className="text-foreground font-semibold tracking-tight"
            style={{ fontSize: 'clamp(20px, 2.8vw, 28px)', letterSpacing: '-0.03em' }}
          >
            Happening near you
          </h2>
          <Link
            href="/events"
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium transition-colors sm:text-[13px]"
          >
            All events
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {/* ── Editorial grid ── */}
        {hasHero ? (
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            {/* Hero card — full width on mobile, 2 cols on desktop */}
            <div className="lg:col-span-2">
              <FeaturedEventCard event={first!} />
            </div>

            {/* Right column — stacked pair, scrollable on mobile */}
            <div className="flex flex-row gap-4 overflow-x-auto pb-1 sm:flex-col sm:gap-5 sm:overflow-visible sm:pb-0 lg:flex-col">
              {rest.slice(0, 2).map((event, i) => (
                <div key={event.id} className="min-w-[260px] flex-shrink-0 sm:min-w-0">
                  <EventCard event={event} index={i + 1} variant="compact" />
                </div>
              ))}
            </div>

            {/* Bottom row — horizontal scroll on mobile, 3-col on desktop */}
            <div className="col-span-full">
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                {rest.slice(2, 5).map((event, i) => (
                  <EventCard key={event.id} event={event} index={i + 3} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
            {events.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
