'use client'

import { motion } from 'framer-motion'

export function EventsHero() {
  return (
    <section className="relative overflow-hidden pt-[60px]" aria-label="Page hero">
      {/* Ambient noise layer */}
      <div className="noise-texture pointer-events-none absolute inset-0" aria-hidden />

      {/* Very subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(79,70,229,0.06) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-muted-foreground mb-4 text-[12px] font-semibold tracking-[0.18em] uppercase">
            Discover
          </p>
          <h1
            className="text-foreground font-semibold tracking-tight"
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              lineHeight: 1.08,
              letterSpacing: '-0.04em',
            }}
          >
            Find your next
            <br />
            experience.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-lg text-[16px] leading-relaxed">
            Concerts, comedy, culture, nightlife, and everything happening around you.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
