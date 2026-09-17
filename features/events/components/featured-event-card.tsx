import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowUpRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { formatPrice, getMinPrice, isSoldOut } from '../utils'
import type { EventListItem } from '../types'

interface FeaturedEventCardProps {
  event: EventListItem
}

export function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const location = event.venue?.city ?? event.venueCity ?? null

  return (
    <Link href={`/events/${event.slug}`} className="group block h-full">
      <article
        className="relative h-full overflow-hidden rounded-2xl"
        style={{ minHeight: 'clamp(300px, 45vw, 480px)' }}
        aria-label={event.title}
      >
        {/* ── Full-bleed image ── */}
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 720px"
          />
        ) : (
          <EventFallbackBg category={event.category?.name} title={event.title} />
        )}

        {/* ── Multi-stop gradient — heavier at bottom for legibility ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        {/* Extra side vignette on mobile so text pops */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent sm:hidden" />

        {/* ── Top-left: category badge ── */}
        {event.category && (
          <div className="absolute top-4 left-4 z-10 sm:top-5 sm:left-5">
            <span
              className="inline-block rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.1em] uppercase backdrop-blur-sm"
              style={{
                color: event.category.color ?? '#a5b4fc',
                backgroundColor: `${event.category.color ?? '#6366f1'}22`,
                border: `1px solid ${event.category.color ?? '#6366f1'}44`,
              }}
            >
              {event.category.name}
            </span>
          </div>
        )}

        {/* ── Content — pinned to bottom ── */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          {/* Title */}
          <h3
            className="text-white font-bold leading-tight tracking-tight"
            style={{
              fontSize: 'clamp(18px, 3vw, 30px)',
              letterSpacing: '-0.03em',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {event.title}
          </h3>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-white/65 sm:mt-2.5 sm:text-[13px]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {format(event.startsAt, 'EEE, MMM d · h:mm a')}
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {location}
              </span>
            )}
          </div>

          {/* Price + CTA row */}
          <div className="mt-4 flex items-center justify-between gap-3 sm:mt-5">
            {/* Price chip */}
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white backdrop-blur-sm ring-1 ring-white/15">
              {soldOut
                ? 'Sold out'
                : minPrice !== null
                  ? minPrice === 0
                    ? 'Free'
                    : `From ${formatPrice(minPrice)}`
                  : 'View details'}
            </span>

            {/* Glass CTA pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 group-hover:bg-white/25 group-hover:ring-white/35">
              Get tickets
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ─── Branded fallback when no image ──────────────────────────────────────────

function EventFallbackBg({
  category,
  title,
}: {
  category?: string | null
  title: string
}) {
  void title
  return (
    <div className="bg-muted absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-8">
      <p
        aria-hidden
        className="text-border pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden font-semibold"
        style={{ fontSize: 'clamp(80px, 18vw, 160px)', letterSpacing: '-0.04em' }}
      >
        {category ?? 'SWITCH'}
      </p>
      <div className="bg-border/60 absolute inset-x-6 top-8 h-px" aria-hidden />
      <div className="bg-border/60 absolute inset-x-6 bottom-20 h-px" aria-hidden />
    </div>
  )
}
