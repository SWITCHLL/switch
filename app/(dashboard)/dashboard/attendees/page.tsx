import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Users, Search, Download } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Attendees' }

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500',
  USED: 'bg-zinc-500/10 text-zinc-400',
  CANCELLED: 'bg-red-500/10 text-red-500',
  REFUNDED: 'bg-amber-500/10 text-amber-500',
  EXPIRED: 'bg-zinc-500/10 text-zinc-400',
}

interface PageProps {
  searchParams: Promise<{ event?: string; q?: string }>
}

export default async function AttendeesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const { event: eventId, q: search } = await searchParams

  // Load organizer's events for the filter dropdown
  const events = await db.event.findMany({
    where: { organizerId: organizer.id },
    select: { id: true, title: true, startsAt: true },
    orderBy: { startsAt: 'desc' },
  })

  // Load tickets scoped to the selected event (or all events)
  const tickets = await db.ticket.findMany({
    where: {
      event: { organizerId: organizer.id },
      ...(eventId ? { eventId } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, title: true, startsAt: true } },
      ticketType: { select: { name: true, currency: true, price: true } },
      eventSeat: { include: { seat: { select: { label: true } } } },
    },
    orderBy: { issuedAt: 'desc' },
    take: 200,
  })

  const selectedEvent = events.find((e) => e.id === eventId)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Attendees</h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            {selectedEvent ? ` · ${selectedEvent.title}` : ' across all events'}
          </p>
        </div>

        {/* Export placeholder */}
        <button
          disabled
          title="CSV export coming soon"
          className="text-muted-foreground border-border flex cursor-not-allowed items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-medium opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Event filter */}
        <form className="flex-1">
          {search && <input type="hidden" name="q" value={search} />}
          <select
            name="event"
            defaultValue={eventId ?? ''}
            onChange={(e) => {
              const form = e.currentTarget.form
              if (form) form.requestSubmit()
            }}
            className={cn(
              'border-border bg-surface w-full rounded-xl border px-3.5 py-2.5',
              'text-foreground text-[13.5px] outline-none',
              'focus:border-brand-500 focus:ring-brand-500/20 transition-colors focus:ring-2'
            )}
          >
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} — {format(ev.startsAt, 'MMM d, yyyy')}
              </option>
            ))}
          </select>
        </form>

        {/* Search */}
        <form className="flex-1">
          {eventId && <input type="hidden" name="event" value={eventId} />}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={search ?? ''}
              placeholder="Search name, email, ticket #…"
              className={cn(
                'border-border bg-surface w-full rounded-xl border py-2.5 pr-3.5 pl-10',
                'text-foreground placeholder:text-muted-foreground text-[13.5px] outline-none',
                'focus:border-brand-500 focus:ring-brand-500/20 transition-colors focus:ring-2'
              )}
            />
          </div>
        </form>
      </div>

      {/* ── List / Table ── */}
      {tickets.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Users className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="text-[15px] font-semibold">No attendees yet</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-[13px]">
            {search
              ? 'No results for that search. Try a different name or ticket number.'
              : 'Tickets sold will appear here once your event goes live.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile card list (< md) ── */}
          <div className="space-y-2.5 md:hidden">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border-border bg-surface rounded-2xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{ticket.user.name ?? '—'}</p>
                    <p className="text-muted-foreground truncate text-[12px]">{ticket.user.email}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      STATUS_STYLES[ticket.status] ?? STATUS_STYLES.ACTIVE
                    )}
                  >
                    {ticket.status}
                  </span>
                </div>
                <div className="border-border/60 mt-3 space-y-1 border-t pt-3 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground truncate">{ticket.event.title}</span>
                    <span className="text-muted-foreground shrink-0">
                      {format(ticket.event.startsAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{ticket.ticketType.name}</span>
                    {ticket.eventSeat?.seat?.label && (
                      <span className="text-muted-foreground">
                        Seat {ticket.eventSeat.seat.label}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {ticket.ticketNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (≥ md) ── */}
          <div className="border-border bg-surface hidden overflow-hidden rounded-2xl border md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Attendee
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Event</th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Ticket</th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Seat</th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{ticket.user.name ?? '—'}</p>
                        <p className="text-muted-foreground text-[12px]">{ticket.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate font-medium">{ticket.event.title}</p>
                        <p className="text-muted-foreground text-[12px]">
                          {format(ticket.event.startsAt, 'MMM d, yyyy')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{ticket.ticketType.name}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {ticket.ticketNumber}
                        </p>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {ticket.eventSeat?.seat?.label ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            STATUS_STYLES[ticket.status] ?? STATUS_STYLES.ACTIVE
                          )}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {format(ticket.issuedAt, 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
