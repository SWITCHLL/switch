'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { EventDetail } from '@/features/events/types'

type GalleryImage = Pick<EventDetail['images'][number], 'id' | 'url' | 'position'>

interface EventGalleryProps {
  images: GalleryImage[]
  eventTitle: string
}

export function EventGallery({ images, eventTitle }: EventGalleryProps) {
  // Need at least 2 to show a gallery (single image is already shown in hero)
  if (images.length < 2) return null

  return <GalleryInner images={images} eventTitle={eventTitle} />
}

function GalleryInner({
  images,
  eventTitle,
}: {
  images: GalleryImage[]
  eventTitle: string
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const open = (i: number) => setLightboxIndex(i)
  const close = () => setLightboxIndex(null)
  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length))
  }, [images.length])
  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, prev, next])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightboxIndex])

  // Grid layout varies by count
  const count = images.length
  const preview = images.slice(0, Math.min(count, 5))
  const remaining = count - preview.length

  return (
    <section aria-labelledby="gallery-heading">
      <h2
        id="gallery-heading"
        className="mb-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        <Images className="h-3.5 w-3.5" aria-hidden />
        Photos
        <span className="text-white/25">({count})</span>
      </h2>

      {/* ── Grid ── */}
      <div
        className={cn(
          'grid gap-2 overflow-hidden rounded-2xl',
          count === 2 && 'grid-cols-2',
          count === 3 && 'grid-cols-3',
          count >= 4 && 'grid-cols-2 sm:grid-cols-3'
        )}
        role="list"
        aria-label={`${eventTitle} photo gallery`}
      >
        {preview.map((img, i) => {
          const isLast = i === preview.length - 1 && remaining > 0
          return (
            <div
              key={img.id}
              role="listitem"
              className={cn(
                // Make the first image span 2 cols when we have 4+ images
                count >= 4 && i === 0 && 'col-span-2 sm:col-span-1',
                // When exactly 4, first spans full row on mobile
                count === 4 && i === 0 && 'col-span-2',
              )}
            >
              <button
                onClick={() => open(i)}
                className="group relative block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label={`View photo ${i + 1} of ${count}`}
              >
                <div
                  className={cn(
                    'relative w-full overflow-hidden',
                    count === 2 ? 'aspect-[4/3]' : 'aspect-square'
                  )}
                >
                  <Image
                    src={img.url}
                    alt={`${eventTitle} — photo ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 33vw"
                    loading={i < 2 ? 'eager' : 'lazy'}
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />

                  {/* "Show more" overlay on last visible tile */}
                  {isLast && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px]">
                      <span className="text-[22px] font-semibold text-white">+{remaining}</span>
                      <span className="mt-1 text-[12px] text-white/70">more photos</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Photo lightbox"
          >
            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-4 max-h-[85svh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <Image
                  src={images[lightboxIndex].url}
                  alt={`${eventTitle} — photo ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1280px) 100vw, 900px"
                  quality={90}
                  priority
                />
              </div>

              {/* Counter */}
              <p className="mt-3 text-center text-[13px] text-white/50">
                {lightboxIndex + 1} / {count}
              </p>
            </motion.div>

            {/* Controls */}
            {count > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev() }}
                  aria-label="Previous photo"
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next() }}
                  aria-label="Next photo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Close */}
            <button
              onClick={close}
              aria-label="Close lightbox"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Thumbnail strip */}
            {count > 2 && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 px-4">
                <div className="flex gap-2 overflow-x-auto rounded-xl bg-black/40 p-2 backdrop-blur-sm">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === lightboxIndex}
                      className={cn(
                        'relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all',
                        i === lightboxIndex
                          ? 'ring-2 ring-white opacity-100'
                          : 'opacity-50 hover:opacity-80'
                      )}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
