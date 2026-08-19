'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EventAboutProps {
  description: string
}

const COLLAPSE_THRESHOLD = 420 // characters

export function EventAbout({ description }: EventAboutProps) {
  const isLong = description.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)

  const displayText = isLong && !expanded ? description.slice(0, COLLAPSE_THRESHOLD) : description

  const paragraphs = displayText
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <section aria-labelledby="about-heading">
      <h2
        id="about-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        About this event
      </h2>

      <div className="relative">
        <div
          className={cn(
            'text-[16px] leading-[1.8] text-white/75 transition-all',
            !expanded && isLong && 'line-clamp-[8]'
          )}
        >
          {description.split('\n').map((line, i) =>
            line.trim() ? (
              <p key={i} className="mb-4 last:mb-0">
                {line}
              </p>
            ) : null
          )}
        </div>

        {/* Gradient fade on collapsed state */}
        {isLong && !expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent"
          />
        )}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-3 text-[13.5px] font-medium transition-colors',
            'text-white/50 hover:text-white/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md px-1'
          )}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </section>
  )
}
