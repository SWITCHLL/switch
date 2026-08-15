'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    quote:
      "I used to juggle four different apps just to plan a weekend. SWITCH collapsed all of that into one. The booking flow is genuinely the fastest I've seen.",
    author: 'Amara Okonkwo',
    role: 'Product Designer, Lagos',
    initials: 'AO',
    accent: '#6366f1',
    stars: 5,
  },
  {
    quote:
      "Bought concert tickets in under 90 seconds. The QR code was in my inbox before I'd even locked my phone. That kind of speed builds trust.",
    author: 'Tunde Adeyemi',
    role: 'Software Engineer, Abuja',
    initials: 'TA',
    accent: '#8b5cf6',
    stars: 5,
  },
  {
    quote:
      'The UI is refreshingly clean — no dark patterns, no hidden fees. I finally feel like a platform is on my side rather than trying to extract money from me.',
    author: 'Chisom Eze',
    role: 'Marketing Lead, Port Harcourt',
    initials: 'CE',
    accent: '#06b6d4',
    stars: 5,
  },
  {
    quote:
      'Booking event tickets and bus routes in the same session felt unusual at first. Now I do it every week without thinking. It just works.',
    author: 'Damilola Fashola',
    role: 'Entrepreneur, Ibadan',
    initials: 'DF',
    accent: '#10b981',
    stars: 5,
  },
  {
    quote:
      'My entire team books group event tickets and intercity buses through SWITCH. The group checkout alone saves us so much back-and-forth.',
    author: 'Ngozi Obi',
    role: 'Operations Manager, Enugu',
    initials: 'NO',
    accent: '#f97316',
    stars: 5,
  },
  {
    quote:
      "I've given feedback on three features and seen two of them ship within a month. The team is clearly listening. That's rare for a consumer product.",
    author: 'Emeka Nwachi',
    role: 'Finance Analyst, Lagos',
    initials: 'EN',
    accent: '#f43f5e',
    stars: 5,
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
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function TestimonialCard({
  quote,
  author,
  role,
  initials,
  accent,
  stars,
  delay,
}: (typeof testimonials)[0] & { delay: number }) {
  return (
    <FadeIn delay={delay}>
      <div
        className={cn(
          'group border-border bg-surface flex h-full flex-col justify-between rounded-2xl border p-6',
          'hover:border-border/80 transition-all duration-300 hover:-translate-y-0.5',
          'hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)]'
        )}
      >
        {/* Stars */}
        <div className="mb-4 flex items-center gap-0.5">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-foreground/80 flex-1 text-[14px] leading-[1.75]">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {/* Author */}
        <div className="border-border/60 mt-5 flex items-center gap-3 border-t pt-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[13px] leading-tight font-semibold">{author}</div>
            <div className="text-muted-foreground mt-0.5 text-[12px]">{role}</div>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

export function TestimonialsSection() {
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* Header */}
        <FadeIn className="mb-16 flex flex-col items-center text-center">
          <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
            <span className="bg-brand-500/60 h-px w-5" />
            Testimonials
            <span className="bg-brand-500/60 h-px w-5" />
          </span>
          <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
            Loved by people who book.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-[400px] text-[16px] leading-[1.75]">
            Real feedback from real users — not cherry-picked marketing copy.
          </p>
        </FadeIn>

        {/* Masonry-ish grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.author} {...t} delay={i * 0.06} />
          ))}
        </div>

        {/* Aggregate stat */}
        <FadeIn delay={0.3} className="mt-12 flex justify-center">
          <div className="border-border bg-surface inline-flex items-center gap-4 rounded-2xl border px-6 py-4">
            <div className="flex -space-x-1.5">
              {['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'].map((c) => (
                <div
                  key={c}
                  className="border-surface h-8 w-8 rounded-full border-2"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="bg-border h-6 w-px" />
            <div>
              <div className="flex items-center gap-1 text-[13px] font-semibold">
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span>4.9 out of 5</span>
              </div>
              <div className="text-muted-foreground text-[12px]">from 2,000+ verified users</div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
