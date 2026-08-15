'use client'

import Image from 'next/image'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  type Variants,
} from 'framer-motion'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  ScanLine,
  Lock,
  Star,
  Calendar,
  MapPin,
  Heart,
  Home,
  Ticket,
  Wallet,
  User,
  Settings,
  Flame,
  Users,
  Clock,
} from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function vis(delay: number) {
  return {
    initial: 'hidden' as const,
    animate: 'visible' as const,
    variants: fadeUp,
    transition: { duration: 0.6, delay, ease: EASE },
  }
}

// ─── Cycling live-activity card ───────────────────────────────────────────────
const LIVE_MESSAGES = [
  { icon: Flame, color: 'text-orange-400', text: 'Selling Fast', sub: 'Only 12 tickets left' },
  { icon: Users, color: 'text-emerald-400', text: '3,842 attending', sub: 'Afrobeats Live Lagos' },
  { icon: Heart, color: 'text-pink-400', text: 'Friends are going', sub: 'Tobi + 4 others' },
  { icon: Clock, color: 'text-brand-400', text: 'Starts in 2 days', sub: 'TEDx Abuja 2026' },
  { icon: Zap, color: 'text-amber-400', text: 'Live Now', sub: 'Jazz Nights · Lagos' },
]

function LiveActivityCard() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LIVE_MESSAGES.length), 3000)
    return () => clearInterval(t)
  }, [])

  const msg = LIVE_MESSAGES[idx]!

  return (
    <motion.div
      {...vis(0.5)}
      className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="flex items-center gap-2"
        >
          <msg.icon className={cn('h-3.5 w-3.5 shrink-0', msg.color)} />
          <span className="text-[12.5px] font-semibold text-white">{msg.text}</span>
          <span className="text-[12px] text-white/45">{msg.sub}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Magnetic primary CTA ─────────────────────────────────────────────────────
function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 28 })
  const sy = useSpring(y, { stiffness: 300, damping: 28 })
  const shouldReduce = useReducedMotion()

  const onMove = (e: React.MouseEvent) => {
    if (shouldReduce || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * 0.2)
    y.set((e.clientY - r.top - r.height / 2) * 0.2)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'group relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-xl px-6 sm:px-7',
        'text-[14px] font-semibold text-white sm:text-[14.5px]',
        'shadow-[0_4px_24px_rgba(99,102,241,0.45)]',
        'focus-visible:outline-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
      )}
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #7c3aed 100%)',
        x: sx,
        y: sy,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }}
      />
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </motion.a>
  )
}

// ─── Secondary CTA ────────────────────────────────────────────────────────────
function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl px-6 sm:px-7',
        'border border-white/20 bg-white/6 text-[14px] font-medium text-white/80 backdrop-blur-sm sm:text-[14.5px]',
        'transition-all duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white',
        'focus-visible:outline-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
      )}
    >
      {children}
    </motion.a>
  )
}

// ─── Trust badge ──────────────────────────────────────────────────────────────
function TrustBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-white/50 sm:text-[12.5px]">
      <Icon className="text-brand-400 h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

