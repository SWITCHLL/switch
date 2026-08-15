import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CalendarDays, Ticket, TrendingUp, Users, Plus, ArrowRight, Sparkles } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getOrganizerByUserId,
  getOrganizerStats,
  getUserTickets,
} from '@/features/organizer/queries'
import { getOrganizerApplication } from '@/features/onboarding/queries'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isOrganizer = session.role === 'ORGANIZER' || session.role === 'ADMIN'
  const organizer = isOrganizer ? await getOrganizerByUserId(session.userId) : null
  const stats = organizer ? await getOrganizerStats(organizer.id) : null
  const recentTickets = await getUserTickets(session.userId)

  // For regular users — check if they have a pending application
  const application = !isOrganizer ? await getOrganizerApplication(session.userId) : null

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Welcome back{session.email ? `, ${session.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          {isOrganizer
            ? "Here's what's happening with your events."
            : 'Manage your tickets and account.'}
        </p>
      </div>

      {/* ── Become an organizer banner (regular users only) ── */}
      {!isOrganizer && !application && (
        <div className="border-brand-500/20 bg-brand-500/5 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-brand-500/10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Sparkles className="text-brand-400 h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[14px] font-semibold">Want to host events?</p>
              <p className="text-muted-foreground mt-0.5 text-[13px]">
                Apply to become an organizer. It takes less than 5 minutes and we review within 1–3
                business days.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/become-organizer"
            className="from-brand-600 shrink-0 rounded-xl bg-gradient-to-r to-violet-600 px-4 py-2.5 text-center text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Apply now
          </Link>
        </div>
      )}

      {/* ── Application pending banner ── */}
      {!isOrganizer && application && application.kycStatus !== 'APPROVED' && (
        <Link
          href="/dashboard/become-organizer"
          className={
            application.kycStatus === 'REJECTED'
              ? 'flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 transition-opacity hover:opacity-90'
              : 'flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition-opacity hover:opacity-90'
          }
        >
          <div>
            <p className="text-[13.5px] font-semibold">
              {application.kycStatus === 'REJECTED'
                ? 'Application rejected — resubmit to try again'
                : 'Organizer application under review'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[12.5px]">
              {application.kycStatus === 'REJECTED'
                ? (application.reviewNote ?? 'Click to view details and resubmit.')
                : "We'll notify you by email once reviewed."}
            </p>
          </div>
          <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* ── Organizer stats ── */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            label="Total Events"
            value={stats.totalEvents}
            sub={`${stats.publishedEvents} published`}
            color="brand"
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming"
            value={stats.upcomingEvents}
            sub="live events"
            color="violet"
          />
          <StatCard
            icon={Ticket}
            label="Tickets Sold"
            value={stats.totalTickets}
            sub="all time"
            color="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenue"
            value={formatPrice(stats.totalRevenue)}
            sub="all time"
            color="amber"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Recent tickets ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">My Tickets</h2>
            <Link
              href="/dashboard/tickets"
              className="text-brand-500 hover:text-brand-400 flex items-center gap-1 text-[12.5px] transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets yet"
              description="Events you book will appear here."
              action={{ href: '/events', label: 'Browse events' }}
            />
          ) : (
            <div className="space-y-3">
              {recentTickets.slice(0, 5).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/events/${ticket.event.slug}`}
                  className="border-border bg-surface hover:border-border/80 flex items-center gap-4 rounded-xl border p-4 transition-all hover:-translate-y-px"
                >
                  <div className="bg-brand-600/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Ticket className="text-brand-400 h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{ticket.event.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">
                      {format(ticket.event.startsAt, 'MMM d, yyyy')}
                      {ticket.event.venue ? ` · ${ticket.event.venue.name}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-medium">{ticket.ticketType.name}</p>
                    {ticket.eventSeat?.seat && (
                      <p className="text-muted-foreground text-[11px]">
                        Seat {ticket.eventSeat.seat.label}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div>
          <h2 className="mb-4 text-[15px] font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/events"
              className="border-border bg-surface hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-4 transition-colors"
            >
              <CalendarDays className="text-brand-400 h-5 w-5 shrink-0" />
              <div>
                <p className="text-[13.5px] font-medium">Browse Events</p>
                <p className="text-muted-foreground text-[12px]">Find your next experience</p>
              </div>
            </Link>

            {isOrganizer && (
              <Link
                href="/dashboard/events/new"
                className="border-brand-500/30 bg-brand-500/5 hover:bg-brand-500/10 flex items-center gap-3 rounded-xl border p-4 transition-colors"
              >
                <Plus className="text-brand-400 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-brand-400 text-[13.5px] font-medium">Create Event</p>
                  <p className="text-muted-foreground text-[12px]">Publish your next event</p>
                </div>
              </Link>
            )}

            <Link
              href="/dashboard/settings"
              className="border-border bg-surface hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-4 transition-colors"
            >
              <Users className="text-muted-foreground h-5 w-5 shrink-0" />
              <div>
                <p className="text-[13.5px] font-medium">Account Settings</p>
                <p className="text-muted-foreground text-[12px]">Update your profile</p>
              </div>
            </Link>
          </div>
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
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  color: keyof typeof COLOR_MAP
}) {
  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${COLOR_MAP[color]}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-[24px] font-bold tracking-tight">{value}</p>
      <p className="text-foreground mt-0.5 text-[13px] font-medium">{label}</p>
      <p className="text-muted-foreground text-[12px]">{sub}</p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-12 text-center">
      <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-[13px]">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="from-brand-600 mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r to-violet-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
