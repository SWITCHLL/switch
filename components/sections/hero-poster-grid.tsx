'use client'

/**
 * HeroPosterGrid — Client Component
 *
 * Isolated 'use client' island for the interactive poster thumbnails.
 * Keeping this separate from HeroShell means the hero's LCP <h1> and
 * all static chrome render in the SSR pass without any JS dependency.
 *
 * Priority images (slot 0 and 5) still get priority={true} so Next.js
 * emits <link rel="preload"> for them — but now those preloads appear
 * in the SSR HTML because the parent (HeroShell) is a Server Component
 * that can inline the <Image> preload hints.
 *
 * framer-motion is NOT imported here — reduced-motion is handled purely
 * via CSS @media (prefers-reduced-motion) in globals.css, keeping this
 * component's JS footprint minimal.
 */

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { EventListItem } from '@/features/events/types'

// ─── Viewport hook ────────────────────────────────────────────────────────────
function useIsDesktop(breakpoint = 1024): boolean {
  // Start as false — avoids loading desktop images on mobile SSR/hydration.
  // Flips to true on the client if viewport matches.
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isDesktop
}

// ─── Slot config ──────────────────────────────────────────────────────────────
interface PosterSlot {
  eventIndex: number
  w: number
  h: number
  className: string
  rotation?: string
  priority?: boolean
}

const DESKTOP_SLOTS: PosterSlot[] = [
  { eventIndex: 0, w: 210, h: 278, className: 'hidden lg:block absolute left-[2%]  top-[10%]', rotation: '-1.5deg', priority: true  },
  { eventIndex: 1, w: 155, h: 205, className: 'hidden lg:block absolute left-[15%] top-[45%]', rotation: '1deg'                      },
  { eventIndex: 2, w: 178, h: 236, className: 'hidden xl:block absolute left-[27%] top-[7%]',  rotation: '-0.8deg'                   },
  { eventIndex: 3, w: 178, h: 236, className: 'hidden xl:block absolute right-[27%] top-[9%]', rotation: '0.8deg'                    },
  { eventIndex: 4, w: 155, h: 205, className: 'hidden lg:block absolute right-[15%] top-[47%]', rotation: '-1deg'                    },
  { eventIndex: 5, w: 210, h: 278, className: 'hidden lg:block absolute right-[2%]  top-[8%]',  rotation: '1.5deg',  priority: true  },
  { eventIndex: 6, w: 125, h: 165, className: 'hidden xl:block absolute left-[7%]  bottom-[7%]', rotation: '1.2deg'                  },
  { eventIndex: 7, w: 125, h: 165, className: 'hidden xl:block absolute right-[7%] bottom-[5%]', rotation: '-1deg'                   },
]

const MOBILE_SLOTS: PosterSlot[] = [
  { eventIndex: 0, w: 130, h: 172, className: 'absolute left-[-2%] bottom-[-4%]',  rotation: '-2deg' },
  { eventIndex: 1, w: 118, h: 156, className: 'absolute left-[30%] bottom-[-6%]',  rotation: '1deg'  },
  { eventIndex: 2, w: 124, h: 164, className: 'absolute right-[-2%] bottom-[-4%]', rotation: '2deg'  },
]

// ─── Poster ───────────────────────────────────────────────────────────────────
function Poster({
  event,
  w,
  h,
  className,
  rotation = '0deg',
  priority = false,
  delay = 0,
  loadImage = true,
}: PosterSlot & { event: EventListItem | undefined; delay?: number; loadImage?: boolean }) {
  const [hovered, setHovered] = useState(false)

  if (!event) return null

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`${className} poster-fade-in group`}
      style={{
        width: w,
        height: h,
        position: 'absolute',
        // CSS handles reduced-motion via @media (prefers-reduced-motion) in globals.css
        animationDelay: `${delay}ms`,
      }}
      aria-label={event.title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[14px] transition-all duration-300"
        style={{
          transform: hovered
            ? 'scale(1.04) rotate(0deg) translateY(-4px)'
            : rotation !== '0deg' ? `rotate(${rotation})` : undefined,
          boxShadow: hovered
            ? '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.15)'
            : '0 8px 40px rgba(0,0,0,0.4)',
          transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms ease',
        }}
      >
        {loadImage && event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt=""
            width={w}
            height={h}
            className="h-full w-full object-cover object-center"
            sizes={`${w}px`}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="bg-[#1a1a18] flex h-full w-full flex-col items-center justify-center gap-3 p-4">
            <div className="h-px w-6 bg-white/15" />
            <p className="text-center text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase">
              {(event.category?.name ?? 'SWITCH').slice(0, 6)}
            </p>
            <div className="h-px w-6 bg-white/15" />
          </div>
        )}

        {/* Glass name pill on hover */}
        <div
          className="absolute inset-x-0 bottom-0 p-2 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0 }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1.5 backdrop-blur-md">
            <p className="flex-1 truncate text-[10px] font-semibold leading-tight text-white">
              {event.title}
            </p>
            <ArrowUpRight className="h-3 w-3 shrink-0 text-white/60" />
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
export function HeroPosterGrid({ events }: { events: EventListItem[] }) {
  const isDesktop = useIsDesktop(1024)

  return (
    <>
      {/* Desktop posters */}
      {DESKTOP_SLOTS.map((slot, i) => (
        <Poster
          key={i}
          {...slot}
          event={events[slot.eventIndex]}
          delay={i * 55}
          loadImage={isDesktop}
        />
      ))}

      {/* Mobile posters */}
      {MOBILE_SLOTS.map((slot, i) => (
        <Poster
          key={`m-${i}`}
          {...slot}
          event={events[slot.eventIndex]}
          delay={350 + i * 75}
          className={slot.className + ' lg:hidden'}
          loadImage={false}
        />
      ))}
    </>
  )
}