// ─── Floating particles ───────────────────────────────────────────────────────
const PARTICLES = [
  { left: '12%', delay: 0, dur: 22, size: 1.5, opacity: 0.18 },
  { left: '28%', delay: 4, dur: 30, size: 1, opacity: 0.12 },
  { left: '45%', delay: 8, dur: 25, size: 2, opacity: 0.14 },
  { left: '60%', delay: 2, dur: 28, size: 1, opacity: 0.1 },
  { left: '72%', delay: 12, dur: 20, size: 1.5, opacity: 0.16 },
  { left: '85%', delay: 6, dur: 32, size: 1, opacity: 0.11 },
  { left: '20%', delay: 16, dur: 26, size: 2, opacity: 0.13 },
  { left: '55%', delay: 9, dur: 24, size: 1, opacity: 0.15 },
]

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ className }: { className?: string }) {
  const shouldReduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
      className={className}
      style={shouldReduce ? {} : { animation: 'phoneFloat 6s ease-in-out 1.2s infinite' }}
    >
      <style>{`
        @keyframes phoneFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes phoneFloat { from,to { transform: none; } }
        }
      `}</style>
      <div
        className="overflow-hidden rounded-[28px] border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(99,102,241,0.3)]"
        style={{ background: '#0f0f14' }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-14 rounded-full bg-white/10" />
        </div>
        {/* Screen */}
        <div className="px-3.5 pb-4">
          {/* Hero image — real crowd photo */}
          <div className="relative overflow-hidden rounded-2xl" style={{ height: 110 }}>
            <Image
              src="/live crowd energy.png"
              alt="Afrobeats Live Concert"
              fill
              className="object-cover object-center"
              sizes="200px"
            />
            {/* Darken + tint overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(109,40,217,0.35) 0%, transparent 60%)',
              }}
            />
            {/* Category badge */}
            <div className="bg-brand-600/80 absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">
              Live Music
            </div>
            {/* Event name */}
            <div className="absolute bottom-2 left-3">
              <p className="text-[10px] leading-tight font-bold text-white">
                Afrobeats Live Concert
              </p>
              <p className="text-[8.5px] text-white/60">Eko Convention Center</p>
            </div>
          </div>
          {/* Meta */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center gap-1 text-[9px] text-white/40">
              <Calendar className="h-2.5 w-2.5" />
              <span>Sat, May 18 · 7:00 PM</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-white/40">
              <Users className="h-2.5 w-2.5" />
              <span>3,842 attending</span>
              <span className="ml-auto rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[7.5px] font-semibold text-orange-400">
                🔥 12 left
              </span>
            </div>
          </div>
          {/* Ticket selector */}
          <div className="mt-2.5 space-y-1.5">
            <p className="text-[8.5px] font-semibold tracking-wider text-white/35 uppercase">
              Select Ticket Type
            </p>
            {[
              { label: 'Regular', price: '₦6,000', active: false },
              { label: 'VIP', price: '₦15,000', active: false },
              { label: 'VVIP', price: '₦30,000', active: true },
            ].map((t) => (
              <div
                key={t.label}
                className={cn(
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[9px]',
                  t.active
                    ? 'border-brand-500/50 bg-brand-600/40 border'
                    : 'border border-transparent bg-white/5'
                )}
              >
                <span className={t.active ? 'font-semibold text-white' : 'text-white/50'}>
                  {t.label}
                </span>
                <span className={t.active ? 'text-brand-300 font-bold' : 'text-white/40'}>
                  {t.price}
                </span>
              </div>
            ))}
          </div>
          {/* Buy */}
          <div
            className="mt-3 rounded-xl py-2.5 text-center text-[10.5px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            Buy Now
          </div>
        </div>
        {/* Bottom nav */}
        <div className="flex items-center justify-around border-t border-white/8 px-2 py-2">
          {[Home, Ticket, Heart, Wallet, User].map((Icon, i) => (
            <div
              key={i}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                i === 0 ? 'bg-brand-600/30' : ''
              )}
            >
              <Icon className={cn('h-3 w-3', i === 0 ? 'text-brand-400' : 'text-white/30')} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Desktop dashboard mockup ─────────────────────────────────────────────────
function DesktopMockup() {
  // Featured card uses real photo; rest get strong atmospheric tints over the same image
  const events = [
    {
      title: 'Afrobeats Live Lagos',
      date: 'Sat, May 18 · 7:00 PM',
      venue: 'Eko Convention Center',
      price: '₦5,000',
      attending: '3,842',
      category: 'Music',
      usePhoto: true,
      tint: 'rgba(109,40,217,0.45)',
      badge: '🔥 Selling Fast',
      badgeClass: 'bg-orange-500/25 text-orange-300',
    },
    {
      title: 'TEDx Abuja 2026',
      date: 'Fri, Jun 7 · 9:00 AM',
      venue: 'Landmark Centre, Abuja',
      price: '₦15,000',
      attending: '1,200',
      category: 'Tech',
      usePhoto: true,
      tint: 'rgba(30,64,175,0.55)',
      badge: '✔ Verified',
      badgeClass: 'bg-blue-500/25 text-blue-300',
    },
    {
      title: 'The Experience Lagos',
      date: 'Sun, Jun 22 · 6:00 PM',
      venue: 'Tafawa Balewa Square',
      price: '₦3,500',
      attending: '8,000+',
      category: 'Gospel',
      usePhoto: true,
      tint: 'rgba(190,24,93,0.5)',
      badge: 'Trending',
      badgeClass: 'bg-pink-500/25 text-pink-300',
    },
  ]

  const recommended = [
    { title: 'Jazz Nights', date: 'Thu, May 16 · 8:00 PM', tint: 'rgba(6,78,59,0.6)' },
    { title: 'Comedy Night Lagos', date: 'Sat, May 25 · 7:00 PM', tint: 'rgba(120,53,15,0.6)' },
    { title: 'Startup Summit 2026', date: 'Sun, May 26 · 9:00 AM', tint: 'rgba(30,58,138,0.6)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
      className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_60px_rgba(99,102,241,0.2)]"
      style={{ background: '#0d0d12' }}
    >
      <div className="flex" style={{ minHeight: 310 }}>
        {/* Sidebar */}
        <div className="flex w-[118px] shrink-0 flex-col border-r border-white/8 px-3 py-4">
          <div className="mb-4 flex items-center gap-1.5 px-1">
            <div className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-md">
              <span className="text-[9px] font-black text-white">S</span>
            </div>
            <span className="text-[11px] font-bold text-white">SWITCH</span>
          </div>
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: Ticket, label: 'Events', active: false },
            { icon: Star, label: 'Tickets', active: false },
            { icon: Heart, label: 'Favorites', active: false },
            { icon: Wallet, label: 'Wallet', active: false },
            { icon: User, label: 'Profile', active: false },
            { icon: Settings, label: 'Settings', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={cn(
                'mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium',
                active ? 'bg-brand-600/25 text-brand-300' : 'text-white/35'
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-bold text-white">Discover Events</p>
            <div className="flex items-center gap-1.5 text-[9.5px] text-white/40">
              <MapPin className="h-2.5 w-2.5" />
              Lagos, Nigeria
            </div>
          </div>
          <div className="mb-3 flex h-7 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[9.5px] text-white/30">
            Search events, artists, venues…
          </div>

          {/* Event cards */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {events.map((ev, i) => (
              <motion.div
                key={ev.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.75 + i * 0.09, ease: EASE }}
                className="overflow-hidden rounded-xl border border-white/8"
              >
                {/* Image */}
                <div className="relative h-[72px] overflow-hidden">
                  <Image
                    src="/live crowd energy.png"
                    alt={ev.title}
                    fill
                    className="object-cover object-center"
                    sizes="120px"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${ev.tint} 0%, rgba(0,0,0,0.3) 100%)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Heart */}
                  <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
                    <Heart className="h-2 w-2 text-white" />
                  </div>
                  {/* Category */}
                  <div className="absolute top-1.5 left-1.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[7px] font-semibold text-white/80 backdrop-blur-sm">
                    {ev.category}
                  </div>
                </div>
                <div className="bg-white/4 p-2">
                  <p className="text-[8.5px] leading-tight font-semibold text-white/90">
                    {ev.title}
                  </p>
                  <p className="mt-0.5 text-[7.5px] text-white/40">{ev.date}</p>
                  <p className="mt-0.5 text-[7.5px] text-white/30">{ev.venue}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-brand-400 text-[8.5px] font-bold">From {ev.price}</p>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[7px] font-semibold',
                        ev.badgeClass
                      )}
                    >
                      {ev.badge}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recommended */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9.5px] font-semibold text-white/60">Recommended For You</p>
            <span className="text-brand-400 text-[9px]">See all</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recommended.map((ev) => (
              <div key={ev.title} className="overflow-hidden rounded-lg border border-white/8">
                <div className="relative h-9 overflow-hidden">
                  <Image
                    src="/live crowd energy.png"
                    alt={ev.title}
                    fill
                    className="object-cover object-center"
                    sizes="80px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0" style={{ background: `${ev.tint}` }} />
                </div>
                <div className="bg-white/4 p-1.5">
                  <p className="text-[7.5px] leading-tight font-semibold text-white/80">
                    {ev.title}
                  </p>
                  <p className="mt-0.5 text-[7px] text-white/35">{ev.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── QR ticket popup — holographic premium ───────────────────────────────────
function TicketPopup() {
  const shouldReduce = useReducedMotion()
  const QR = [
    1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0,
    0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1,
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, y: 16 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.55, delay: 1.1, ease: EASE }}
      className="absolute right-0 bottom-[4%] z-30 w-[164px]"
      style={shouldReduce ? {} : { animation: 'ticketFloat 5s ease-in-out 1.6s infinite' }}
    >
      <style>{`
        @keyframes ticketFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(250%)  skewX(-20deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ticketFloat { from,to { transform: none; } }
          @keyframes shimmer     { from,to { transform: none; } }
        }
      `}</style>

      {/* Holographic border wrapper */}
      <div
        className="rounded-2xl p-[1px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(167,139,250,0.6) 0%, rgba(99,102,241,0.4) 30%, rgba(236,72,153,0.4) 60%, rgba(167,139,250,0.6) 100%)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ background: 'linear-gradient(160deg, #16101f 0%, #0e0d18 60%, #12101c 100%)' }}
        >
          {/* Shimmer sweep */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <div
              className="absolute inset-y-0 w-[40%]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                animation: 'shimmer 3.5s ease-in-out 2s infinite',
              }}
            />
          </div>

          {/* Header */}
          <div
            className="relative border-b border-white/10 px-3.5 py-2.5"
            style={{
              background:
                'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)',
            }}
          >
            <p className="text-brand-300 text-[8.5px] font-semibold tracking-wider uppercase">
              Your Ticket
            </p>
            <p className="mt-0.5 text-[11px] leading-tight font-bold text-white">
              Afrobeats Live Concert
            </p>
          </div>

          {/* QR code */}
          <div className="p-3">
            <div className="mb-2.5 flex justify-center">
              <div className="rounded-xl bg-white p-2 shadow-[0_0_16px_rgba(99,102,241,0.35)]">
                <div className="grid grid-cols-7 gap-[2.5px]">
                  {QR.map((v, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-[5px] w-[5px] rounded-[1px]',
                        v ? 'bg-[#1a0533]' : 'bg-transparent'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Details */}
            {[
              { label: 'Ticket ID', value: 'SW-7K38-6G2M' },
              { label: 'Date', value: 'May 19, 2026' },
              { label: 'Venue', value: 'Eko Convention Ctr' },
            ].map((row) => (
              <div key={row.label} className="mb-1.5 flex items-start justify-between gap-2">
                <span className="shrink-0 text-[8px] text-white/35">{row.label}</span>
                <span className="text-right text-[8px] leading-tight font-semibold text-white/80">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Wallet button */}
          <div
            className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[9.5px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            <Wallet className="h-3 w-3" />
            Add to Wallet
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const visualY = useTransform(scrollYProgress, [0, 1], [0, shouldReduce ? 0 : 40])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-[60px]"
      style={{ background: '#08080f', minHeight: '100svh' }}
    >
      {/* ═══════════════════════════════════════════════════════════
          BACKGROUND STACK
          1. Cinematic concert photo — blurred, darkened, low opacity
          2. Violet bloom gradients
          3. Spotlight glows (concert lighting feel)
          4. Dot grid
          5. SVG noise grain
          6. Stage floor warm glow
          7. Floating particles
          8. Vignette edges
      ═══════════════════════════════════════════════════════════ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 select-none">
        {/* 1 — Cinematic concert atmosphere photo */}
        <div className="absolute inset-0 opacity-[0.13]">
          <Image
            src="/cinematic-concert.png"
            alt=""
            fill
            priority
            className="object-cover object-center"
            style={{ filter: 'blur(32px) saturate(0.6) brightness(0.5)' }}
            sizes="100vw"
          />
        </div>

        {/* 2 — Deep violet base bloom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 110% 90% at 50% -15%, rgba(88,28,235,0.4) 0%, rgba(67,20,180,0.18) 40%, transparent 70%)',
          }}
        />

        {/* 3a — Purple spotlight left (concert lighting) */}
        <div
          className="absolute"
          style={{
            top: '-5%',
            left: '-8%',
            width: '65%',
            height: '85%',
            background:
              'radial-gradient(ellipse 55% 65% at 15% 35%, rgba(109,40,217,0.28) 0%, transparent 60%)',
            filter: 'blur(50px)',
            animation: shouldReduce ? undefined : 'spotPulse 8s ease-in-out infinite',
          }}
        />

        {/* 3b — Blue ambient right */}
        <div
          className="absolute"
          style={{
            top: '-5%',
            right: '-5%',
            width: '55%',
            height: '70%',
            background:
              'radial-gradient(ellipse 55% 55% at 85% 20%, rgba(59,130,246,0.14) 0%, transparent 65%)',
            filter: 'blur(55px)',
          }}
        />

        {/* 3c — Warm amber floor glow (stage lighting) */}
        <div
          className="absolute right-[20%] bottom-0"
          style={{
            width: '40%',
            height: '35%',
            background:
              'radial-gradient(ellipse 80% 100% at 60% 100%, rgba(251,191,36,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* 4 — Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.45) 0.5px, transparent 0.5px)',
            backgroundSize: '28px 28px',
            opacity: 0.15,
          }}
        />

        {/* 5 — SVG noise grain */}
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.055, mixBlendMode: 'overlay' }}
        >
          <filter id="hn">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hn)" />
        </svg>

        {/* 6 — Floating dust particles */}
        <style>{`
          @keyframes particleDrift { 0% { transform: translateY(100vh) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-10vh) translateX(20px); opacity: 0; } }
          @keyframes spotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
          @media (prefers-reduced-motion: reduce) {
            @keyframes particleDrift { from,to { opacity: 0; } }
            @keyframes spotPulse { from,to { opacity: 1; } }
          }
        `}</style>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: p.left,
              bottom: 0,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animation: `particleDrift ${p.dur}s ${p.delay}s linear infinite`,
            }}
          />
        ))}

        {/* 7 — Vignette edges */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#08080f] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#08080f] to-transparent" />
        <div className="absolute inset-y-0 left-0 w-36 bg-gradient-to-r from-[#08080f] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-[#08080f] to-transparent" />
      </div>

      {/* ── Page grid ── */}
      <div className="mx-auto flex max-w-[1200px] flex-col px-5 pt-10 pb-16 sm:px-8 sm:pt-14 lg:min-h-[calc(100svh-60px)] lg:flex-row lg:items-center lg:gap-14 lg:pt-16 lg:pb-20">
        {/* ── Left column ── */}
        <div className="w-full lg:max-w-[500px] lg:flex-1">
          {/* Status badge */}
          <motion.div {...vis(0)} className="mb-6">
            <span className="border-brand-500/40 bg-brand-600/15 text-brand-300 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="bg-brand-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-brand-400 relative inline-flex h-1.5 w-1.5 rounded-full" />
              </span>
              The future of live events is here
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...vis(0.08)}
            className="text-[40px] leading-[1.0] font-black tracking-[-0.04em] text-white sm:text-[52px] lg:text-[60px]"
          >
            Discover events.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Book instantly.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            {...vis(0.18)}
            className="mt-5 max-w-[440px] text-[15px] leading-[1.7] text-white/55 sm:text-[16px]"
          >
            SWITCH is the all-in-one platform to discover amazing events, book tickets securely, and
            enjoy a seamless check-in experience.
          </motion.p>

          {/* CTAs */}
          <motion.div {...vis(0.26)} className="mt-7 flex flex-wrap items-center gap-3">
            <PrimaryButton href="/events">Explore Events</PrimaryButton>
            <SecondaryButton href="/login">Become an Organizer</SecondaryButton>
          </motion.div>

          {/* Live activity cycling card */}
          <LiveActivityCard />

          {/* Trust badges */}
          <motion.div
            {...vis(0.58)}
            className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-6"
          >
            <TrustBadge icon={ShieldCheck} label="Secure Payments" />
            <TrustBadge icon={Zap} label="Instant Tickets" />
            <TrustBadge icon={ScanLine} label="Fast Check-in" />
            <TrustBadge icon={Lock} label="Fraud Protection" />
          </motion.div>

          {/* Social proof */}
          <motion.div
            {...vis(0.66)}
            className="mt-7 flex items-center gap-3 border-t border-white/8 pt-6"
          >
            <div className="flex -space-x-2">
              {['#a78bfa', '#818cf8', '#6366f1', '#4f46e5', '#7c3aed'].map((c, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[#08080f]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-0.5 text-[12px] text-white/45">
                <strong className="font-semibold text-white/80">4.9/5</strong> from 2,000+ reviews
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Right column: device composition ── */}
        <motion.div
          style={{ y: visualY }}
          className="mt-12 w-full lg:mt-0 lg:max-w-[600px] lg:flex-1"
        >
          {/* Mobile: centred phone only */}
          <div className="flex justify-center lg:hidden">
            <PhoneMockup className="w-[220px] sm:w-[260px]" />
          </div>

          {/* Desktop: full layered composition */}
          <div className="relative hidden lg:block" style={{ paddingBottom: '58%' }}>
            {/* Concert atmosphere glow behind the devices */}
            <div
              aria-hidden
              className="absolute inset-0 -z-0 rounded-3xl"
              style={{
                background:
                  'radial-gradient(ellipse 80% 70% at 55% 40%, rgba(109,40,217,0.22) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />
            {/* Dashboard — back */}
            <div className="absolute inset-x-[8%] top-0 z-10">
              <DesktopMockup />
            </div>
            {/* Phone — front left */}
            <PhoneMockup className="absolute -bottom-[2%] left-0 z-20 w-[200px]" />
            {/* Ticket popup — front right */}
            <TicketPopup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
