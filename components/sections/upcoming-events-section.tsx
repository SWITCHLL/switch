'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Calendar, MapPin, Star, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

// ─── Sample event data ────────────────────────────────────────────────────────
// image: which photo to use  tint: colour overlay so every card looks distinct
const events = [
  {
    id: '1',
    title: 'Summer Music Festival',
    category: 'Music',
    date: 'Aug 12, 2026',
    time: '6:00 PM',
    venue: 'Eko Hotel & Suites',
    city: 'Lagos',
    price: '₦15,000',
    originalPrice: '₦20,000',
    rating: 4.9,
    attendees: 2400,
    spotsLeft: 42,
    image: '/live crowd energy.png',
    tint: 'rgba(109,40,217,0.45)',
    badge: 'Selling fast',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    featured: true,
  },
  {
    id: '2',
    title: 'Tech Conference 2026',
    category: 'Technology',
    date: 'Sep 03, 2026',
    time: '9:00 AM',
    venue: 'ICC Abuja',
    city: 'Abuja',
    price: '₦25,000',
    originalPrice: null,
    rating: 4.8,
    attendees: 800,
    spotsLeft: 180,
    image: '/cinematic-concert.png',
    tint: 'rgba(30,64,175,0.55)',
    badge: 'New',
    badgeColor: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
    featured: false,
  },
  {
    id: '3',
    title: 'Afrobeats Night Out',
    category: 'Music',
    date: 'Oct 18, 2026',
    time: '8:00 PM',
    venue: 'Genesis Cinema',
    city: 'Port Harcourt',
    price: '₦8,500',
    originalPrice: null,
    rating: 4.9,
    attendees: 1200,
    spotsLeft: 320,
    image: '/live crowd energy.png',
    tint: 'rgba(190,24,93,0.50)',
    badge: null,
    badgeColor: '',
    featured: false,
  },
  {
    id: '4',
    title: 'Jazz in the Garden',
    category: 'Music',
    date: 'Nov 05, 2026',
    time: '5:00 PM',
    venue: 'Muri Okunola Park',
    city: 'Lagos',
    price: '₦12,000',
    originalPrice: null,
    rating: 4.7,
    attendees: 600,
    spotsLeft: 210,
    image: '/cinematic-concert.png',
    tint: 'rgba(6,78,59,0.55)',
    badge: null,
    badgeColor: '',
    featured: false,
  },
  {
    id: '5',
    title: 'Lagos Fashion Week',
    category: 'Fashion',
    date: 'Nov 12, 2026',
    time: '3:00 PM',
    venue: 'Oriental Hotel',
    city: 'Lagos',
    price: '₦35,000',
    originalPrice: null,
    rating: 5.0,
    attendees: 1800,
    spotsLeft: 55,
    image: '/live crowd energy.png',
    tint: 'rgba(157,23,77,0.50)',
    badge: 'Limited',
    badgeColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    featured: false,
  },
  {
    id: '6',
    title: 'Comedy Nite Lagos',
    category: 'Comedy',
    date: 'Dec 01, 2026',
    time: '7:00 PM',
    venue: 'Terra Kulture',
    city: 'Lagos',
    price: '₦10,000',
    originalPrice: null,
    rating: 4.8,
    attendees: 950,
    spotsLeft: 400,
    image: '/cinematic-concert.png',
    tint: 'rgba(120,53,15,0.55)',
    badge: null,
    badgeColor: '',
    featured: false,
  },
]

