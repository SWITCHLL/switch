import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ShieldCheck,
  Users,
  Banknote,
  RotateCcw,
  CalendarDays,
  Ticket,
  TrendingUp,
  ArrowRight,
  Clock,
  UsersRound,
} from 'lucide-react'
import { getSession } from '@/lib/session'
import { getAdminOverviewStats } from '@/features/admin/queries'
import { formatPrice } from '@/features/events/utils'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const stats = await getAdminOverviewStats()

  const actionItems = [
    {
      href: '/dashboard/admin/kyc',
      label: 'KYC Applications',
      description: 'Review organizer applications',
      icon: ShieldCheck,
      badge: stats.pendingKyc,
      badgeCls: 'bg-amber-500/15 text-amber-500',
      color: 'amber',
    },
    {
      href: '/dashboard/admin/payouts',
      label: 'Payout Requests',
      description: 'Approve & initiate transfers',
      icon: Banknote,
      badge: stats.pendingPayouts,
      badgeCls: 'bg-blue-500/15 text-blue-400',
      color: 'blue',
    },
    {
      href: '/dashboard/admin/refunds',
      label: 'Refund Requests',
      description: 'Process customer refunds',
      icon: RotateCcw,
      badge: stats.openRefunds,
      badgeCls: 'bg-red-500/15 text-red-400',
      color: 'red',
    },
    {
      href: '/dashboard/admin/groups',
      label: 'Group Order Refunds',
      description: 'Expired all-or-nothing groups with paid slots',
      icon: UsersRound,
      badge: stats.expiredGroupsWithPaidSlots,
      badgeCls: 'bg-orange-500/15 text-orange-400',
      color: 'orange',
    },
  ] as const

  const platformStats = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'brand' as const,
    },
    {
      label: 'Active Organizers',
      value: stats.totalOrganizers.toLocaleString(),
      icon: ShieldCheck,
      color: 'violet' as const,
    },
    {
      label: 'Live Events',
      value: stats.totalEvents.toLocaleString(),
      icon: CalendarDays,
      color: 'emerald' as const,
    },
    {
      label: 'Tickets Sold',
      value: stats.totalTickets.toLocaleString(),
      icon: Ticket,
      color: 'amber' as const,
    },
    {
      label: 'Gross Revenue',
      value: formatPrice(stats.totalRevenue),
      icon: TrendingUp,
      color: 'emerald' as const,
    },
    {
      label: 'Platform Fees',
      value: formatPrice(stats.totalFees),
      icon: TrendingUp,
      color: 'brand' as const,
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Platform management — review, approve, and process requests.
        </p>
      </div>

      {/* ── Action queues ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actionItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border-border bg-surface hover:border-brand-500/30 group flex flex-col gap-4 rounded-2xl border p-5 transition-all hover:-translate-y-px"
          >
            <div className="flex items-start justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.badgeCls)}>
                <item.icon className="h-5 w-5" />
              </div>
              {item.badge > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
                    item.badgeCls
                  )}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {item.badge} pending
                </span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[14px] font-semibold">{item.label}</p>
                <p className="text-muted-foreground mt-0.5 text-[12.5px]">{item.description}</p>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Platform stats ── */}
      <div>
        <h2 className="mb-4 text-[14px] font-semibold">Platform Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  brand: 'bg-brand-500/10 text-brand-400',
  violet: 'bg-violet-500/10 text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  orange: 'bg-orange-500/10 text-orange-400',
} as const

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: keyof typeof COLOR_MAP
}) {
  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className={cn('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl', COLOR_MAP[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[22px] font-bold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[13px] font-medium">{label}</p>
    </div>
  )
}
