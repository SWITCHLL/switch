'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bell,
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'

interface DashboardHeaderProps {
  email: string
  role: string
}

export function DashboardHeader({ email, role: _role }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 flex h-[60px] items-center justify-between border-b px-4 backdrop-blur-xl sm:px-8">
      {/* Left: mobile logo (hidden on desktop where sidebar has the logo) */}
      <Link
        href="/"
        className="text-foreground flex items-center gap-2 text-[15px] font-semibold lg:hidden"
      >
        <Image
          src="/android-chrome-192x192.png"
          alt="SWITCH logo"
          width={26}
          height={26}
          className="rounded-md"
          priority
        />
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
                    Profile &amp; Settings
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
      </div>
    </header>
  )
}