// ─── Shared entrance ─────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Featured event card (large) ─────────────────────────────────────────────
function FeaturedEventCard({ event, delay }: { event: (typeof events)[0]; delay: number }) {
  return (
    <FadeIn delay={delay} className="h-full">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/events/${event.id}` as any} className="group block h-full">
        <div
          className={cn(
            'relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl',
            'border-border border',
            'transition-all duration-500',
            'hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(0,0,0,0.2)]'
          )}
        >
          {/* Real photo background */}
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 420px"
          />

          {/* Colour tint overlay — makes each card distinct */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${event.tint} 0%, rgba(0,0,0,0.2) 100%)`,
            }}
          />

          {/* Legibility overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Badge */}
          {event.badge && (
            <div className="absolute top-4 left-4">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                  event.badgeColor
                )}
              >
                {event.badge}
              </span>
            </div>
          )}

          {/* Category pill */}
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              {event.category}
            </span>
          </div>

          {/* Content */}
          <div className="relative p-6">
            <p className="text-[11.5px] font-semibold tracking-wider text-white/60 uppercase">
              Featured Event
            </p>
            <h3 className="mt-1.5 text-[22px] leading-tight font-semibold tracking-tight text-white">
              {event.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                <Calendar className="h-3.5 w-3.5" />
                {event.date} · {event.time}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-white/70">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue}, {event.city}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[20px] font-bold text-white">{event.price}</span>
                  {event.originalPrice && (
                    <span className="ml-2 text-[13px] text-white/40 line-through">
                      {event.originalPrice}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {event.rating}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[11.5px] font-medium text-white">
                  <Users className="h-3 w-3" />
                  {event.attendees.toLocaleString()}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-all duration-200 group-hover:bg-white/25">
                  <ArrowRight className="h-4 w-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Spots left indicator */}
            {event.spotsLeft < 100 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white/60"
                    style={{ width: `${Math.max(10, 100 - (event.spotsLeft / 50) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-white/60">{event.spotsLeft} spots left</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </FadeIn>
  )
}

// ─── Regular event card ───────────────────────────────────────────────────────
function EventCard({ event, delay }: { event: (typeof events)[0]; delay: number }) {
  return (
    <FadeIn delay={delay}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={`/events/${event.id}` as any} className="group block">
        <div
          className={cn(
            'border-border bg-surface overflow-hidden rounded-2xl border',
            'transition-all duration-300',
            'hover:border-border/80 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
          )}
        >
          {/* Image area */}
          <div className="relative h-[130px] overflow-hidden">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
              loading="lazy"
            />
            {/* Colour tint */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${event.tint} 0%, rgba(0,0,0,0.15) 100%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Badge */}
            {event.badge && (
              <div className="absolute top-3 left-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
                    event.badgeColor
                  )}
                >
                  {event.badge}
                </span>
              </div>
            )}

            {/* Category */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {event.category}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-foreground group-hover:text-brand-400 line-clamp-1 text-[13.5px] leading-tight font-semibold transition-colors duration-200">
              {event.title}
            </h3>

            <div className="mt-2 space-y-1.5">
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11.5px]">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{event.date}</span>
                <span>·</span>
                <Clock className="h-3 w-3 shrink-0" />
                <span>{event.time}</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11.5px]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {event.venue}, {event.city}
                </span>
              </div>
            </div>

            <div className="border-border/60 mt-3.5 flex items-center justify-between border-t pt-3">
              <div>
                <span className="text-foreground text-[14px] font-bold">{event.price}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-[11px]">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  <span className="text-muted-foreground font-medium">{event.rating}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Users className="h-2.5 w-2.5" />
                  <span>
                    {event.attendees >= 1000
                      ? `${(event.attendees / 1000).toFixed(1)}k`
                      : event.attendees}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </FadeIn>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function UpcomingEventsSection() {
  const featured = events.filter((e) => e.featured)
  const rest = events.filter((e) => !e.featured)

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Header ── */}
        <FadeIn className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
              <span className="bg-brand-500/60 h-px w-5" />
              Upcoming Events
            </span>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">
              What&apos;s happening near you
            </h2>
            <p className="text-muted-foreground mt-3 max-w-[440px] text-[15px] leading-[1.7]">
              From live concerts to tech summits — handpicked events across Nigeria, updated weekly.
            </p>
          </div>

          <Link
            href="/events"
            className="group border-border bg-surface text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-medium transition-all duration-200"
          >
            View all events
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </FadeIn>

        {/* ── Layout: featured large + grid ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] lg:gap-5">
          {/* Featured card */}
          <div className="row-span-2">
            {featured.map((ev, i) => (
              <FeaturedEventCard key={ev.id} event={ev} delay={i * 0.05} />
            ))}
          </div>

          {/* Regular grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-4">
            {rest.map((ev, i) => (
              <EventCard key={ev.id} event={ev} delay={0.1 + i * 0.06} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA strip ── */}
        <FadeIn delay={0.4}>
          <div className="border-border bg-surface mt-10 flex items-center justify-center gap-4 rounded-2xl border px-6 py-5">
            <div className="text-muted-foreground flex items-center gap-2.5 text-[13.5px]">
              <span className="relative flex h-2 w-2">
                <span className="bg-brand-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                <span className="bg-brand-400 relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span>
                <strong className="text-foreground font-semibold">200+ events</strong> listed this
                month
              </span>
            </div>
            <div className="bg-border hidden h-4 w-px sm:block" />
            <Link
              href="/events"
              className="group text-brand-500 hidden items-center gap-1.5 text-[13.5px] font-medium transition-opacity hover:opacity-80 sm:inline-flex"
            >
              Browse all
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
