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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

// Curated short list — 5 items max for bottom nav ergonomics
const USER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const ORGANIZER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/events', label: 'Events', icon: CalendarDays },
  { href: '/dashboard/attendees', label: 'Attendees', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
]

interface MobileBottomNavProps {
  role: string
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname()
  const items = role === 'ORGANIZER' || role === 'ADMIN' ? ORGANIZER_NAV : USER_NAV

  return (
    <nav
      className="border-border bg-background/95 fixed right-0 bottom-0 left-0 z-40 flex items-stretch border-t backdrop-blur-xl lg:hidden"
      aria-label="Bottom navigation"
    >
      {items.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-brand-400' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon
              className={cn('h-5 w-5', isActive ? 'text-brand-400' : 'text-muted-foreground')}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
