import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus, CalendarDays, Eye, Settings, ScanLine, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId, getOrganizerEvents } from '@/features/organizer/queries'
import { EventStatusFilter } from '@/features/events/components/event-status-filter'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Events' }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-500',
  CANCELLED: 'bg-red-500/10 text-red-500',
  COMPLETED: 'bg-blue-500/10 text-blue-400',
}

interface EventsPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function OrganizerEventsPage({ searchParams }: EventsPageProps) {
  try {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
      redirect('/dashboard')
    }

    const organizer = await getOrganizerByUserId(session.userId)
    if (!organizer) {
      // User is marked as organizer but has no organizer profile
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Events</h1>
            <p className="text-muted-foreground mt-1 text-[14px]">Manage your events</p>
          </div>

          <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
            <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <AlertCircle className="text-muted-foreground h-7 w-7" />
            </div>
            <p className="text-[16px] font-semibold">Organizer profile not found</p>
            <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
              Your organizer profile needs to be set up. Please contact support if this persists.
            </p>
            <Link
              href="/dashboard"
              className="from-brand-600 mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )
    }

    let events = await getOrganizerEvents(organizer.id)

    // Apply filters
    const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : ''
    const searchQuery = typeof searchParams.search === 'string' ? searchParams.search.toLowerCase() : ''

    if (statusFilter && statusFilter !== 'ALL') {
      events = events.filter((e) => e.status === statusFilter)
    }

    if (searchQuery) {
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery) ||
          e.venue?.name.toLowerCase().includes(searchQuery) ||
          e.category?.name.toLowerCase().includes(searchQuery)
      )
    }

    // Calculate statistics
    const publishedEvents = events.filter((e) => e.status === 'PUBLISHED').length
    const draftEvents = events.filter((e) => e.status === 'DRAFT').length
    const totalRevenue = events.reduce((sum, event) => {
      return sum + event.ticketTypes.reduce((tt_sum, tt) => tt_sum + tt.price * tt.sold, 0)
    }, 0)
    const totalTicketsSold = events.reduce((sum, event) => {
      return sum + event.ticketTypes.reduce((tt_sum, tt) => tt_sum + tt.sold, 0)
    }, 0)

    return (
      <div className="space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Events</h1>
            <p className="text-muted-foreground mt-1 text-[14px]">
              {events.length} event{events.length !== 1 ? 's' : ''}
              {events.length > 0 && (
                <>
                  {' '}
                  • {publishedEvents} published • {draftEvents} draft
                </>
              )}
            </p>
          </div>
          <Link
            href="/dashboard/events/new"
            className="from-brand-600 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Link>
        </div>

        {/* ── Quick Stats ── */}
        {events.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-zinc-400">Total Events</span>
              </div>
              <div className="mt-1.5 text-2xl font-bold">{events.length}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">Published</span>
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-400">{publishedEvents}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Tickets Sold</span>
              </div>
              <div className="mt-1.5 text-2xl font-bold text-blue-400">{totalTicketsSold}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-400">Revenue</span>
              </div>
              <div className="mt-1.5 text-2xl font-bold text-amber-400">
                ₦{(totalRevenue / 100 / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}

        {/* ── Filter & Search ── */}
        {events.length > 0 && (
          <EventStatusFilter statusFilter={statusFilter} searchQuery={searchQuery} />
        )}

        {/* ── Events list ── */}
        {events.length === 0 ? (
          <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
            <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              {searchQuery || statusFilter ? (
                <AlertCircle className="text-muted-foreground h-7 w-7" />
              ) : (
                <CalendarDays className="text-muted-foreground h-7 w-7" />
              )}
            </div>
            <p className="text-[16px] font-semibold">
              {searchQuery || statusFilter ? 'No events match your filters' : 'No events yet'}
            </p>
            <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
              {searchQuery || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Create your first event and start selling tickets.'}
            </p>
            {!searchQuery && !statusFilter && (
              <Link
                href="/dashboard/events/new"
                className="from-brand-600 mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const totalRevenue = event.ticketTypes.reduce((sum, tt) => sum + tt.price * tt.sold, 0)
              const totalCapacity = event.ticketTypes.reduce((sum, tt) => sum + (tt.quantity ?? 0), 0)
              const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0)
              const occupancyPercent =
                totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0

              return (
                <div
                  key={event.id}
                  className="border-border bg-surface rounded-2xl border p-4 sm:p-5 transition-all hover:border-brand-500/30"
                >
                  <div className="flex items-start gap-3">
                    {/* Info — takes all space */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            STATUS_STYLES[event.status] ?? STATUS_STYLES.DRAFT
                          )}
                        >
                          {event.status}
                        </span>
                        {event.category && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: event.category.color ?? '#6366f1' }}
                          >
                            {event.category.name}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-[14.5px] font-semibold leading-snug">{event.title}</h3>
                      <p className="text-muted-foreground mt-0.5 text-[12px]">
                        {format(event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
                        {event.venue ? ` · ${event.venue.name}, ${event.venue.city}` : ''}
                      </p>

                      {/* Stats row with progress bar */}
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-4 text-[12.5px]">
                          <div>
                            <span className="font-bold">{totalSold}</span>
                            {totalCapacity > 0 && (
                              <span className="text-muted-foreground"> / {totalCapacity}</span>
                            )}
                            <span className="text-muted-foreground ml-1">sold</span>
                            {occupancyPercent > 0 && (
                              <span className="text-muted-foreground ml-1">({occupancyPercent}%)</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold">₦{(totalRevenue / 100).toLocaleString()}</span>
                            <span className="text-muted-foreground ml-1">revenue</span>
                          </div>
                        </div>
                        {totalCapacity > 0 && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-violet-600 transition-all"
                              style={{ width: `${occupancyPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons — stacked vertically on the right */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        aria-label="Manage event"
                        className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                        title="Edit"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/events/${event.slug}`}
                        target="_blank"
                        aria-label="View public page"
                        className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/events/${event.id}/scan`}
                        aria-label="Check-in scanner"
                        className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                        title="Scan"
                      >
                        <ScanLine className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error loading events page:', error)
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">My Events</h1>
          <p className="text-muted-foreground mt-1 text-[14px]">Manage your events</p>
        </div>

        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <AlertCircle className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="text-[16px] font-semibold">Something went wrong</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
            We encountered an error loading your events. Please try refreshing the page or contact support if the problem persists.
          </p>
          <Link
            href="/dashboard"
            className="from-brand-600 mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }
}
