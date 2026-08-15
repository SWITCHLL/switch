'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Ticket,
  Bus,
  Globe,
  ParkingCircle,
  Users,
  Zap,
  ShieldCheck,
  Smartphone,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
      <span className="bg-brand-500/60 h-px w-5" />
      {children}
    </span>
  )
}

// ─── Products — current live modules only ─────────────────────────────────────
const products = [
  {
    icon: Ticket,
    label: 'Events',
    desc: 'Concerts, sports, theatre & live shows',
    accent: '#6366f1',
  },
  { icon: Bus, label: 'Bus', desc: 'Intercity and intracity bus routes', accent: '#f97316' },
  { icon: Globe, label: 'Tourism', desc: 'Guided tours and travel packages', accent: '#10b981' },
  {
    icon: ParkingCircle,
    label: 'Parking',
    desc: 'Reserve a spot before you arrive',
    accent: '#eab308',
  },
  {
    icon: Users,
    label: 'Membership',
    desc: 'Loyalty perks and subscription rewards',
    accent: '#3b82f6',
  },
]

// ─── Platform features ────────────────────────────────────────────────────────
const platformFeatures = [
  {
    icon: Zap,
    title: 'Instant confirmation',
    desc: 'Bookings are confirmed in real time. QR tickets hit your inbox within seconds.',
    number: '01',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    desc: 'PCI-compliant checkout. Every transaction is encrypted and fraud-monitored.',
    number: '02',
  },
  {
    icon: Smartphone,
    title: 'Built for mobile',
    desc: 'A native-feeling experience designed to work perfectly on any screen size.',
    number: '03',
  },
  {
    icon: CreditCard,
    title: 'Flexible pricing',
    desc: 'Early-bird deals, group discounts, and dynamic pricing all in one place.',
    number: '04',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Header ── */}
        <FadeIn className="mb-16 max-w-[520px]">
          <SectionLabel>What we offer</SectionLabel>
          <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
            One platform.
            <br />
            Every experience.
          </h2>
          <p className="text-muted-foreground mt-4 text-[16px] leading-[1.75]">
            From live concerts to bus journeys — SWITCH brings together every kind of booking so you
            never have to juggle multiple apps again.
          </p>
        </FadeIn>

        {/* ── Products grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-5">
          {products.map((item, i) => (
            <FadeIn key={item.label} delay={i * 0.04}>
              <div
                className={cn(
                  'group border-border bg-surface relative flex flex-col gap-4 rounded-2xl border p-5',
                  'transition-all duration-300 ease-out',
                  'hover:border-border/80 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]',
                  'cursor-default'
                )}
              >
                {/* Icon */}
                <div
                  className="w-fit rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundColor: `${item.accent}14` }}
                >
                  <item.icon className="h-4.5 w-4.5" style={{ color: item.accent }} />
                </div>

                {/* Text */}
                <div>
                  <p className="text-foreground text-[13.5px] font-semibold">{item.label}</p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-[1.5]">
                    {item.desc}
                  </p>
                </div>

                {/* Subtle accent line on hover */}
                <div
                  className="absolute inset-x-5 bottom-0 h-px scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
                  style={{ backgroundColor: item.accent, opacity: 0.4 }}
                />
              </div>
            </FadeIn>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="bg-border/60 my-24 h-px sm:my-32" />

        {/* ── Platform features ── */}
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left: header */}
          <FadeIn className="lg:sticky lg:top-28 lg:self-start">
            <SectionLabel>Why SWITCH</SectionLabel>
            <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
              Built for the
              <br />
              modern traveller.
            </h2>
            <p className="text-muted-foreground mt-4 text-[16px] leading-[1.75]">
              We obsessed over every detail — from checkout speed to confirmation delivery — so
              every booking feels effortless.
            </p>

            {/* Illustration card */}
            <FadeIn delay={0.1} className="mt-10">
              <div className="border-border bg-surface overflow-hidden rounded-2xl border">
                <div className="border-border bg-surface-2 border-b px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                        <div
                          key={c}
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: c, opacity: 0.5 }}
                        />
                      ))}
                    </div>
                    <div className="bg-muted mx-auto h-5 w-40 rounded text-[10px]" />
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  {/* Mock booking confirmation */}
                  <div className="border-border flex items-center gap-3 rounded-xl border p-4">
                    <div className="bg-brand-600/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <Zap className="text-brand-500 h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold">Booking confirmed</div>
                      <div className="text-muted-foreground mt-0.5 text-[11.5px]">
                        Afrobeats Night · 2 tickets
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                      Paid
                    </div>
                  </div>
                  {[0.6, 0.4].map((w, i) => (
                    <div
                      key={i}
                      className="bg-muted/60 h-8 rounded-lg"
                      style={{ width: `${w * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </FadeIn>
          </FadeIn>

          {/* Right: feature list */}
          <div className="flex flex-col gap-0">
            {platformFeatures.map((feat, i) => (
              <FadeIn key={feat.title} delay={i * 0.06}>
                <div
                  className={cn(
                    'group flex gap-6 py-8',
                    i !== platformFeatures.length - 1 && 'border-border/60 border-b'
                  )}
                >
                  {/* Number */}
                  <span className="text-muted-foreground/50 mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums">
                    {feat.number}
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="mb-2.5 flex items-center gap-3">
                      <div className="bg-brand-500/10 group-hover:bg-brand-500/15 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200">
                        <feat.icon className="text-brand-500 h-4 w-4" />
                      </div>
                      <h3 className="text-foreground text-[15px] font-semibold tracking-[-0.02em]">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-[14px] leading-[1.7]">{feat.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
