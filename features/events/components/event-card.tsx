'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPrice, getMinPrice, isSoldOut, hasFreeTickets } from '../utils'
import type { EventListItem } from '../types'
import { format } from 'date-fns'

interface EventCardProps {
  event: EventListItem
  index?: number
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const free = hasFreeTickets(event)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/events/${event.slug}`} className="group block">
        <article aria-label={event.title}>
          {/* Image */}
          <div className="relative mb-4 overflow-hidden rounded-xl" style={{ aspectRatio: '4/5' }}>
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1a1a18] via-[#1e1a2e] to-[#111110]" />
            )}

            {/* Subtle bottom gradient for readability if overlaid */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

            {/* Status badge */}
            {(soldOut || free) && (
              <div className="absolute top-3 left-3">
                {soldOut ? (
                  <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
                    Sold out
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
                    Free
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-1.5">
            {/* Category */}
            {event.category && (
              <p
                className="text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: event.category.color ?? '#6366f1' }}
              >
                {event.category.name}
              </p>
            )}

            {/* Title */}
            <h3 className="text-foreground group-hover:text-foreground/80 line-clamp-2 text-[15px] leading-snug font-semibold transition-colors duration-200">
              {event.title}
            </h3>

            {/* Date */}
            <p className="text-muted-foreground text-[13px]">
              {format(event.startsAt, 'EEE, MMM d · h:mm a')}
            </p>

            {/* Location */}
            {event.venue && (
              <p className="text-muted-foreground flex items-center gap-1 text-[13px]">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">
                  {event.venue.city}
                </span>
              </p>
            )}

            {/* Price */}
            <p
              className={cn(
                'pt-0.5 text-[13px] font-semibold',
                soldOut ? 'text-red-400' : 'text-foreground'
              )}
            >
              {soldOut
                ? 'Sold out'
                : minPrice !== null
                  ? minPrice === 0
                    ? 'Free'
                    : `From ${formatPrice(minPrice)}`
                  : null}
            </p>
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
