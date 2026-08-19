import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Ticket, Users, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getUserTickets } from '@/features/organizer/queries'
import { getMyGroupOrders } from '@/features/group-booking/queries'
import { format } from 'date-fns'
import { formatPrice } from '@/features/events/utils'
import { cn } from '@/lib/utils'
import { TicketGrid } from '@/features/tickets/components/ticket-grid'

export const metadata: Metadata = { title: 'My Tickets' }

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function MyTicketsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { tab = 'tickets' } = await searchParams
  const activeTab = tab === 'groups' ? 'groups' : 'tickets'

  const [tickets, groupOrders] = await Promise.all([
    getUserTickets(session.userId),
    getMyGroupOrders(session.userId),
  ])

  const upcoming = tickets.filter((t) => new Date(t.event.startsAt) >= new Date())
  const past = tickets.filter((t) => new Date(t.event.startsAt) < new Date())

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total
          {groupOrders.length > 0 &&
            ` · ${groupOrders.length} group booking${groupOrders.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="border-border flex gap-1 border-b">
        <TabLink href="/dashboard/tickets?tab=tickets" active={activeTab === 'tickets'}>
          <Ticket className="h-3.5 w-3.5" />
          My Tickets
          {tickets.length > 0 && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                activeTab === 'tickets'
                  ? 'bg-brand-600 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {tickets.length}
            </span>
          )}
        </TabLink>
        <TabLink href="/dashboard/tickets?tab=groups" active={activeTab === 'groups'}>
          <Users className="h-3.5 w-3.5" />
          My Groups
          {groupOrders.length > 0 && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                activeTab === 'groups'
                  ? 'bg-brand-600 text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {groupOrders.length}
            </span>
          )}
        </TabLink>
      </div>

      {/* ── Tickets tab ── */}
      {activeTab === 'tickets' && (
        <>
          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets yet"
              description="Book an event to see your tickets here."
              actionHref="/events"
              actionLabel="Browse Events"
            />
          ) : (
            <div className="space-y-8">
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-muted-foreground mb-3 text-[14px] font-semibold uppercase tracking-wide">
                    Upcoming · {upcoming.length}
                  </h2>
                  <TicketGrid tickets={upcoming} />
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="text-muted-foreground mb-3 text-[14px] font-semibold uppercase tracking-wide">
                    Past · {past.length}
                  </h2>
                  <TicketGrid tickets={past} dimmed />
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Groups tab ── */}
      {activeTab === 'groups' && (
        <>
          {groupOrders.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No group bookings yet"
              description="Create a group booking on any event to coordinate with friends."
              actionHref="/events"
              actionLabel="Browse Events"
            />
          ) : (
            <div className="space-y-3">
              {groupOrders.map((order) => (
                <GroupOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tab link ─────────────────────────────────────────────────────────────────

function TabLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-1.5 border-b-2 px-3 pb-3 text-[13.5px] font-semibold transition-colors',
        active
          ? 'border-brand-500 text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}

// ─── Group order card ─────────────────────────────────────────────────────────

type GroupOrder = Awaited<ReturnType<typeof getMyGroupOrders>>[number]

const GROUP_STATUS_CONFIG = {
  PENDING: { label: 'In progress', icon: Clock, className: 'bg-amber-500/10 text-amber-400' },
  COMPLETE: {
    label: 'Complete',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400',
  },
  EXPIRED: { label: 'Expired', icon: XCircle, className: 'bg-zinc-500/10 text-zinc-400' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, className: 'bg-red-500/10 text-red-400' },
}

function GroupOrderCard({ order }: { order: GroupOrder }) {
  const paidSlots = order.slots.filter((s) => s.status === 'PAID').length
  const totalSlots = order.slots.length
  const totalAmount = order.slots.reduce((sum, s) => sum + s.price, 0)
  const config = GROUP_STATUS_CONFIG[order.status] ?? GROUP_STATUS_CONFIG.PENDING
  const StatusIcon = config.icon
  const percent = totalSlots === 0 ? 0 : Math.round((paidSlots / totalSlots) * 100)

  return (
    <Link
      href={`/group/${order.code}`}
      className="border-border bg-surface hover:border-border/80 block overflow-hidden rounded-2xl border transition-all hover:-translate-y-px"
    >
      <div className="flex items-center gap-4 p-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          {order.event.imageUrl ? (
            <Image
              src={order.event.imageUrl}
              alt={order.event.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="from-brand-900/50 h-full w-full bg-gradient-to-br to-violet-900/30" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{order.event.title}</p>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            {format(order.event.startsAt, 'MMM d, yyyy')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  percent === 100
                    ? 'bg-emerald-500'
                    : 'from-brand-500 bg-gradient-to-r to-violet-500'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-muted-foreground shrink-0 text-[11px]">
              {paidSlots}/{totalSlots} paid
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold',
              config.className
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
          <p className="text-muted-foreground mt-1.5 text-[11.5px]">{formatPrice(totalAmount)}</p>
        </div>

        <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
      </div>
    </Link>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ElementType
  title: string
  description: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
      <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="text-muted-foreground h-7 w-7" />
      </div>
      <p className="text-[16px] font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">{description}</p>
      <Link
        href={actionHref}
        className="from-brand-600 mt-6 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
