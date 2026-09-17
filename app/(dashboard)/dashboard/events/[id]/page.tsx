import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ExternalLink, ChevronLeft, Wifi, Gift, ScanLine, Eye } from 'lucide-react'
import { getSession } from '@/lib/session'
import {
  getOrganizerByUserId,
  getOrganizerEvent,
  getEventImages,
  getEventSpeakers,
} from '@/features/organizer/queries'
import { EventStatusControl } from '@/features/organizer/components/event-status-control'
import { TicketTypesManager } from '@/features/organizer/components/ticket-types-manager'
import { EventImagesManager } from '@/features/organizer/components/event-images-manager'
import { EditEventForm } from '@/features/organizer/components/edit-event-form'
import { SpeakersManager } from '@/features/organizer/components/speakers-manager'
import { PromoCodesManager } from '@/features/promo-codes/components/promo-codes-manager'
import { ScanPinManager } from '@/features/organizer/components/scan-pin-manager'
import { SeatingManager } from '@/features/organizer/components/seating-manager'
import { TableConfigTab } from '@/features/organizer/components/table-config-tab'
import { TimeSlotConfigTab } from '@/features/organizer/components/time-slot-config-tab'
import { SessionConfigTab } from '@/features/organizer/components/session-config-tab'
import { EventScheduleManager } from '@/features/organizer/components/event-schedule-manager'
import { getPromoCodesForEvent } from '@/features/promo-codes/queries'
import { getEventSeatConfig } from '@/features/organizer/queries'
import { getEventTimeSlots } from '@/features/time-slots/queries'
import { getEventSessions } from '@/features/sessions/queries'
import { getEventScheduleItems } from '@/features/organizer/queries'
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

  const [event, eventImages, eventSpeakers, categories, promoCodes, seatConfig, timeSlots, sessions, scheduleItems] = await Promise.all([
    getOrganizerEvent(id, organizer.id),
    getEventImages(id),
    getEventSpeakers(id),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    getPromoCodesForEvent(id, organizer.id),
    getEventSeatConfig(id),
    getEventTimeSlots(id),
    getEventSessions(id),
    getEventScheduleItems(id),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex shrink-0 items-center gap-2">
          {/* Check-in scanner button */}
          <Link
            href={`/dashboard/events/${event.id}/scan`}
            className="from-brand-600 flex items-center gap-1.5 rounded-lg bg-gradient-to-r to-violet-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Check-in Scanner
          </Link>
          <Link
            href={`/dashboard/events/${event.id}/preview`}
            className="border-border hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Link>
          <Link
            href={`/events/${event.slug}`}
            target="_blank"
            className="border-border hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View page
          </Link>
        </div>
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

      {/* ── Speakers / Guests / Performers ── */}
      <SpeakersManager eventId={event.id} initialSpeakers={eventSpeakers} />

      {/* ── Event Programme ── */}
      <EventScheduleManager
        eventId={event.id}
        initialItems={scheduleItems}
        speakers={eventSpeakers.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          avatarUrl: s.avatarUrl,
        }))}
      />

      {/* ── Ticket types ── */}
      <TicketTypesManager eventId={event.id} ticketTypes={event.ticketTypes} />

      {/* ── Seat configuration (RESERVED / MIXED only) ── */}
      {event.seatingType !== 'GENERAL_ADMISSION' && (
        <>
          <SeatingManager
            eventId={event.id}
            seatingType={event.seatingType}
            ticketTypes={event.ticketTypes.map((tt) => ({
              id: tt.id,
              name: tt.name,
              price: tt.price,
              currency: tt.currency,
            }))}
            initialConfig={seatConfig}
          />
          {/* Visual seat map editor — only shown when a seat config exists */}
          {seatConfig && (
            <div className="border-border bg-surface rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold">Visual Seat Map Editor</h2>
                  <p className="text-muted-foreground mt-0.5 text-[12px]">
                    Drag sections, block individual seats, and assign seat types on a live canvas.
                  </p>
                </div>
                <Link
                  href={`/dashboard/events/${event.id}/seat-map/edit`}
                  className="from-brand-600 flex items-center gap-1.5 rounded-lg bg-gradient-to-r to-violet-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Open visual editor
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Show Times / Time Slots ── */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <TimeSlotConfigTab
          eventId={event.id}
          timeSlots={timeSlots.map((slot) => ({
            id:       slot.id,
            label:    slot.label,
            startsAt: slot.startsAt,
            endsAt:   slot.endsAt,
            status:   slot.status,
            capacities: slot.capacities.map((cap) => ({
              ticketTypeId:   cap.ticketTypeId,
              ticketTypeName: cap.ticketTypeName,
              price:          cap.price,
              currency:       cap.currency,
              capacity:       cap.capacity,
              booked:         cap.booked,
              available:      cap.available,
            })),
          }))}
          ticketTypes={event.ticketTypes.map((tt) => ({
            id:       tt.id,
            name:     tt.name,
            price:    tt.price,
            currency: tt.currency,
          }))}
        />
      </div>

      {/* ── Tables ── */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <TableConfigTab
          eventId={event.id}
          tableTicketTypes={event.ticketTypes
            .filter((tt) => tt.isTableType)
            .map((tt) => ({
              id:                     tt.id,
              name:                   tt.name,
              price:                  tt.price,
              currency:               tt.currency,
              quantity:               tt.quantity,
              sold:                   tt.sold,
              tableCapacity:          tt.tableCapacity,
              requiresAssignedSeating: tt.requiresAssignedSeating,
            }))}
        />
      </div>

      {/* ── Sessions / Workshops ── */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <SessionConfigTab
          eventId={event.id}
          sessions={sessions.map((s) => ({
            id:             s.id,
            title:          s.title,
            facilitator:    s.facilitator,
            startsAt:       s.startsAt,
            endsAt:         s.endsAt,
            inclusionMode:  s.inclusionMode,
            capacity:       s.capacity,
            price:          s.price,
            currency:       s.currency,
            enrolmentCount: s.enrolmentCount,
          }))}
        />
      </div>

      {/* ── Promo codes ── */}
      <PromoCodesManager
        eventId={event.id}
        promoCodes={promoCodes}
        ticketTypes={event.ticketTypes.map((tt) => ({ id: tt.id, name: tt.name }))}
      />

      {/* ── Door staff scanner PIN ── */}
      <ScanPinManager
        eventId={event.id}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
      />
    </div>
  )
}
