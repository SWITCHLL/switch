'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Search, CreditCard, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Discover',
    desc: 'Browse events, bus routes, tours, and parking in one place. Filter by city, date, or category to find exactly what you want.',
    visual: (
      <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
        <div className="border-border bg-muted/50 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground text-[12px]">Lagos · This weekend · Music</span>
        </div>
        {['Summer Music Festival', 'Afrobeats Night Out', 'Jazz in the Garden'].map((t, i) => (
          <div
            key={t}
            className="border-border bg-surface flex items-center gap-3 rounded-lg border p-2.5"
          >
            <div
              className="h-10 w-10 shrink-0 rounded-lg"
              style={{
                background: [
                  'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  'linear-gradient(135deg,#f43f5e,#ec4899)',
                  'linear-gradient(135deg,#10b981,#06b6d4)',
                ][i],
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-medium">{t}</div>
              <div className="text-muted-foreground mt-0.5 text-[10.5px]">
                {['Aug 12', 'Sep 04', 'Sep 19'][i]}
              </div>
            </div>
            <span className="text-brand-500 shrink-0 text-[11px] font-semibold">
              {['₦15k', '₦8.5k', '₦12k'][i]}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    number: '02',
    icon: CreditCard,
    title: 'Book in seconds',
    desc: 'Select your seats or slots, choose your payment method, and confirm. No hidden fees, no friction.',
    visual: (
      <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
        <div className="border-border rounded-lg border p-3">
          <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            Order summary
          </div>
          <div className="space-y-2">
            {['2× Standard ticket', 'Booking fee'].map((l, i) => (
              <div key={l} className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">{l}</span>
                <span className="font-medium">{['₦30,000', '₦750'][i]}</span>
              </div>
            ))}
            <div className="border-border flex items-center justify-between border-t pt-2 text-[13px] font-semibold">
              <span>Total</span>
              <span>₦30,750</span>
            </div>
          </div>
        </div>
        {/* Payment options */}
        <div className="grid grid-cols-3 gap-2">
          {['Card', 'Bank', 'Wallet'].map((p, i) => (
            <div
              key={p}
              className={cn(
                'rounded-lg border py-2 text-center text-[11px] font-medium',
                i === 0
                  ? 'border-brand-500 bg-brand-500/8 text-brand-500'
                  : 'border-border text-muted-foreground'
              )}
            >
              {p}
            </div>
          ))}
        </div>
        <div className="bg-foreground text-background rounded-lg px-4 py-2.5 text-center text-[12.5px] font-semibold">
          Confirm & Pay
        </div>
      </div>
    ),
  },
  {
    number: '03',
    icon: QrCode,
    title: 'Show up & enjoy',
    desc: 'Your QR ticket arrives instantly. Present it at the gate — digital or printed. No queues, no paper, no stress.',
    visual: (
      <div className="border-border bg-surface rounded-xl border p-4">
        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR code illustration */}
          <div className="border-brand-500/30 rounded-xl border-2 p-3.5">
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 49 }).map((_, i) => {
                const pattern = [
                  0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
                  0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
                ]
                return (
                  <div
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5 rounded-[2px]',
                      pattern[i] ? 'bg-foreground' : 'bg-transparent'
                    )}
                  />
                )
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold">Summer Music Festival</div>
            <div className="text-muted-foreground mt-0.5 text-[11.5px]">
              Gate B · Section 4 · Row C
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Valid ticket
            </div>
          </div>
        </div>
      </div>
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

export function HowItWorksSection() {
  return (
    <section className="bg-surface-2 py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* Header */}
        <FadeIn className="mb-16 text-center">
          <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
            <span className="bg-brand-500/60 h-px w-5" />
            How it works
            <span className="bg-brand-500/60 h-px w-5" />
          </span>
          <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
            Three steps to any experience.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-[440px] text-[16px] leading-[1.75]">
            We removed every unnecessary step from the booking process. Fast by design.
          </p>
        </FadeIn>

        {/* Steps */}
        <div className="relative grid gap-6 sm:grid-cols-3">
          {/* Connector line — desktop only */}
          <div
            aria-hidden
            className="bg-border/80 absolute top-[52px] right-[calc(33%+12px)] left-[calc(33%+12px)] hidden h-px sm:block"
          />

          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div className="flex flex-col gap-5">
                {/* Step header */}
                <div className="flex items-center gap-3.5">
                  <div className="border-border bg-surface relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm">
                    <step.icon className="text-brand-500 h-4.5 w-4.5" />
                    <span className="bg-brand-600 absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60 text-[10.5px] font-semibold tracking-wider uppercase">
                      Step {step.number}
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight">{step.title}</h3>
                  </div>
                </div>

                {/* Visual */}
                {step.visual}

                {/* Desc */}
                <p className="text-muted-foreground text-[13.5px] leading-[1.7]">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
