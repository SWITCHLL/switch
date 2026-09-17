import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getUpcomingEvents } from '@/features/events'
import { EventCard } from '@/features/events/components/event-card'

export async function UpcomingEventsSection() {
  const events = await getUpcomingEvents(6)

  if (!events.length) return null

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Header ── */}
        <div className="mb-10 flex items-baseline justify-between gap-4">
          <h2 className="text-foreground text-[22px] font-semibold tracking-tight sm:text-[26px]">
            Upcoming events
          </h2>
          <Link
            href="/events"
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-medium transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {/* ── Grid ── */}
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
