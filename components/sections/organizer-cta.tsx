import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

export function OrganizerCta() {
  return (
    <section
      className="relative overflow-hidden border-t border-border/60"
      aria-label="Create an event"
    >
      {/* ── Background: diagonal brand gradient with noise ── */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(139,92,246,0.08) 50%, transparent 100%)',
        }}
      />
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Right-side glow blob */}
      <div
        aria-hidden
        className="absolute -right-24 top-1/2 z-0 h-64 w-64 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[42ch]">
            {/* Eyebrow */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1">
              <Zap className="h-3 w-3 text-brand-400" aria-hidden />
              <span className="text-[11px] font-semibold tracking-[0.1em] text-brand-400 uppercase">
                For organisers
              </span>
            </div>

            <h2 className="text-foreground text-[20px] font-bold tracking-tight sm:text-[24px]">
              Create an event
            </h2>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              Sell tickets and manage your attendees with SWITCH.
            </p>

            {/* Social proof */}
            <p className="mt-3 text-[12.5px] text-muted-foreground/70">
              Join{' '}
              <span className="text-foreground font-semibold">200+ organisers</span>{' '}
              already using SWITCH to host their events.
            </p>
          </div>

          <Link
            href="/dashboard/events/new"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-foreground px-6 py-3 text-[13.5px] font-semibold text-background transition-all duration-200 hover:opacity-85 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:self-auto"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
