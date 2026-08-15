'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// ─── Brand mark SVGs rendered inline (no image requests, no layout shift) ────
const brands = [
  {
    name: 'Zenith Bank',
    svg: (
      <svg viewBox="0 0 120 32" fill="none" className="h-6 w-auto">
        <rect x="0" y="8" width="16" height="16" rx="2" fill="currentColor" opacity="0.8" />
        <text
          x="22"
          y="22"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          Zenith
        </text>
      </svg>
    ),
  },
  {
    name: 'GTBank',
    svg: (
      <svg viewBox="0 0 100 32" fill="none" className="h-6 w-auto">
        <circle cx="14" cy="16" r="10" stroke="currentColor" strokeWidth="2" opacity="0.8" />
        <text
          x="30"
          y="21"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          GTBank
        </text>
      </svg>
    ),
  },
  {
    name: 'Flutterwave',
    svg: (
      <svg viewBox="0 0 140 32" fill="none" className="h-6 w-auto">
        <path
          d="M4 24 Q12 8 20 16 Q28 24 36 12"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <text
          x="44"
          y="21"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          Flutterwave
        </text>
      </svg>
    ),
  },
  {
    name: 'Paystack',
    svg: (
      <svg viewBox="0 0 110 32" fill="none" className="h-6 w-auto">
        <rect x="2" y="10" width="18" height="4" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="2" y="18" width="12" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <text
          x="26"
          y="21"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          Paystack
        </text>
      </svg>
    ),
  },
  {
    name: 'Moniepoint',
    svg: (
      <svg viewBox="0 0 130 32" fill="none" className="h-6 w-auto">
        <polygon points="10,6 20,22 0,22" fill="currentColor" opacity="0.7" />
        <text
          x="28"
          y="21"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          Moniepoint
        </text>
      </svg>
    ),
  },
  {
    name: 'Kuda Bank',
    svg: (
      <svg viewBox="0 0 100 32" fill="none" className="h-6 w-auto">
        <path
          d="M4 6v20M4 16l12-10M4 16l12 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <text
          x="24"
          y="21"
          fontSize="14"
          fontWeight="700"
          fill="currentColor"
          fontFamily="system-ui"
        >
          Kuda
        </text>
      </svg>
    ),
  },
]

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
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function TrustedBySection() {
  return (
    <section className="border-border/60 bg-surface-2 border-y py-16">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <FadeIn className="mb-10 text-center">
          <p className="text-muted-foreground/60 text-[12px] font-semibold tracking-[0.12em] uppercase">
            Trusted by teams at
          </p>
        </FadeIn>

        {/* Logo row */}
        <FadeIn delay={0.05}>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
            {brands.map(({ name, svg }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.4 }}
                whileHover={{ opacity: 1, scale: 1.04 }}
                className="text-foreground/30 hover:text-foreground/65 transition-all duration-300"
              >
                {svg}
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
