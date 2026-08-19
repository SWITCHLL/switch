import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { getEventBySlug, getRelatedEvents, isSoldOut, getMinPrice } from '@/features/events'
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
import { RelatedEvents } from '@/components/events/related-events'
import { MobileTicketBar } from '@/components/events/mobile-ticket-bar'
import { SectionReveal } from '@/components/events/section-reveal'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Event Not Found' }

  const description = event.description
    ? event.description.slice(0, 160).replace(/\n/g, ' ')
    : undefined

  return {
    title: `${event.title} | SWITCH`,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.imageUrl ? [{ url: event.imageUrl, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: event.imageUrl ? [event.imageUrl] : [],
    },
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params

  const [session, event] = await Promise.all([getSession(), getEventBySlug(slug)])

  if (!event) notFound()

  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const salesEnded = Boolean(event.salesEnd && new Date(event.salesEnd) < new Date())
  const salesNotStarted = Boolean(event.salesStart && new Date(event.salesStart) > new Date())
  const isReserved = event.seatingType === 'RESERVED' || event.seatingType === 'MIXED'
  const isLoggedIn = Boolean(session)

  // Fetch related events in parallel (non-blocking for page render)
  const relatedEventsPromise = getRelatedEvents(event.id, event.category?.id ?? null, 6)

  const relatedEvents = await relatedEventsPromise

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a]">
      <SiteHeader userEmail={session?.email} />

      <main className="flex-1">
        {/* ── Cinematic Hero ─────────────────────────────────────────── */}
        <EventHero event={event} />

        {/* ── Event status banner ────────────────────────────────────── */}
        {(event.status === 'CANCELLED' || event.status === 'COMPLETED') && (
          <div
            className={`w-full py-3 text-center text-[13px] font-semibold ${
              event.status === 'CANCELLED'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-white/5 text-white/60'
            }`}
            role="alert"
          >
            {event.status === 'CANCELLED'
              ? 'This event has been cancelled.'
              : 'This event has already taken place.'}
          </div>
        )}

        {/* ── Meta strip ─────────────────────────────────────────────── */}
        <div className="border-b border-white/8 bg-[#0a0a0a]">
          <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8">
            <EventMeta event={event} />
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-16 lg:grid-cols-[1fr_360px] lg:gap-14 xl:grid-cols-[1fr_380px]">
            {/* ── Left column ────────────────────────────────────────── */}
            <div className="flex flex-col gap-16">
              {/* About */}
              {event.description && (
                <SectionReveal>
                  <EventAbout description={event.description} />
                </SectionReveal>
              )}

              {/* Photo gallery — only renders when 2+ images exist */}
              {event.images && event.images.length >= 2 && (
                <SectionReveal>
                  <EventGallery images={event.images} eventTitle={event.title} />
                </SectionReveal>
              )}

              {/* Ticket panel — mobile only (above hosts) */}
              <div id="tickets" className="lg:hidden">
                <SectionReveal>
                  <TicketPanel event={event} isLoggedIn={isLoggedIn} />
                </SectionReveal>
              </div>

              {/* Hosts & Performers */}
              {event.speakers && event.speakers.length > 0 && (
                <SectionReveal>
                  <EventHosts speakers={event.speakers} />
                </SectionReveal>
              )}

              {/* Location */}
              {event.venue && (
                <SectionReveal>
                  <EventLocation venue={event.venue} />
                </SectionReveal>
              )}

              {/* Event Details */}
              <SectionReveal>
                <EventDetailsSection event={event} />
              </SectionReveal>

              {/* Policies */}
              <SectionReveal>
                <EventPolicies />
              </SectionReveal>

              {/* Organizer */}
              <SectionReveal>
                <EventOrganizer organizer={event.organizer} />
              </SectionReveal>
            </div>

            {/* ── Right column (desktop sticky ticket panel) ─────────── */}
            <div className="hidden lg:block">
              <TicketPanel event={event} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* ── Related Events ─────────────────────────────────────── */}
          {relatedEvents.length > 0 && (
            <div className="mt-20 border-t border-white/8 pt-16 sm:mt-24 sm:pt-20">
              <SectionReveal>
                <RelatedEvents events={relatedEvents} currentEventId={event.id} />
              </SectionReveal>
            </div>
          )}
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
