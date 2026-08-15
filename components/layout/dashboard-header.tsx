'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  LogOut,
  User,
  X,
  Menu,
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { AnimatePresence, motion } from 'framer-motion'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/tickets', label: 'My Tickets', icon: Ticket },
  {
    href: '/dashboard/events',
    label: 'My Events',
    icon: CalendarDays,
    roles: ['ORGANIZER', 'ADMIN'],
  },
  { href: '/dashboard/attendees', label: 'Attendees', icon: Users, roles: ['ORGANIZER', 'ADMIN'] },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['ORGANIZER', 'ADMIN'],
  },
  { href: '/dashboard/admin', label: 'Admin', icon: ShieldCheck, roles: ['ADMIN'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface DashboardHeaderProps {
  email: string
  role: string
}

export function DashboardHeader({ email, role }: DashboardHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const initials = email.slice(0, 2).toUpperCase()

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <>
      <header className="border-border bg-background/95 sticky top-0 z-40 flex h-[60px] items-center justify-between border-b px-5 backdrop-blur-xl sm:px-8">
        {/* Left: mobile logo */}
        <Link
          href="/"
          className="text-foreground flex items-center gap-2 text-[15px] font-semibold lg:hidden"
        >
          <span className="bg-brand-600 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-white">
            S
          </span>
          SWITCH
        </Link>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="text-muted-foreground hover:text-foreground hover:bg-muted relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* Avatar / account menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="border-border flex h-8 w-8 items-center justify-center rounded-full border text-[11.5px] font-bold transition-opacity hover:opacity-80"
            >
              {initials}
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <button
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                  tabIndex={-1}
                />
                {/* Dropdown */}
                <div className="border-border bg-surface absolute top-10 right-0 z-50 w-48 overflow-hidden rounded-xl border shadow-xl">
                  <div className="border-border border-b px-4 py-3">
                    <p className="text-foreground truncate text-[13px] font-medium">{email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      Profile & Settings
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="text-muted-foreground hover:text-foreground hover:bg-muted ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors lg:hidden"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Mobile nav drawer ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />

            {/* Drawer */}
            <motion.nav
              key="mobile-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="border-border bg-surface fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r lg:hidden"
              aria-label="Mobile navigation"
            >
              {/* Logo */}
              <div className="border-border flex h-[60px] items-center border-b px-5">
                <Link
                  href="/"
                  className="text-foreground flex items-center gap-2 text-[15px] font-semibold tracking-tight transition-opacity hover:opacity-80"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="bg-brand-600 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-white">
                    S
                  </span>
                  SWITCH
                </Link>
              </div>

              {/* Nav links */}
              <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" role="list">
                {visibleNav.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-brand-500/10 text-brand-400'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* Footer */}
              <div className="border-border border-t px-3 py-3">
                <Link
                  href="/events"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] transition-colors"
                >
                  Browse events
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
