import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ExternalLink, ChevronLeft, Wifi, Gift } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getOrganizerByUserId,
  getOrganizerEvent,
  getEventImages,
} from '@/features/organizer/queries'
import { EventStatusControl } from '@/features/organizer/components/event-status-control'
import { TicketTypesManager } from '@/features/organizer/components/ticket-types-manager'
import { EventImagesManager } from '@/features/organizer/components/event-images-manager'
import { EditEventForm } from '@/features/organizer/components/edit-event-form'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { formatPrice } from '@/features/events/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: 'Manage Event' }
}

export default async function ManageEventPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const [event, eventImages, categories] = await Promise.all([
    getOrganizerEvent(id, organizer.id),
    getEventImages(id),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!event) notFound()

  const totalSold = event.ticketTypes.reduce((s, tt) => s + tt.sold, 0)
  const totalRevenue = event.ticketTypes.reduce((s, tt) => s + tt.price * tt.sold, 0)
  const totalCapacity = event.ticketTypes.reduce((s, tt) => s + (tt.quantity ?? 0), 0)

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      {/* ── Back ── */}
      <Link
        href="/dashboard/events"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All events
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight">{event.title}</h1>
            {event.isVirtual && (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                <Wifi className="h-3 w-3" /> Virtual
              </span>
            )}
            {event.isFree && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Gift className="h-3 w-3" /> Free
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-[13px]">
            {format(event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
            {event.venue ? ` · ${event.venue.name}` : ''}
          </p>
        </div>
        <Link
          href={`/events/${event.slug}`}
          target="_blank"
          className="border-border hover:bg-muted flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View page
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Tickets Sold',
            value: totalCapacity > 0 ? `${totalSold} / ${totalCapacity}` : String(totalSold),
          },
          { label: 'Revenue', value: formatPrice(totalRevenue) },
          { label: 'Status', value: event.status },
        ].map((s) => (
          <div key={s.label} className="border-border bg-surface rounded-xl border p-4">
            <p className="text-muted-foreground text-[11.5px] tracking-wide uppercase">{s.label}</p>
            <p className="mt-1 text-[18px] font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Publish / cancel control ── */}
      <EventStatusControl eventId={event.id} status={event.status} />

      {/* ── Edit event details ── */}
      <EditEventForm event={event} categories={categories} />

      {/* ── Event images ── */}
      <EventImagesManager eventId={event.id} initialUrls={eventImages.map((img) => img.url)} />

      {/* ── Ticket types ── */}
      <TicketTypesManager eventId={event.id} ticketTypes={event.ticketTypes} />
    </div>
  )
}
