import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import type { EventListItem } from '@/features/events/types'
import { formatPrice, getMinPrice, isSoldOut } from '@/features/events'

interface RelatedEventsProps {
  events: EventListItem[]
  currentEventId: string
}

export function RelatedEvents({ events, currentEventId }: RelatedEventsProps) {
  const filtered = events.filter((e) => e.id !== currentEventId).slice(0, 6)
  if (filtered.length === 0) return null

  return (
    <section aria-labelledby="related-heading" className="pb-28 lg:pb-0">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h2
            id="related-heading"
            className="text-foreground text-[20px] font-semibold tracking-[-0.02em]"
          >
            More Events
          </h2>
          <p className="text-muted-foreground mt-1 text-[13px]">Discover something else</p>
        </div>
        <Link
          href="/events"
          className="text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
        <ul
          className="flex gap-4 lg:grid lg:grid-cols-3 lg:gap-5"
          role="list"
          style={{ width: 'max-content' }}
        >
          {filtered.map((event) => (
            <li
              key={event.id}
              className="w-[260px] shrink-0 lg:w-auto"
            >
              <RelatedEventCard event={event} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function RelatedEventCard({ event }: { event: EventListItem }) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <article className="border-border bg-surface overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative h-[140px] overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 260px, (max-width: 1024px) 50vw, 340px"
              loading="lazy"
            />
          ) : (
            <div className="bg-muted h-full w-full" />
          )}

          {/* Category */}
          {event.category && (
            <div className="absolute right-3 top-3">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: event.category.color ?? 'rgba(99,102,241,0.85)' }}
              >
                {event.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="text-foreground line-clamp-2 text-[13.5px] font-semibold leading-snug">
            {event.title}
          </h3>

          <div className="mt-3 flex flex-col gap-1.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{format(new Date(event.startsAt), 'EEE, MMM d, yyyy')}</span>
            </div>
            {event.venue && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {event.venue.name}, {event.venue.city}
                </span>
              </div>
            )}
          </div>

          <div className="border-border/60 mt-3 border-t pt-3">
            {soldOut ? (
              <span className="text-muted-foreground text-[12.5px] font-semibold line-through">Sold out</span>
            ) : minPrice !== null ? (
              <span className="text-foreground text-[13px] font-semibold">
                {minPrice === 0 ? 'Free' : `From ${formatPrice(minPrice)}`}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
