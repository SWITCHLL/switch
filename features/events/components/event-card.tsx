'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { formatPrice, getMinPrice, isSoldOut, hasFreeTickets } from '../utils'
import type { EventListItem } from '../types'
import { format, isToday, isPast } from 'date-fns'

interface EventCardProps {
  event: EventListItem
  index?: number
  /** "default" = standard portrait card | "compact" = landscape stacked */
  variant?: 'default' | 'compact'
}

export function EventCard({ event, index = 0, variant = 'default' }: EventCardProps) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const free = hasFreeTickets(event)
  const location = event.venue?.city ?? event.venueCity ?? null
  const eventIsToday = isToday(event.startsAt)
  const eventHasPassed = !eventIsToday && isPast(event.endsAt ?? event.startsAt)

  if (variant === 'compact') {
    return <CompactEventCard event={event} minPrice={minPrice} soldOut={soldOut} free={free} location={location} eventIsToday={eventIsToday} eventHasPassed={eventHasPassed} />
  }

  return <SpatialEventCard event={event} index={index} minPrice={minPrice} soldOut={soldOut} free={free} location={location} eventIsToday={eventIsToday} eventHasPassed={eventHasPassed} />
}

// ─── Spatial (default) card ───────────────────────────────────────────────────

function SpatialEventCard({
  event,
  index,
  minPrice,
  soldOut,
  free,
  location,
  eventIsToday,
  eventHasPassed,
}: {
  event: EventListItem
  index: number
  minPrice: number | null
  soldOut: boolean
  free: boolean
  location: string | null
  eventIsToday: boolean
  eventHasPassed: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left   // 0 → width
    const y = e.clientY - rect.top    // 0 → height
    const cx = rect.width / 2
    const cy = rect.height / 2
    const maxTilt = 6 // degrees
    const rx = ((y - cy) / cy) * -maxTilt
    const ry = ((x - cx) / cx) * maxTilt
    const mx = (x / rect.width) * 100
    const my = (y / rect.height) * 100
    el.style.setProperty('--rx', `${rx}deg`)
    el.style.setProperty('--ry', `${ry}deg`)
    el.style.setProperty('--sc', '1.02')
    el.style.setProperty('--mx', `${mx}%`)
    el.style.setProperty('--my', `${my}%`)
  }, [])

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--sc', '1')
  }, [])

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <article
        ref={cardRef}
        aria-label={event.title}
        className="spatial-card rounded-xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Image ── */}
        <div
          className="relative mb-3.5 overflow-hidden rounded-xl"
          style={{ aspectRatio: '3/2' }}
        >
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="spatial-image object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              loading={index < 3 ? 'eager' : 'lazy'}
            />
          ) : (
            <NoImageFallback category={event.category?.name} />
          )}

          {/* Specular shine overlay */}
          <div className="spatial-shine" aria-hidden />

          {/* Status badges — today / passed take priority over sold-out / free */}
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            {eventIsToday && (
              <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                Today
              </span>
            )}
            {eventHasPassed && (
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                Passed
              </span>
            )}
            {!eventIsToday && !eventHasPassed && soldOut && (
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                Sold out
              </span>
            )}
            {!eventIsToday && !eventHasPassed && !soldOut && free && (
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white">
                Free
              </span>
            )}
          </div>

          {/* Hover arrow */}
          <div className="absolute right-3 bottom-3 z-10">
            <span className="card-arrow inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm">
              <ArrowUpRight className="h-3.5 w-3.5 text-black" aria-hidden />
            </span>
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="space-y-1">
          {event.category && (
            <p
              className="text-[10.5px] font-semibold tracking-[0.12em] uppercase"
              style={{ color: event.category.color ?? '#6366f1' }}
            >
              {event.category.name}
            </p>
          )}

          <h3 className="text-foreground line-clamp-2 text-[15px] leading-snug font-semibold">
            {event.title}
          </h3>

          <p className="text-muted-foreground text-[13px]">
            {eventIsToday
              ? <span className="text-brand-400 font-semibold">Today</span>
              : format(event.startsAt, 'EEE, MMM d')}
            {!eventIsToday && <span> · {format(event.startsAt, 'h:mm a')}</span>}
            {eventIsToday && <span className="text-muted-foreground"> · {format(event.startsAt, 'h:mm a')}</span>}
            {location && (
              <span className="before:mx-1.5 before:content-['·'] before:opacity-40">
                {location}
              </span>
            )}
          </p>

          <p className="text-foreground pt-0.5 text-[13px] font-semibold">
            {eventHasPassed
              ? <span className="text-muted-foreground">Event passed</span>
              : soldOut
                ? <span className="text-muted-foreground line-through">Sold out</span>
                : minPrice !== null
                  ? minPrice === 0
                    ? 'Free'
                    : `From ${formatPrice(minPrice)}`
                  : null}
          </p>
        </div>
      </article>
    </Link>
  )
}

