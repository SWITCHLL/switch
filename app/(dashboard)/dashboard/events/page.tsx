import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus, CalendarDays, Eye, Settings, ScanLine } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId, getOrganizerEvents } from '@/features/organizer/queries'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Events' }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-500',
  CANCELLED: 'bg-red-500/10 text-red-500',
  COMPLETED: 'bg-blue-500/10 text-blue-400',
}

export default async function OrganizerEventsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const events = await getOrganizerEvents(organizer.id)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">My Events</h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {events.length} event{events.length !== 1 ? 's' : ''} total
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

      {/* ── Events list ── */}
      {events.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <CalendarDays className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="text-[16px] font-semibold">No events yet</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
            Create your first event and start selling tickets.
          </p>
          <Link
            href="/dashboard/events/new"
            className="from-brand-600 mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const totalRevenue = event.ticketTypes.reduce((sum, tt) => sum + tt.price * tt.sold, 0)
            const totalCapacity = event.ticketTypes.reduce((sum, tt) => sum + (tt.quantity ?? 0), 0)
            const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0)

            return (
              <div
                key={event.id}
                className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
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
                      {event.venue ? ` · ${event.venue.name}` : ''}
                    </p>

                    {/* Stats row — inline on mobile */}
                    <div className="mt-3 flex items-center gap-4 text-[12.5px]">
                      <div>
                        <span className="font-bold">{totalSold}</span>
                        {totalCapacity > 0 && (
                          <span className="text-muted-foreground"> / {totalCapacity}</span>
                        )}
                        <span className="text-muted-foreground ml-1">sold</span>
                      </div>
                      <div>
                        <span className="font-bold">₦{(totalRevenue / 100).toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">revenue</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons — stacked vertically on the right */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      aria-label="Manage event"
                      className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/events/${event.slug}`}
                      target="_blank"
                      aria-label="View public page"
                      className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/events/${event.id}/scan`}
                      aria-label="Check-in scanner"
                      className="text-muted-foreground hover:text-foreground border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
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
}
