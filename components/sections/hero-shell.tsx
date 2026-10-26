/**
 * HeroShell — Server Component
 *
 * Renders the static parts of the hero that are known at SSR time:
 * background blobs, grain, particles, vignettes, copy, and CTAs.
 *
 * Keeping this as a Server Component means:
 * - The <h1> (LCP candidate) is in the initial HTML — no JS blocking.
 * - hero-fade animations are pure CSS — no hydration needed.
 * - <link rel="preload"> for priority poster images fires immediately.
 *
 * The interactive poster grid is a separate 'use client' component
 * (HeroPosterGrid) rendered as a child here.
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { EventListItem } from '@/features/events/types'
import { HeroPosterGrid } from './hero-poster-grid'

// ─── Particle data ────────────────────────────────────────────────────────────
interface ParticleDot {
  top: number
  left: number
  size: number
  opacity: number
  pulse?: boolean
  delay?: number
}

const PARTICLES: ParticleDot[] = [
  { top: 8,  left: 4,  size: 6, opacity: 0.90, pulse: true,  delay: 0    },
  { top: 22, left: 9,  size: 4, opacity: 0.75                            },
  { top: 38, left: 3,  size: 7, opacity: 0.85, pulse: true,  delay: 1.2  },
  { top: 55, left: 11, size: 3, opacity: 0.65                            },
  { top: 68, left: 6,  size: 6, opacity: 0.88, pulse: true,  delay: 2.4  },
  { top: 80, left: 2,  size: 4, opacity: 0.70                            },
  { top: 14, left: 18, size: 3, opacity: 0.72                            },
  { top: 45, left: 20, size: 6, opacity: 0.90, pulse: true,  delay: 0.8  },
  { top: 72, left: 16, size: 4, opacity: 0.75                            },
  { top: 90, left: 12, size: 6, opacity: 0.82, pulse: true,  delay: 3.1  },
  { top: 5,  left: 28, size: 3, opacity: 0.65                            },
  { top: 30, left: 32, size: 6, opacity: 0.88, pulse: true,  delay: 1.8  },
  { top: 62, left: 35, size: 4, opacity: 0.75                            },
  { top: 85, left: 25, size: 7, opacity: 0.85, pulse: true,  delay: 0.4  },
  { top: 10, left: 48, size: 3, opacity: 0.60                            },
  { top: 88, left: 50, size: 4, opacity: 0.70                            },
  { top: 3,  left: 55, size: 6, opacity: 0.82, pulse: true,  delay: 2.0  },
  { top: 7,  left: 65, size: 3, opacity: 0.65                            },
  { top: 35, left: 68, size: 6, opacity: 0.88, pulse: true,  delay: 1.5  },
  { top: 60, left: 62, size: 4, opacity: 0.75                            },
  { top: 82, left: 70, size: 7, opacity: 0.85, pulse: true,  delay: 3.5  },
  { top: 12, left: 78, size: 6, opacity: 0.92, pulse: true,  delay: 0.6  },
  { top: 25, left: 85, size: 4, opacity: 0.78                            },
  { top: 42, left: 92, size: 6, opacity: 0.92, pulse: true,  delay: 1.0  },
  { top: 58, left: 80, size: 3, opacity: 0.68                            },
  { top: 70, left: 88, size: 7, opacity: 0.88, pulse: true,  delay: 2.7  },
  { top: 84, left: 96, size: 4, opacity: 0.75                            },
  { top: 18, left: 74, size: 3, opacity: 0.65                            },
  { top: 50, left: 90, size: 6, opacity: 0.88, pulse: true,  delay: 0.2  },
  { top: 93, left: 82, size: 4, opacity: 0.78                            },
  { top: 6,  left: 97, size: 6, opacity: 0.90, pulse: true,  delay: 3.8  },
]

interface HeroShellProps {
  events: EventListItem[]
}

export function HeroShell({ events }: HeroShellProps) {
  const nextEvent = events[0]

  return (
    <section
      className="relative overflow-hidden pt-[88px] sm:pt-[104px]"
      style={{ backgroundColor: '#08080f', minHeight: 'clamp(620px, 92svh, 820px)' }}
      aria-label="SWITCH — Discover events"
    >
      {/* ── Red/orange blob — left ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-[0]"
        style={{
          top: '-10%',
          left: '-15%',
          width: '70%',
          height: '110%',
          background:
            'radial-gradient(ellipse at 35% 45%, rgba(192,40,10,0.72) 0%, rgba(120,20,0,0.45) 35%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* ── Purple/violet blob — right ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-[0]"
        style={{
          top: '-15%',
          right: '-15%',
          width: '65%',
          height: '110%',
          background:
            'radial-gradient(ellipse at 65% 40%, rgba(109,40,217,0.68) 0%, rgba(60,10,130,0.42) 38%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* ── Grain texture ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ── Particles ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[6]">
        {PARTICLES.map((dot, i) => (
          <span
            key={i}
            className={dot.pulse ? 'hero-dot-pulse' : undefined}
            style={{
              position: 'absolute',
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              opacity: dot.opacity,
              display: 'block',
              boxShadow:
                dot.size >= 5
                  ? `0 0 ${dot.size * 3}px ${dot.size}px rgba(255,255,255,0.35)`
                  : undefined,
              animationDelay: dot.delay != null ? `${dot.delay}s` : undefined,
            }}
          />
        ))}
      </div>

      {/* ── Center darkening vignette ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 45%, rgba(8,8,15,0.55) 0%, transparent 100%)',
        }}
      />

      {/* ── Edge vignette ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(8,8,15,0.82) 100%)',
        }}
      />

      {/* ── Bottom fade ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4]"
        style={{
          height: '140px',
          background: 'linear-gradient(to bottom, transparent 0%, #08080f 100%)',
        }}
      />

      {/* ── Poster grid — client island ── */}
      <HeroPosterGrid events={events} />

      {/* ── Central copy — rendered server-side, no JS needed ── */}
      <div className="relative z-[10] flex h-full flex-col items-center justify-center px-5 py-16 text-center sm:py-24 lg:py-28">
        {/* Eyebrow */}
        <p
          className="hero-fade mb-4 text-[10px] font-semibold tracking-[0.28em] uppercase sm:mb-6 sm:text-[11px]"
          style={{
            color: 'rgba(251,146,60,0.65)',
            animationDelay: '60ms',
          }}
        >
          [ DISCOVER EVENTS ]
        </p>

        {/* LCP element */}
        <h1
          className="hero-fade mx-auto font-bold text-white"
          style={{
            maxWidth: '12ch',
            fontSize: 'clamp(44px, 10vw, 76px)',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            animationDelay: '140ms',
          }}
        >
          Something worth{' '}
          <span style={{ color: '#c084fc' }}>going&nbsp;to</span>{' '}
          is happening.
        </h1>

        {/* Subtext */}
        <p
          className="hero-fade mt-4 text-[15px] leading-relaxed text-white/55 sm:mt-5 sm:text-[16px]"
          style={{ maxWidth: '34ch', animationDelay: '220ms' }}
        >
          Concerts, comedy, culture, sports and more — all on SWITCH.
        </p>

        {/* CTAs */}
        <div
          className="hero-fade mt-7 flex w-full max-w-[320px] flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
          style={{ animationDelay: '300ms' }}
        >
          <Link
            href="/events"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:h-11 sm:w-auto sm:px-7 sm:text-[13.5px]"
            style={{ background: 'linear-gradient(135deg, #e8430a 0%, #c0280a 100%)' }}
          >
            Explore Events
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          <Link
            href="/dashboard/events/new"
            className="flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/8 text-[15px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-white/12 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-11 sm:w-auto sm:px-7 sm:text-[13.5px]"
          >
            Create an Event
          </Link>
        </div>

        {/* Next event teaser */}
        {nextEvent && (
          <p
            className="hero-fade mt-6 text-[11.5px] text-white/25 sm:mt-7"
            style={{ animationDelay: '380ms' }}
          >
            Next up:{' '}
            <Link
              href={`/events/${nextEvent.slug}`}
              className="text-white/40 underline underline-offset-2 transition-colors hover:text-white/60"
            >
              {nextEvent.title}
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
