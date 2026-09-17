'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

// ─── Logo mark ────────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <Image
      src="/android-chrome-192x192.png"
      alt="SWITCH logo"
      width={28}
      height={28}
      className="rounded-md"
      priority
    />
  )
}

interface SiteHeaderProps {
  userEmail?: string | null
}

export function SiteHeader({ userEmail }: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const isLoggedIn = Boolean(userEmail)

  // Fade in after mount to avoid flash before hydration
  useEffect(() => { setMounted(true) }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-8 sm:pt-5"
      style={{ pointerEvents: 'none' }}
    >
      {/* ── Floating pill ── */}
      <div
        style={{ pointerEvents: 'auto' }}
        className={cn(
          'flex w-full max-w-[860px] items-center justify-between rounded-full px-3 py-2.5 sm:py-2 transition-opacity duration-500',
          'bg-black/50 backdrop-blur-xl sm:bg-black/40',
          'border border-white/[0.14]',
          'shadow-[0_4px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full pl-1.5 pr-3 transition-opacity hover:opacity-80"
        >
          <LogoMark />
          <span className="text-[14px] font-bold tracking-tight text-white sm:text-[13px] sm:font-semibold">
            SWITCH
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden items-center gap-0.5 md:flex" role="navigation">
          {siteConfig.mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
                pathname === item.href
                  ? 'text-white'
                  : 'text-white/55 hover:text-white/90'
              )}
            >
              {item.title}
              {pathname === item.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-white/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* ── Actions ── */}
        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 md:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white/55 transition-colors hover:text-white/90"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white transition-all hover:bg-white/15 hover:border-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                >
                  Get Started →
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Nav ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute top-[calc(100%+8px)] left-4 right-4 rounded-2xl md:hidden',
              'bg-black/60 backdrop-blur-2xl',
              'border border-white/[0.10]',
              'shadow-[0_8px_40px_rgba(0,0,0,0.5)]',
            )}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="px-4 pt-4 pb-5">
              <nav className="flex flex-col gap-0.5">
                {siteConfig.mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-white/10 text-white'
                        : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-white/55 transition-colors hover:text-white/80"
                      >
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white/80 transition-colors hover:text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-xl bg-white/15 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/20"
                    >
                      Get Started →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
