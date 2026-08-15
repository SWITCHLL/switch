'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface DashboardSidebarProps {
  role: string
}

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname()

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <aside className="border-border bg-surface hidden w-[220px] shrink-0 border-r lg:flex lg:flex-col">
      {/* Logo */}
      <div className="border-border flex h-[60px] items-center border-b px-5">
        <Link
          href="/"
          className="text-foreground flex items-center gap-2 text-[15px] font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <span className="bg-brand-600 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-white">
            S
          </span>
          SWITCH
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        <ul className="space-y-0.5" role="list">
          {visible.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
                  {isActive && <ChevronRight className="text-brand-400/60 ml-auto h-3 w-3" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-border space-y-1 border-t px-3 py-3">
        {/* Become an Organizer CTA — only for regular users */}
        {role === 'USER' && (
          <Link
            href="/dashboard/become-organizer"
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors',
              pathname.startsWith('/dashboard/become-organizer')
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-violet-400 hover:bg-violet-500/10 hover:text-violet-300'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Become an Organizer
          </Link>
        )}
        <Link
          href="/events"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] transition-colors"
        >
          Browse events
        </Link>
      </div>
    </aside>
  )
}
