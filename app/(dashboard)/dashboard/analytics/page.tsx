import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TrendingUp, Ticket, CalendarDays, Users, BarChart3, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { db } from '@/lib/db'
import { formatPrice } from '@/features/events/utils'
import { format, subDays, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const now = new Date()
  const thirtyDaysAgo = startOfDay(subDays(now, 29))

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const [
    totalEvents,
    publishedEvents,
    totalTickets,
    upcomingEvents,
    soldSeatsAgg,
    recentTickets,
    topEvents,
    ticketTypeRevenue,
    refundStats,
    draftCount,
    cancelledCount,
    completedCount,
  ] = await Promise.all([
    db.event.count({ where: { organizerId: organizer.id } }),
    db.event.count({ where: { organizerId: organizer.id, status: 'PUBLISHED' } }),
    db.ticket.count({ where: { event: { organizerId: organizer.id } } }),
    db.event.count({
      where: {
        organizerId: organizer.id,
        status: 'PUBLISHED',
        startsAt: { gte: now },
      },
    }),
    db.eventSeat.aggregate({
      where: { event: { organizerId: organizer.id }, status: 'SOLD' },
      _sum: { price: true },
    }),
    // Tickets in last 30 days grouped by day
    db.ticket.findMany({
      where: {
        event: { organizerId: organizer.id },
        issuedAt: { gte: thirtyDaysAgo },
      },
      select: { issuedAt: true },
      orderBy: { issuedAt: 'asc' },
    }),
    // Top 5 events by tickets sold
    db.event.findMany({
      where: { organizerId: organizer.id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        startsAt: true,
        _count: { select: { tickets: true } },
        ticketTypes: { select: { price: true, sold: true, currency: true } },
      },
      orderBy: { tickets: { _count: 'desc' } },
      take: 5,
    }),
    // Revenue by ticket type
    db.ticketType.findMany({
      where: { event: { organizerId: organizer.id } },
      select: { name: true, price: true, sold: true, currency: true },
      orderBy: { sold: 'desc' },
      take: 10,
    }),
    // Refund stats
    db.refundRequest.aggregate({
      where: { event: { organizerId: organizer.id } },
      _count: true,
    }),
    db.event.count({ where: { organizerId: organizer.id, status: 'DRAFT' } }),
    db.event.count({ where: { organizerId: organizer.id, status: 'CANCELLED' } }),
    db.event.count({ where: { organizerId: organizer.id, status: 'COMPLETED' } }),
  ])

  const totalRevenue = soldSeatsAgg._sum.price ?? 0
  const averageTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0
  const refundCount = refundStats._count
  const refundRate = totalTickets > 0 ? ((refundCount / totalTickets) * 100).toFixed(1) : '0'

  // ── Build daily ticket counts for the sparkline ────────────────────────────
  const dailyMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    dailyMap.set(format(subDays(now, 29 - i), 'yyyy-MM-dd'), 0)
  }
  for (const t of recentTickets) {
    const key = format(t.issuedAt, 'yyyy-MM-dd')
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
  }
  const dailyData = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))
  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1)

  const stats = [
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'amber' },
    { label: 'Avg Ticket Price', value: formatPrice(averageTicketPrice), icon: Ticket, color: 'emerald' },
    { label: 'Published Events', value: publishedEvents, icon: CalendarDays, color: 'brand' },
    { label: 'Upcoming Events', value: upcomingEvents, icon: Users, color: 'violet' },
  ] as const

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Overview of your events and ticket sales.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Daily sales chart (30 days) ── */}
        <div className="border-border bg-surface rounded-2xl border p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold">Ticket Sales</h2>
              <p className="text-muted-foreground mt-0.5 text-[12px]">Last 30 days</p>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold">{recentTickets.length}</p>
              <p className="text-muted-foreground text-[12px]">tickets sold</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex h-[120px] items-end gap-[3px]" aria-label="Daily ticket sales chart">
            {dailyData.map(({ date, count }) => {
              const height = count === 0 ? 4 : Math.max(8, Math.round((count / maxDaily) * 120))
              const isToday = date === format(now, 'yyyy-MM-dd')
              return (
                <div
                  key={date}
                  title={`${format(new Date(date), 'MMM d')}: ${count} ticket${count !== 1 ? 's' : ''}`}
                  className={cn(
                    'flex-1 rounded-t-sm transition-opacity hover:opacity-80',
                    count === 0
                      ? 'bg-muted'
                      : isToday
                        ? 'from-brand-500 bg-gradient-to-t to-violet-500'
                        : 'bg-brand-500/60'
                  )}
                  style={{ height: `${height}px` }}
                />
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground text-[11px]">
              {format(thirtyDaysAgo, 'MMM d')}
            </span>
            <span className="text-muted-foreground text-[11px]">{format(now, 'MMM d')}</span>
          </div>
        </div>

        {/* ── Top events ── */}
        <div className="border-border bg-surface rounded-2xl border p-6">
          <h2 className="mb-4 text-[14px] font-semibold">Top Events</h2>

          {topEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BarChart3 className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-[13px]">No events yet.</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {topEvents.map((event, i) => {
                const revenue = event.ticketTypes.reduce((sum, tt) => sum + tt.price * tt.sold, 0)
                return (
                  <li key={event.id} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4 shrink-0 text-[12px] font-medium">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{event.title}</p>
                      <p className="text-muted-foreground text-[11.5px]">
                        {format(event.startsAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold">{event._count.tickets}</p>
                      <p className="text-muted-foreground text-[11px]">{formatPrice(revenue)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      {/* ── All events breakdown ── */}
      {totalEvents > 0 && (
        <EventsBreakdown
          draft={draftCount}
          published={publishedEvents}
          cancelled={cancelledCount}
          completed={completedCount}
        />
      )}

      {/* ── Ticket type revenue breakdown ── */}
      {ticketTypeRevenue.length > 0 && (
        <div className="border-border bg-surface rounded-2xl border p-6">
          <h2 className="mb-4 text-[14px] font-semibold">Revenue by Ticket Type</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ticketTypeRevenue.map((tt) => {
              const revenue = tt.price * tt.sold
              const percentage =
                totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(1) : '0'
              return (
                <div key={tt.name} className="border-border rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-semibold">{tt.name}</p>
                      <p className="text-muted-foreground text-[12px]">
                        {tt.sold} sold × {formatPrice(tt.price)}
                      </p>
                    </div>
                    <p className="text-[13px] font-bold">{percentage}%</p>
                  </div>
                  <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 text-[12px]">
                    Total: {formatPrice(revenue)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Refund analysis ── */}
      <div className="border-border bg-surface rounded-2xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-[14px] font-semibold">Refund Analysis</h2>
          {refundCount > 0 && <AlertCircle className="h-4 w-4 text-amber-500" />}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="bg-muted/40 rounded-lg p-4">
            <p className="text-muted-foreground text-[12px] font-medium">Total Refund Requests</p>
            <p className="text-[24px] font-bold mt-2">{refundCount}</p>
            <p className="text-muted-foreground text-[11px] mt-1">
              Across {totalTickets} total tickets
            </p>
          </div>

          <div className="bg-muted/40 rounded-lg p-4">
            <p className="text-muted-foreground text-[12px] font-medium">Refund Rate</p>
            <p className="text-[24px] font-bold mt-2">{refundRate}%</p>
            <p className="text-muted-foreground text-[11px] mt-1">
              {refundCount > 0 ? 'Monitor this metric' : 'No refunds yet'}
            </p>
          </div>

          <div className="bg-muted/40 rounded-lg p-4">
            <p className="text-muted-foreground text-[12px] font-medium">Avg Refund Cost</p>
            <p className="text-[24px] font-bold mt-2">
              {refundCount > 0 ? formatPrice(Math.round(totalRevenue * 0.01)) : '—'}
            </p>
            <p className="text-muted-foreground text-[11px] mt-1">
              Estimated impact
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Events breakdown ─────────────────────────────────────────────────────────

function EventsBreakdown({
  draft,
  published,
  cancelled,
  completed,
}: {
  draft: number
  published: number
  cancelled: number
  completed: number
}) {
  const items = [
    { label: 'Draft', count: draft, color: 'bg-zinc-500/10 text-zinc-400' },
    { label: 'Published', count: published, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Cancelled', count: cancelled, color: 'bg-red-500/10 text-red-500' },
    { label: 'Completed', count: completed, color: 'bg-blue-500/10 text-blue-400' },
  ]

  return (
    <div className="border-border bg-surface rounded-2xl border p-6">
      <h2 className="mb-4 text-[14px] font-semibold">Events Breakdown</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(({ label, count, color }) => (
          <div key={label} className="border-border rounded-xl border p-4 text-center">
            <p className="text-[24px] font-bold">{count}</p>
            <span
              className={cn(
                'mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                color
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  brand:   { icon: 'bg-brand-500/15 text-brand-400',   glow: 'rgba(99,102,241,0.22)'  },
  violet:  { icon: 'bg-violet-500/15 text-violet-400', glow: 'rgba(139,92,246,0.22)'  },
  emerald: { icon: 'bg-emerald-500/15 text-emerald-400', glow: 'rgba(16,185,129,0.20)' },
  amber:   { icon: 'bg-amber-500/15 text-amber-400',   glow: 'rgba(245,158,11,0.20)'  },
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
  const { icon: iconCls, glow } = COLOR_MAP[color]
  return (
    <div
      className="glass-stat rounded-2xl p-5"
      style={{ '--glow-color': glow } as React.CSSProperties}
    >
      <div className={cn('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl', iconCls)}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="text-[24px] font-bold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[13px] font-medium">{label}</p>
    </div>
  )
}
