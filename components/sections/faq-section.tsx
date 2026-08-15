'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'What types of bookings does SWITCH support?',
    a: 'SWITCH currently supports event ticketing, with flights, hotels, cinema, bus, tourism, parking, and membership modules rolling out progressively. Everything lives under one account so your bookings are always in one place.',
  },
  {
    q: 'How quickly do I receive my ticket after booking?',
    a: 'Instantly. As soon as payment is confirmed, your QR ticket is delivered to your email and accessible in the app. The entire process — from checkout to delivery — takes under five seconds.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major debit and credit cards, bank transfers, and popular wallets including Paystack and Flutterwave. All transactions are PCI-compliant and encrypted end-to-end.',
  },
  {
    q: 'Can I get a refund if an event is cancelled?',
    a: 'Yes. If an event is cancelled by the organiser, a full refund is automatically initiated to your original payment method within 3–5 business days. For voluntary cancellations, the policy depends on the organiser.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'The web app is fully mobile-optimised and installable as a PWA directly from your browser. Native iOS and Android apps are in active development and launching soon.',
  },
  {
    q: 'How do organisers list events on SWITCH?',
    a: 'Organisers can apply for a verified organiser account through our onboarding flow. Once approved, they get access to a full dashboard for event creation, seat mapping, pricing, and analytics.',
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

function AccordionItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false)

  return (
    <FadeIn delay={delay}>
      <div className="border-border/60 border-b last:border-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-start justify-between gap-6 py-5 text-left',
            'transition-colors duration-150',
            open ? 'text-foreground' : 'text-foreground/80 hover:text-foreground'
          )}
          aria-expanded={open}
        >
          <span className="text-[15px] leading-snug font-medium">{q}</span>
          <span className="border-border text-muted-foreground mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150">
            {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="text-muted-foreground pb-5 text-[14px] leading-[1.75]">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FadeIn>
  )
}

export function FaqSection() {
  return (
    <section className="py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
          {/* Left */}
          <FadeIn className="lg:sticky lg:top-28 lg:self-start">
            <span className="text-brand-500 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
              <span className="bg-brand-500/60 h-px w-5" />
              FAQ
            </span>
            <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
              Questions,
              <br />
              answered.
            </h2>
            <p className="text-muted-foreground mt-4 text-[15px] leading-[1.75]">
              Can&apos;t find what you&apos;re looking for?{' '}
              <a
                href="mailto:hello@switchapp.io"
                className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Email us directly.
              </a>
            </p>
          </FadeIn>

          {/* Right: accordion */}
          <div>
            {faqs.map((item, i) => (
              <AccordionItem key={item.q} {...item} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
