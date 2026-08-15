'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/events/${event.slug}`} className="group block h-full">
        <article
          className={cn(
            'bg-surface border-border flex h-full flex-col overflow-hidden rounded-2xl border',
            'transition-all duration-300',
            'hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
          )}
        >
          {/* Image */}
          <div className="relative h-[160px] overflow-hidden">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
                loading={index < 4 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="from-brand-900/60 to-background h-full w-full bg-gradient-to-br via-violet-900/40" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Status badges */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              {soldOut && (
                <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm">
                  Sold out
                </span>
              )}
              {free && !soldOut && (
                <span className="rounded-full bg-emerald-500/80 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm">
                  Free
                </span>
              )}
            </div>

            {/* Category */}
            {event.category && (
              <div className="absolute top-3 right-3">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
                  style={{ backgroundColor: event.category.color ?? 'rgba(99,102,241,0.75)' }}
                >
                  {event.category.name}
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col p-4">
            <h3 className="text-foreground group-hover:text-brand-400 line-clamp-2 text-[14px] leading-snug font-semibold transition-colors duration-200">
              {event.title}
            </h3>

            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{format(event.startsAt, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{format(event.startsAt, 'h:mm a')}</span>
              </div>
              {event.venue && (
                <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {event.venue.name}, {event.venue.city}
                  </span>
                </div>
              )}
            </div>

            {/* Footer: price + attendees */}
            <div className="border-border/60 mt-4 mt-auto flex items-center justify-between border-t pt-3.5">
              <div>
                {soldOut ? (
                  <span className="text-[13.5px] font-semibold text-red-500">Sold out</span>
                ) : minPrice !== null ? (
                  <span className="text-foreground text-[14px] font-bold">
                    {minPrice === 0 ? 'Free' : `From ${formatPrice(minPrice)}`}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[13px]">No tickets available</span>
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-[11.5px]">
                <Users className="h-3.5 w-3.5" />
                <span>{event._count.tickets.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
