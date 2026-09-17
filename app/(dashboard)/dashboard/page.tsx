import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CalendarDays, Ticket, TrendingUp, Users, Plus, ArrowRight, Sparkles, BarChart3, Briefcase } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getOrganizerByUserId,
  getOrganizerStats,
  getUserTickets,
} from '@/features/organizer/queries'
import { getOrganizerApplication } from '@/features/onboarding/queries'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'
import { db } from '@/lib/db'
import { PostEventReviewPrompt } from '@/features/reviews/components/post-event-review-prompt'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isOrganizer = session.role === 'ORGANIZER' || session.role === 'ADMIN'

  // Load user's display name and pending reviews in parallel
  const [user, organizer, recentTickets, pendingReviewTickets, application] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    isOrganizer ? getOrganizerByUserId(session.userId) : Promise.resolve(null),
    getUserTickets(session.userId),
    // Tickets for past events where the user has not yet left a review
    db.ticket.findMany({
      where: {
        userId: session.userId,
        status: { in: ['ACTIVE', 'USED'] },
        review: null,
        event: {
          status: 'COMPLETED',
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
      take: 5,
    }),
    !isOrganizer ? getOrganizerApplication(session.userId) : Promise.resolve(null),
  ])

  const stats = organizer ? await getOrganizerStats(organizer.id) : null

  // Display name: use user.name if set, otherwise fall back to email prefix
  const displayName = user?.name?.trim() || (session.email ? session.email.split('@')[0] : null)

  return (
    <div className="space-y-8">
      {/* ── Post-event review prompt ── */}
      {pendingReviewTickets.length > 0 && (
        <PostEventReviewPrompt tickets={pendingReviewTickets} />
      )}

      {/* ── Page header ── */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Welcome back{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          {isOrganizer
            ? "Here's what's happening with your events and tickets."
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

      {/* ── GUEST section ── */}
      <div className="space-y-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Guest</h2>
        
        {/* Guest features grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* My Tickets */}
          <Link
            href="/dashboard/tickets"
            className="border-border bg-surface hover:border-brand-500/50 group rounded-xl border p-4 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-brand-500/10 group-hover:bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                  <Ticket className="text-brand-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold">My Tickets</p>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">
                    {recentTickets.length} ticket{recentTickets.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-brand-400 h-4 w-4 transition-colors" />
            </div>
          </Link>

          {/* My Bookings */}
          <Link
            href="/dashboard/bookings"
            className="border-border bg-surface hover:border-brand-500/50 group rounded-xl border p-4 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 group-hover:bg-emerald-500/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                  <Users className="text-emerald-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold">My Bookings</p>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">Group bookings</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-emerald-400 h-4 w-4 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Recent tickets preview */}
        {recentTickets.length > 0 && (
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="mb-3 text-[13px] font-semibold">Recent Tickets</p>
            <div className="space-y-2">
              {recentTickets.slice(0, 3).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/events/${ticket.event.slug}`}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{ticket.event.title}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {format(ticket.event.startsAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] font-medium">{ticket.ticketType.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ORGANIZER section (only for organizers) ── */}
      {isOrganizer && stats && (
        <div className="space-y-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Organizer</h2>

          {/* Organizer stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={CalendarDays}
              label="Total Events"
              value={stats.totalEvents}
              sub={`${stats.publishedEvents} published`}
              color="brand"
            />
            <StatCard
              icon={Ticket}
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

          {/* Organizer features grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* My Events */}
            <Link
              href="/dashboard/events"
              className="border-border bg-surface hover:border-brand-500/50 group rounded-xl border p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-500/10 group-hover:bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                    <CalendarDays className="text-brand-400 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold">My Events</p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">
                      {stats.totalEvents} event{stats.totalEvents !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-brand-400 h-4 w-4 transition-colors" />
              </div>
            </Link>

            {/* Analytics */}
            <Link
              href="/dashboard/analytics"
              className="border-border bg-surface hover:border-violet-500/50 group rounded-xl border p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-violet-500/10 group-hover:bg-violet-500/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                    <BarChart3 className="text-violet-400 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold">Analytics</p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">Sales & insights</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-violet-400 h-4 w-4 transition-colors" />
              </div>
            </Link>

            {/* Create Event */}
            <Link
              href="/dashboard/events/new"
              className="border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 group rounded-xl border p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-500/20 group-hover:bg-emerald-500/30 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                    <Plus className="text-emerald-400 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-emerald-400 text-[13.5px] font-semibold">Create Event</p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">Publish new event</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-emerald-400 h-4 w-4 transition-colors" />
              </div>
            </Link>

            {/* Account Settings */}
            <Link
              href="/dashboard/settings"
              className="border-border bg-surface hover:border-amber-500/50 group rounded-xl border p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500/10 group-hover:bg-amber-500/20 flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
                    <Briefcase className="text-amber-400 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold">Settings</p>
                    <p className="text-muted-foreground mt-0.5 text-[12px]">Manage account</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-amber-400 h-4 w-4 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick actions (guest-only users) ── */}
      {!isOrganizer && (
        <div className="space-y-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/events"
              className="border-border bg-surface hover:bg-muted/40 group rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <CalendarDays className="text-brand-400 h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13.5px] font-medium">Browse Events</p>
                  <p className="text-muted-foreground text-[12px]">Find your next experience</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="border-border bg-surface hover:bg-muted/40 group rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <Users className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13.5px] font-medium">Settings</p>
                  <p className="text-muted-foreground text-[12px]">Update your profile</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
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
