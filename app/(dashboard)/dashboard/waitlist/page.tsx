import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Clock, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getMyWaitlistEntries } from '@/features/waitlist/queries'
import { WaitlistStatusBadge } from '@/features/waitlist/components/waitlist-status-badge'
import { LeaveWaitlistButton } from '@/features/waitlist/components/leave-waitlist-button'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'My Waitlists',
  description: 'Track your waitlist positions and offers',
}

export default async function WaitlistPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const entries = await getMyWaitlistEntries(session.userId)

  const activeEntries = entries.filter(
    (e) => e.status === 'PENDING' || e.status === 'OFFERED'
  )
  const pastEntries = entries.filter(
    (e) => e.status === 'FULFILLED' || e.status === 'EXPIRED' || e.status === 'CANCELLED'
  )

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Waitlists</h1>
            <p className="text-muted-foreground text-sm">
              {activeEntries.length} active{' '}
              {activeEntries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Active entries ── */}
      {activeEntries.length > 0 ? (
        <section aria-labelledby="active-waitlists-heading">
          <h2 id="active-waitlists-heading" className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">
            Active
          </h2>
          <div className="space-y-3">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{entry.event.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{entry.ticketType.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {entry.requestedQty} ticket{entry.requestedQty !== 1 ? 's' : ''} requested
                      {' · '}
                      {new Date(entry.event.startsAt).toLocaleDateString('en-NG', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <WaitlistStatusBadge
                      status={entry.status}
                      position={entry.position}
                      offerExpiresAt={entry.offerExpiresAt?.toISOString() ?? null}
                    />
                    <LeaveWaitlistButton waitlistEntryId={entry.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <AlertCircle className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">No active waitlists</h3>
          <p className="mt-1 text-xs text-zinc-500">
            When a ticket type is sold out, you can join its waitlist and you&apos;ll be notified
            if a spot opens up.
          </p>
        </div>
      )}

      {/* ── Past entries ── */}
      {pastEntries.length > 0 && (
        <section aria-labelledby="past-waitlists-heading">
          <h2 id="past-waitlists-heading" className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">
            Past
          </h2>
          <div className="space-y-2">
            {pastEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-400">{entry.event.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{entry.ticketType.name}</p>
                  </div>
                  <WaitlistStatusBadge status={entry.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
