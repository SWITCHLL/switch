import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowUpRight } from 'lucide-react'
import { format } from 'date-fns'
import { formatPrice, getMinPrice, isSoldOut, hasFreeTickets } from '../utils'
import type { EventListItem } from '../types'

interface FeaturedEventProps {
  event: EventListItem
}

export function FeaturedEvent({ event }: FeaturedEventProps) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const free = hasFreeTickets(event)

  return (
    <section aria-label="Featured event" className="mx-auto max-w-[1120px] px-5 pb-16 sm:px-8">
      <p className="text-muted-foreground mb-5 text-[11px] font-semibold tracking-[0.18em] uppercase">
        Featured
      </p>

      <Link href={`/events/${event.slug}`} className="group block">
        <article
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: '21/9' }}
          aria-label={event.title}
        >
          {/* Background image */}
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              priority
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              sizes="(max-width: 640px) 100vw, 1120px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a18] via-[#1e1a2e] to-[#111110]" />
          )}

          {/* Gradient overlay — heavier at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Content */}
          <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                {event.category && (
                  <p
                    className="mb-2 text-[11px] font-semibold tracking-[0.15em] uppercase"
                    style={{ color: event.category.color ?? '#6366f1' }}
                  >
                    {event.category.name}
                  </p>
                )}
                <h2 className="line-clamp-2 text-[22px] leading-tight font-semibold text-white sm:text-[28px]">
                  {event.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="text-[13px] text-white/70">
                    {format(event.startsAt, 'EEE, MMM d · h:mm a')}
                  </p>
                  {event.venue && (
                    <p className="flex items-center gap-1 text-[13px] text-white/70">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {event.venue.city}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3">
                <div className="text-right">
                  {soldOut ? (
                    <p className="text-[14px] font-semibold text-red-400">Sold out</p>
                  ) : minPrice !== null ? (
                    <p className="text-[14px] font-semibold text-white">
                      {minPrice === 0 ? 'Free' : `From ${formatPrice(minPrice)}`}
                    </p>
                  ) : null}
                </div>
                <span className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-white/20 sm:flex">
                  View event
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </section>
  )
}
