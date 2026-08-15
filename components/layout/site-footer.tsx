import Link from 'next/link'
import type { Route } from 'next'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

// ─── Logo mark (matches header) ───────────────────────────────────────────────
function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect width="22" height="22" rx="6" fill="currentColor" className="text-brand-600" />
      <path
        d="M6 11.5L10 7l6 8"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const statusItems = [{ label: 'All systems operational', ok: true }]

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-border/60 bg-surface-2 border-t">
      <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
        {/* ── Top grid ── */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <Link
              href="/"
              className="text-foreground inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <LogoMark />
              <span className="text-[15px] font-semibold tracking-tight">{siteConfig.name}</span>
            </Link>
            <p className="text-muted-foreground mt-3.5 max-w-[240px] text-[13.5px] leading-[1.7]">
              The modern booking platform for events, bus travel, tourism, and more.
            </p>

            {/* Status pill */}
            <div className="border-border bg-surface text-muted-foreground mt-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </div>
          </div>

          {/* Link groups */}
          {siteConfig.footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-muted-foreground/60 mb-4 text-[11.5px] font-semibold tracking-[0.1em] uppercase">
                {group.title}
              </p>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-[13.5px] transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div
          className={cn(
            'border-border/60 mt-14 flex flex-col gap-4 border-t pt-7',
            'sm:flex-row sm:items-center sm:justify-between'
          )}
        >
          <p className="text-muted-foreground/60 text-[12.5px]">
            &copy; {year} SWITCH Technologies Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Cookies', href: '/cookies' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href as Route}
                className="text-muted-foreground/60 hover:text-muted-foreground text-[12.5px] transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
