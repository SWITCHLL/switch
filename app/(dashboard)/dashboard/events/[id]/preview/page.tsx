import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { getEventPreview } from '@/features/organizer/queries'
import { EventPreviewBanner } from '@/features/organizer/components/event-preview-banner'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { SiteFooter } from '@/components/layout/site-footer'
import { getMinPrice, isSoldOut } from '@/features/events'
import { getUserCalendars } from '@/features/calendar/queries'
import { EventHero } from '@/components/events/event-hero'
import { EventMeta } from '@/components/events/event-meta'
import { EventAbout } from '@/components/events/event-about'
import { TicketPanel } from '@/components/events/ticket-panel'
import { EventGallery } from '@/components/events/event-gallery'
import { EventHosts } from '@/components/events/event-hosts'
import { EventLocation } from '@/components/events/event-location'
import { EventDetailsSection } from '@/components/events/event-details-section'
import { EventPolicies } from '@/components/events/event-policies'
import { EventOrganizer } from '@/components/events/event-organizer'
import { EventProgramme } from '@/components/events/event-programme'
import { MobileTicketBar } from '@/components/events/mobile-ticket-bar'
import { SectionReveal } from '@/components/events/section-reveal'
import type { EventDetail } from '@/features/events/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: `Preview — ${id}` }
}

export default async function EventPreviewPage({ params }: PageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  const [event, userCalendars] = await Promise.all([
    getEventPreview(id, organizer.id),
    getUserCalendars(session.userId),
  ])

  if (!event) notFound()

  // Cast to EventDetail so the public components accept it
  const eventDetail = event as unknown as EventDetail

  const minPrice = getMinPrice(eventDetail)
  const soldOut = isSoldOut(eventDetail)
  const salesEnded = Boolean(event.salesEnd && new Date(event.salesEnd) < new Date())
  const salesNotStarted = Boolean(event.salesStart && new Date(event.salesStart) > new Date())
  const isReserved = event.seatingType === 'RESERVED' || event.seatingType === 'MIXED'
  const isLoggedIn = Boolean(session)

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* ── Preview banner — sticky at the top ─────────────────────────── */}
      <EventPreviewBanner eventId={event.id} status={event.status} />

      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1">
        {/* ── Cinematic Hero ─────────────────────────────────────────── */}
        <EventHero event={eventDetail} />

        {/* ── Status banner (mirrors public page) ────────────────────── */}
        {(event.status === 'CANCELLED' || event.status === 'COMPLETED') && (
          <div
            className={`w-full py-3 text-center text-[13px] font-semibold ${
              event.status === 'CANCELLED'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
            role="alert"
          >
            {event.status === 'CANCELLED'
              ? 'This event has been cancelled.'
              : 'This event has already taken place.'}
          </div>
        )}

        {/* ── Draft watermark strip ───────────────────────────────────── */}
        {event.status === 'DRAFT' && (
          <div
            className="w-full bg-zinc-900/80 py-2 text-center text-[12px] font-medium tracking-wide text-zinc-400"
            role="status"
          >
            Draft — ticket purchases are disabled in preview
          </div>
        )}

        {/* ── Meta strip ─────────────────────────────────────────────── */}
        <div className="border-border/60 border-b bg-background">
          <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8">
            <EventMeta
              event={eventDetail}
              calendarProps={{
                switchEventId: event.id,
                calendars: userCalendars.map((c) => ({
                  id: c.id,
                  title: c.title,
                  color: c.color,
                })),
              }}
            />
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-16 lg:grid-cols-[1fr_360px] lg:gap-14 xl:grid-cols-[1fr_380px]">
            {/* ── Left column ────────────────────────────────────────── */}
            <div className="flex flex-col gap-16">
              {event.description && (
                <SectionReveal>
                  <EventAbout description={event.description} />
                </SectionReveal>
              )}

              {eventDetail.scheduleItems && eventDetail.scheduleItems.length > 0 && (
                <SectionReveal>
                  <EventProgramme items={eventDetail.scheduleItems} />
                </SectionReveal>
              )}

              {eventDetail.images && eventDetail.images.length >= 2 && (
                <SectionReveal>
                  <EventGallery images={eventDetail.images} eventTitle={event.title} />
                </SectionReveal>
              )}

              {/* Ticket panel — mobile only */}
              <div id="tickets" className="lg:hidden">
                <SectionReveal>
                  <TicketPanel event={eventDetail} isLoggedIn={isLoggedIn} />
                </SectionReveal>
              </div>

              {eventDetail.speakers && eventDetail.speakers.length > 0 && (
                <SectionReveal>
                  <EventHosts speakers={eventDetail.speakers} />
                </SectionReveal>
              )}

              {(event.venueName || event.venue) && (
                <SectionReveal>
                  <EventLocation
                    venueName={event.venueName}
                    venueAddress={event.venueAddress}
                    venueCity={event.venueCity}
                    venueState={event.venueState}
                    venue={event.venue}
                  />
                </SectionReveal>
              )}

              <SectionReveal>
                <EventDetailsSection event={eventDetail} />
              </SectionReveal>

              <SectionReveal>
                <EventPolicies />
              </SectionReveal>

              <SectionReveal>
                <EventOrganizer organizer={eventDetail.organizer} />
              </SectionReveal>
            </div>

            {/* ── Right column (desktop sticky ticket panel) ─────────── */}
            <div className="hidden lg:block">
              <TicketPanel event={eventDetail} isLoggedIn={isLoggedIn} />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />

      {/* ── Mobile sticky ticket CTA ─────────────────────────────────── */}
      <MobileTicketBar
        eventSlug={event.slug}
        minPrice={minPrice}
        soldOut={soldOut}
        salesEnded={salesEnded}
        salesNotStarted={salesNotStarted}
        isLoggedIn={isLoggedIn}
        isReserved={isReserved}
      />
    </div>
  )
}
