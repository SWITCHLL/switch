import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, LayoutGrid, AlertTriangle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { getEventSeatMapForEditor } from '@/features/organizer/seat-map-editor-queries'
import { SeatMapEditor } from '@/features/organizer/components/seat-map-editor'
import { db } from '@/lib/db'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id }, select: { title: true } })
  return { title: event ? `Seat Map — ${event.title}` : 'Seat Map Editor' }
}

export default async function SeatMapEditPage({ params }: PageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const data = await getEventSeatMapForEditor(id, organizer.id)

  // Verify the event exists and belongs to this organizer (even if no seat map yet)
  if (!data) {
    // Check if the event exists but just has no seat map configured
    const event = await db.event.findUnique({
      where: { id, organizerId: organizer.id },
      select: { id: true, title: true, seatingType: true },
    })

    if (!event) notFound()

    // GA events don't have seat maps
    if (event.seatingType === 'GENERAL_ADMISSION') {
      redirect(`/dashboard/events/${id}`)
    }

    // Seat map not configured yet — show empty state
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold">{event.title}</h1>
          <p className="text-muted-foreground mt-2 text-[14px]">
            No seat configuration found for this event.
          </p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Set up sections and rows in the event editor first, then return here to use the visual
            editor.
          </p>
        </div>
        <Link
          href={`/dashboard/events/${id}`}
          className="from-brand-600 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to event editor
        </Link>
      </div>
    )
  }

  return (
    // Bleed out of the dashboard layout's px-4/px-8 + py-5/py-8 padding
    // so the editor canvas fills the available viewport below the dashboard header.
    // -mx-4 sm:-mx-8 cancels the horizontal padding; -mt-5 sm:-mt-8 cancels the top padding.
    // calc(100vh - 60px) = viewport minus the sticky 60px DashboardHeader.
    <div
      className="-mx-4 -mt-5 flex flex-col overflow-hidden sm:-mx-8 sm:-mt-8"
      style={{ height: 'calc(100vh - 60px)' }}
    >
      {/* ── Top bar ── */}
      <div className="border-border bg-surface flex h-[52px] shrink-0 items-center gap-3 border-b px-5">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-[13px] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to event
        </Link>

        <div className="border-border h-4 w-px" />

        <div className="flex min-w-0 items-center gap-2">
          <LayoutGrid className="text-muted-foreground h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold">{data.eventTitle}</p>
            <p className="text-muted-foreground text-[11px]">
              Visual Seat Map Editor ·{' '}
              {data.sections.length} section{data.sections.length !== 1 ? 's' : ''} ·{' '}
              {data.sections.reduce((s, sec) => s + sec.totalSeats, 0).toLocaleString()} seats
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Quick stats */}
        <div className="hidden items-center gap-4 sm:flex">
          <QuickStat
            label="Available"
            value={data.sections.reduce((s, sec) => s + sec.availableSeats, 0)}
            color="text-foreground"
          />
          <QuickStat
            label="Sold"
            value={data.sections.reduce((s, sec) => s + sec.soldSeats, 0)}
            color="text-amber-400"
          />
          <QuickStat
            label="Blocked"
            value={data.sections.reduce((s, sec) => s + sec.blockedSeats, 0)}
            color="text-red-400"
          />
        </div>
      </div>

      {/* ── Editor fills remaining height ── */}
      <div className="min-h-0 flex-1">
        <SeatMapEditor data={data} />
      </div>
    </div>
  )
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="text-right">
      <p className={`text-[14px] font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  )
}
