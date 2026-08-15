'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowRight,
  Music2,
  Cpu,
  Theater,
  Laugh,
  Trophy,
  Palette,
  Mic2,
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

// ─── Category data ────────────────────────────────────────────────────────────
const categories = [
  {
    slug: 'music',
    label: 'Music',
    icon: Music2,
    count: 84,
    description: 'Concerts, festivals & live shows',
    gradient: 'from-violet-500 to-indigo-600',
    bg: 'bg-violet-500/8',
    iconColor: 'text-violet-400',
    borderHover: 'hover:border-violet-500/30',
    glowColor: 'rgba(139,92,246,0.15)',
    featured: true,
  },
  {
    slug: 'technology',
    label: 'Technology',
    icon: Cpu,
    count: 32,
    description: 'Conferences, hackathons & meetups',
    gradient: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-500/8',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/30',
    glowColor: 'rgba(59,130,246,0.15)',
    featured: false,
  },
  {
    slug: 'arts',
    label: 'Arts & Culture',
    icon: Palette,
    count: 26,
    description: 'Galleries, exhibitions & theatre',
    gradient: 'from-pink-500 to-fuchsia-600',
    bg: 'bg-pink-500/8',
    iconColor: 'text-pink-400',
    borderHover: 'hover:border-pink-500/30',
    glowColor: 'rgba(236,72,153,0.15)',
    featured: false,
  },
  {
    slug: 'comedy',
    label: 'Comedy',
    icon: Laugh,
    count: 18,
    description: 'Stand-up, open mics & comedy nights',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/8',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/30',
    glowColor: 'rgba(245,158,11,0.15)',
    featured: false,
  },
  {
    slug: 'sports',
    label: 'Sports',
    icon: Trophy,
    count: 41,
    description: 'Football, basketball & athletics',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/8',
    iconColor: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/30',
    glowColor: 'rgba(16,185,129,0.15)',
    featured: false,
  },
  {
    slug: 'theatre',
    label: 'Theatre',
    icon: Theater,
    count: 14,
    description: 'Plays, musicals & stage productions',
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-500/8',
    iconColor: 'text-rose-400',
    borderHover: 'hover:border-rose-500/30',
    glowColor: 'rgba(244,63,94,0.15)',
    featured: false,
  },
  {
    slug: 'spoken-word',
    label: 'Spoken Word',
    icon: Mic2,
    count: 9,
    description: 'Poetry, storytelling & open mics',
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-500/8',
    iconColor: 'text-indigo-400',
    borderHover: 'hover:border-indigo-500/30',
    glowColor: 'rgba(99,102,241,0.15)',
    featured: false,
  },
  {
    slug: 'film',
    label: 'Film & Cinema',
    icon: Clapperboard,
    count: 22,
    description: 'Film festivals, screenings & premieres',
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-500/8',
    iconColor: 'text-slate-400',
    borderHover: 'hover:border-slate-500/30',
    glowColor: 'rgba(100,116,139,0.15)',
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

// ─── Featured category card (large) ─────────────────────────────────────────
function FeaturedCategoryCard({ cat }: { cat: (typeof categories)[0] }) {
  const Icon = cat.icon
  const ref = useRef<HTMLAnchorElement>(null)

  return (
    <FadeIn delay={0.05}>
      <Link
        ref={ref}
        href={`/events?category=${cat.slug}`}
        className={cn(
          'group border-border relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border p-6',
          'transition-all duration-400',
          cat.borderHover,
          'hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]'
        )}
        style={{ background: 'var(--surface)' }}
      >
        {/* Ambient glow on hover — CSS custom property trick */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 30% 40%, ${cat.glowColor}, transparent)`,
          }}
        />

        {/* Gradient preview bar */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r opacity-60 transition-opacity duration-300 group-hover:opacity-100',
            cat.gradient
          )}
        />

        {/* Icon */}
        <div
          className={cn(
            'relative w-fit rounded-2xl p-3.5 transition-transform duration-300 group-hover:scale-105',
            cat.bg
          )}
        >
          <Icon className={cn('h-6 w-6', cat.iconColor)} />
        </div>

        {/* Text */}
        <div className="relative mt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-foreground text-[17px] font-semibold tracking-tight">
                {cat.label}
              </h3>
              <p className="text-muted-foreground mt-1 text-[13px] leading-[1.6]">
                {cat.description}
              </p>
            </div>
            <div
              className={cn(
                'border-border mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                'group-hover:border-border/60 group-hover:bg-muted/40 transition-all duration-200'
              )}
            >
              <ArrowRight className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold',
                cat.bg,
                cat.iconColor,
                'border-opacity-20 border-current'
              )}
            >
              {cat.count} events
            </span>
            <span className="text-muted-foreground text-[11.5px]">this month</span>
          </div>
        </div>
      </Link>
    </FadeIn>
  )
}

// ─── Regular category card ────────────────────────────────────────────────────
function CategoryCard({ cat, delay }: { cat: (typeof categories)[0]; delay: number }) {
  const Icon = cat.icon

  return (
    <FadeIn delay={delay}>
      <Link
        href={`/events?category=${cat.slug}`}
        className={cn(
          'group border-border bg-surface relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4',
          'transition-all duration-300',
          cat.borderHover,
          'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
        )}
      >
        {/* Glow on hover */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 20% 50%, ${cat.glowColor}, transparent)`,
          }}
        />

        {/* Left accent bar */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b opacity-0 transition-opacity duration-300 group-hover:opacity-70',
            cat.gradient
          )}
        />

        {/* Icon */}
        <div
          className={cn(
            'relative shrink-0 rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-105',
            cat.bg
          )}
        >
          <Icon className={cn('h-5 w-5', cat.iconColor)} />
        </div>

        {/* Text */}
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground text-[13.5px] font-semibold">{cat.label}</p>
            <span className={cn('shrink-0 text-[11px] font-medium', cat.iconColor)}>
              {cat.count}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[12px]">{cat.description}</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="text-muted-foreground/40 group-hover:text-muted-foreground relative h-3.5 w-3.5 shrink-0 transition-all duration-200 group-hover:translate-x-0.5" />
      </Link>
    </FadeIn>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function BrowseByCategorySection() {
  const featured = categories.filter((c) => c.featured)
  const rest = categories.filter((c) => !c.featured)

  return (
    <section className="bg-surface-2/60 py-24 sm:py-32">
      {/* Separator */}
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Header ── */}
        <FadeIn className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
              <span className="bg-brand-500/60 h-px w-5" />
              Categories
            </span>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">
              Browse by category
            </h2>
            <p className="text-muted-foreground mt-3 max-w-[400px] text-[15px] leading-[1.7]">
              Find exactly what you&apos;re looking for — whether it&apos;s a headline show or a
              niche underground event.
            </p>
          </div>

          <Link
            href="/events"
            className="group border-border bg-surface text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-medium transition-all duration-200"
          >
            All categories
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </FadeIn>

        {/* ── Grid layout: 1 featured + 7 regular ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {/* Featured — spans 2 rows on large screens */}
          <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
            {featured.map((cat) => (
              <FeaturedCategoryCard key={cat.slug} cat={cat} />
            ))}
          </div>

          {/* Rest — fill the grid */}
          {rest.map((cat, i) => (
            <CategoryCard key={cat.slug} cat={cat} delay={0.08 + i * 0.05} />
          ))}
        </div>

        {/* ── Bottom exploration strip ── */}
        <FadeIn delay={0.5}>
          <div className="border-border bg-surface mt-10 overflow-hidden rounded-2xl border">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground text-[14px] font-semibold">
                  Don&apos;t see your category?
                </p>
                <p className="text-muted-foreground mt-1 text-[13px]">
                  We&apos;re adding new categories every week. Request one or browse all events.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Link
                  href="/events"
                  className="group bg-foreground text-background inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold transition-opacity duration-200 hover:opacity-85"
                >
                  Browse all events
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
