import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Download } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getUserCalendars,
  getAllUserCalendarEvents,
  getSharedCalendars,
  getCalendarById,
} from '@/features/calendar/queries'
import { CreateCalendarDialog } from '@/features/calendar/components/create-calendar-dialog'
import { EditCalendarDialog } from '@/features/calendar/components/edit-calendar-dialog'
import { ShareCalendarDialog } from '@/features/calendar/components/share-calendar-dialog'
import { AddEventDialog } from '@/features/calendar/components/add-event-dialog'
import { CalendarView } from '@/features/calendar/components/calendar-view'
import { CopyEventsDialog } from '@/features/calendar/components/copy-events-dialog'
import { DeleteCalendarButton } from '@/features/calendar/components/delete-calendar-button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/dashboard/calendar')

  const resolvedParams = await searchParams
  const [calendars, sharedCalendars] = await Promise.all([
    getUserCalendars(session.userId),
    getSharedCalendars(session.userId),
  ])

  // Determine which calendar is selected
  const selectedCalId = resolvedParams.cal ?? calendars[0]?.id
  const selectedCal = selectedCalId
    ? await getCalendarById(selectedCalId, session.userId)
    : null

  // All events across all owned calendars for the grid view
  const allOwnedEvents = await getAllUserCalendarEvents(session.userId)

  // Map events to include color + calendar title for the calendar view
  const calColorMap = new Map(calendars.map((c) => [c.id, c.color]))
  const calTitleMap = new Map(calendars.map((c) => [c.id, c.title]))

  const viewEvents = allOwnedEvents.map((ev) => ({
    ...ev,
    calendarColor: calColorMap.get(ev.calendar.id) ?? '#7c3aed',
    calendarTitle: calTitleMap.get(ev.calendar.id) ?? '',
    calendarId: ev.calendar.id,
  }))

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            Manage your personal calendars and events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {calendars.length > 0 && (
            <AddEventDialog calendars={calendars} defaultCalendarId={selectedCalId} />
          )}
          <CreateCalendarDialog />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* ── Left sidebar: calendars list ── */}
        <aside className="space-y-5">
          {/* My Calendars */}
          <div>
            <p className="text-muted-foreground mb-2 text-[11.5px] font-semibold uppercase tracking-wider">
              My Calendars
            </p>

            {calendars.length === 0 ? (
              <div className="border-border rounded-xl border px-3 py-4 text-center">
                <CalendarDays className="text-muted-foreground mx-auto mb-2 h-7 w-7" />
                <p className="text-muted-foreground text-[12.5px]">No calendars yet.</p>
                <CreateCalendarDialog
                  trigger={
                    <button
                      type="button"
                      className="text-brand-400 hover:text-brand-300 mt-1.5 text-[12.5px] transition-colors"
                    >
                      Create one
                    </button>
                  }
                />
              </div>
            ) : (
              <ul className="space-y-1">
                {calendars.map((cal) => (
                  <li key={cal.id}>
                    <Link
                      href={`/dashboard/calendar?cal=${cal.id}`}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                        selectedCalId === cal.id
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      {/* Color dot */}
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cal.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {cal.title}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {cal._count.events}
                      </span>

                      {/* Actions — visible on hover */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <EditCalendarDialog calendar={cal} />
                        {selectedCal?.id === cal.id && (
                          <ShareCalendarDialog calendar={selectedCal} />
                        )}
                        <ExportCalendarButton calendarId={cal.id} title={cal.title} />
                        <DeleteCalendarButton calendarId={cal.id} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Shared with me */}
          {sharedCalendars.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-[11.5px] font-semibold uppercase tracking-wider">
                Shared with me
              </p>
              <ul className="space-y-2">
                {sharedCalendars.map((share) => (
                  <li
                    key={share.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: share.calendar.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{share.calendar.title}</p>
                        <p className="text-muted-foreground text-[11.5px]">
                          by {share.calendar.user.name ?? share.calendar.user.email}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                          {share.calendar.events.length} event
                          {share.calendar.events.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {share.canCopy && calendars.length > 0 && (
                      <div className="mt-2.5">
                        <CopyEventsDialog share={share} myCalendars={calendars} />
                      </div>
                    )}

                    {/* Export shared calendar */}
                    <div className="mt-2">
                      <a
                        href={`/api/calendar/export/${share.calendar.shareToken}`}
                        download={`${share.calendar.title}.ics`}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11.5px] transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Export .ics
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* ── Main area: calendar grid + event list ── */}
        <div className="space-y-6">
          {/* Month grid */}
          {calendars.length > 0 ? (
            <CalendarView events={viewEvents} calendars={calendars} />
          ) : (
            <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
              <CalendarDays className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-[15px] font-semibold">Create your first calendar</p>
              <p className="text-muted-foreground mt-1 text-[13px]">
                Organize events, share with others, and export to your phone.
              </p>
              <div className="mt-4">
                <CreateCalendarDialog />
              </div>
            </div>
          )}

          {/* Upcoming events list for selected calendar */}
          {selectedCal && selectedCal.events.length > 0 && (
            <div className="border-border bg-surface rounded-2xl border p-5">
              <h2 className="mb-4 text-[14px] font-semibold">
                Events in &quot;{selectedCal.title}&quot;
              </h2>
              <ul className="space-y-2">
                {selectedCal.events.map((ev) => (
                  <li
                    key={ev.id}
                    className="border-border flex items-start gap-3 rounded-xl border p-3"
                  >
                    {/* Color stripe */}
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedCal.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold">{ev.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-[12px]">
                        {ev.allDay
                          ? format(ev.startsAt, 'EEE, MMM d, yyyy')
                          : format(ev.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
                        {ev.endsAt && !ev.allDay && ` – ${format(ev.endsAt, 'h:mm a')}`}
                      </p>
                      {ev.location && (
                        <p className="text-muted-foreground text-[11.5px]">{ev.location}</p>
                      )}
                    </div>
                    <a
                      href={`/api/calendar/event/${ev.id}/export`}
                      download={`${ev.title}.ics`}
                      title="Export event"
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export calendar button (plain anchor, no server action needed) ───────────

function ExportCalendarButton({ calendarId, title }: { calendarId: string; title: string }) {
  return (
    <a
      href={`/api/calendar/export/${calendarId}`}
      download={`${title}.ics`}
      aria-label="Export calendar"
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5" />
    </a>
  )
}