// ─── Compact variant — landscape card used in the right-column stacked pair ──

function CompactEventCard({
  event,
  minPrice,
  soldOut,
  free,
  location,
  eventIsToday,
  eventHasPassed,
}: {
  event: EventListItem
  minPrice: number | null
  soldOut: boolean
  free: boolean
  location: string | null
  eventIsToday: boolean
  eventHasPassed: boolean
}) {
  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <article
        className="border-border bg-surface flex gap-4 overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
        aria-label={event.title}
      >
        {/* Thumbnail */}
        <div className="relative h-[90px] w-[90px] shrink-0 sm:h-[100px] sm:w-[100px]">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              sizes="100px"
              loading="lazy"
            />
          ) : (
            <NoImageFallback category={event.category?.name} small />
          )}

          {/* Today / Passed badge on thumbnail */}
          {(eventIsToday || eventHasPassed) && (
            <div className="absolute top-1.5 left-1.5">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                  eventIsToday
                    ? 'bg-brand-500 text-white'
                    : 'bg-black/60 text-white/70 backdrop-blur-sm'
                )}
              >
                {eventIsToday ? 'Today' : 'Passed'}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 pr-4">
          {event.category && (
            <p
              className="text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: event.category.color ?? '#6366f1' }}
            >
              {event.category.name}
            </p>
          )}
          <h3 className="text-foreground line-clamp-2 text-[13.5px] leading-snug font-semibold">
            {event.title}
          </h3>
          <p className="text-muted-foreground text-[12px]">
            {eventIsToday
              ? <span className="text-brand-400 font-semibold">Today</span>
              : format(event.startsAt, 'MMM d')}
            {' · '}{format(event.startsAt, 'h:mm a')}
            {location && (
              <span className="before:mx-1 before:content-['·'] before:opacity-40">
                {location}
              </span>
            )}
          </p>
          <p className="text-foreground text-[12.5px] font-semibold">
            {eventHasPassed
              ? <span className="text-muted-foreground text-[11.5px]">Event passed</span>
              : soldOut
                ? <span className="text-muted-foreground">Sold out</span>
                : minPrice !== null
                  ? minPrice === 0
                    ? 'Free'
                    : `From ${formatPrice(minPrice)}`
                  : null}
          </p>
        </div>
      </article>
    </Link>
  )
}

// ─── Branded no-image fallback ────────────────────────────────────────────────

function NoImageFallback({
  category,
  small = false,
}: {
  category?: string | null
  small?: boolean
}) {
  return (
    <div className="bg-muted relative flex h-full w-full items-center justify-center overflow-hidden">
      <p
        aria-hidden
        className="text-border pointer-events-none select-none font-semibold"
        style={{
          fontSize: small ? '32px' : '60px',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {(category ?? 'SW').slice(0, 2).toUpperCase()}
      </p>
      <div className="bg-border absolute inset-x-0 top-0 h-[2px]" />
    </div>
  )
}
