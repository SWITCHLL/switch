'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { EventDetail } from '@/features/events/types'

interface EventHeroProps {
  event: Pick<EventDetail, 'title' | 'imageUrl' | 'category' | 'images'>
}

export function EventHero({ event }: EventHeroProps) {
  // Build the full image list: extra images first (position > 0), with imageUrl
  // as fallback cover if images array is empty or position-0 is missing.
  const extraImages = event.images ?? []

  // Primary cover: position=0 image or imageUrl
  const primaryImage =
    extraImages.find((img) => img.position === 0)?.url ?? event.imageUrl ?? null

  // All images for the background mosaic — use up to 4
  const bgImages = primaryImage
    ? [primaryImage, ...extraImages.filter((img) => img.url !== primaryImage).map((img) => img.url)].slice(0, 4)
    : []

  const hasAnyImage = bgImages.length > 0

  // For the foreground artwork we always show the primary
  const hasPrimary = Boolean(primaryImage)

  return (
    <section
      className="relative flex min-h-[520px] items-end overflow-hidden sm:min-h-[600px] lg:min-h-[640px]"
      aria-label="Event hero"
    >
      {/* ── Blurred background ───────────────────────────────────── */}
      {hasAnyImage ? (
        <div className="absolute inset-0 scale-110" aria-hidden>
          {/* When multiple images exist, show a subtle mosaic behind the blur */}
          {bgImages.length > 1 ? (
            <div className="grid h-full w-full grid-cols-2 grid-rows-2">
              {bgImages.slice(0, 4).map((url, i) => (
                <div key={i} className="relative overflow-hidden">
                  <Image
                    src={url}
                    alt=""
                    fill
                    priority={i === 0}
                    className="object-cover object-center"
                    sizes="50vw"
                    quality={40}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Image
              src={bgImages[0]}
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
              quality={40}
            />
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/72" />
          {/* Blur */}
          <div className="absolute inset-0 backdrop-blur-2xl" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.7)_100%)]" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="from-brand-950 to-background absolute inset-0 bg-gradient-to-br" aria-hidden />
      )}

      {/* ── Foreground: sharp primary artwork ───────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 pb-12 pt-28 sm:pb-16 sm:pt-32 sm:px-8">
        {hasPrimary && (
          <motion.div
            initial={{ opacity: 0, scale: 1.04, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 w-full max-w-[260px] sm:max-w-[300px]"
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)]">
              <Image
                src={primaryImage!}
                alt={event.title}
                fill
                priority
                className="object-cover"
                sizes="300px"
                quality={90}
              />
            </div>
          </motion.div>
        )}

        {/* Category badge */}
        {event.category && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4"
          >
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase text-white"
              style={{ backgroundColor: event.category.color ?? 'rgba(99,102,241,0.8)' }}
            >
              {event.category.name}
            </span>
          </motion.div>
        )}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[800px] text-center text-[clamp(32px,6vw,68px)] font-semibold leading-[1.05] tracking-[-0.04em] text-white"
        >
          {event.title}
        </motion.h1>
      </div>
    </section>
  )
}
