'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="pt-0 pb-24 sm:pb-32">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-foreground relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-16 sm:py-24"
        >
          {/* ── Subtle texture — geometric, not blobs ── */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%)',
            }}
          />
          {/* Fine grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* ── Content ── */}
          <div className="relative">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[12px] font-medium text-white/70">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="bg-brand-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                  <span className="bg-brand-400 relative inline-flex h-1.5 w-1.5 rounded-full" />
                </span>
                Free to get started
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-[36px] leading-[1.1] font-semibold tracking-[-0.04em] text-white sm:text-[52px]"
            >
              Stop switching apps.
              <br />
              Start{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 50%, #67e8f9 100%)',
                }}
              >
                using SWITCH.
              </span>
            </motion.h2>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-5 max-w-[420px] text-[16px] leading-[1.75] text-white/60"
            >
              Every event, bus route, tour, and parking spot — booked in seconds from one place.
              Join thousands of people who already made the switch.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/sign-up"
                className={cn(
                  'group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[14.5px] font-semibold text-zinc-900',
                  'transition-all duration-200 hover:bg-white/90',
                  'shadow-[0_2px_12px_rgba(0,0,0,0.25)]'
                )}
              >
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/events"
                className={cn(
                  'inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-7',
                  'text-[14.5px] font-medium text-white/80',
                  'transition-all duration-200 hover:border-white/30 hover:bg-white/12 hover:text-white'
                )}
              >
                Browse events
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.42, duration: 0.4 }}
              className="mt-7 text-[12.5px] text-white/35"
            >
              No credit card required · Cancel anytime · 2,000+ users
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
