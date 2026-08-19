'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'

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
  /** Pass the user's email from a server component when logged in */
  userEmail?: string | null
}

export function SiteHeader({ userEmail }: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const isLoggedIn = Boolean(userEmail)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/90 border-border/60 border-b shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between px-5 sm:px-8">
        {/* ── Logo ── */}
        <Link
          href="/"
          className="text-foreground flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">{siteConfig.name}</span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden items-center gap-0.5 md:flex" role="navigation">
          {siteConfig.mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                'hover:text-foreground',
                pathname === item.href ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {item.title}
              {pathname === item.href && (
                <motion.span
                  layoutId="nav-indicator"
                  className="bg-foreground/60 absolute inset-x-1.5 -bottom-px h-px rounded-full"
                />
              )}
            </Link>
          ))}
        </nav>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-1.5 md:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13.5px] font-medium',
                      'border-border border bg-transparent',
                      'text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200',
                      'focus-visible:outline-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                    )}
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
                  className="text-muted-foreground hover:text-foreground rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    'inline-flex items-center rounded-lg px-4 py-2 text-[13.5px] font-medium',
                    'bg-foreground text-background',
                    'transition-all duration-200 hover:opacity-85',
                    'focus-visible:outline-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                  )}
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Nav ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-border/60 bg-background/95 border-t backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto max-w-[1120px] px-5 pt-3 pb-6 sm:px-8">
              <nav className="flex flex-col gap-0.5">
                {siteConfig.mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
              <div className="border-border/60 mt-5 flex flex-col gap-2 border-t pt-5">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="border-border hover:bg-muted inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="border-border hover:bg-muted text-muted-foreground w-full rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors"
                      >
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="border-border hover:bg-muted rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/login"
                      className="bg-foreground text-background rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-85"
                    >
                      Get started
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
