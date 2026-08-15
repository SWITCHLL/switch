import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { getEventBySlug } from '@/features/events'
import { SeatMapClient } from '@/features/events/components/seat-map/seat-map-client'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Event Not Found' }
  return { title: `Select Seats — ${event.title}` }
}

export default async function SeatsPage({ params }: PageProps) {
  const { slug } = await params
  const [session, event] = await Promise.all([getSession(), getEventBySlug(slug)])

  if (!event) notFound()

  // GA events don't have a seat map — redirect back to event
  if (event.seatingType === 'GENERAL_ADMISSION') {
    redirect(`/events/${slug}`)
  }

  // Must be logged in to select seats
  if (!session) {
    redirect(`/login?redirect=/events/${slug}/seats`)
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session.email} />

      <main className="flex-1 pt-[60px]">
        {/* ── Top bar ── */}
        <div className="border-border/60 border-b">
          <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-5 py-3.5 sm:px-8">
            <Link
              href={`/events/${slug}`}
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-[13px] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to event
            </Link>

            <div className="border-border hidden h-4 w-px sm:block" />

            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-[13.5px] font-semibold">{event.title}</p>
              {event.startsAt && (
                <p className="text-muted-foreground text-[11.5px]">
                  {format(event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
                  {event.venue ? ` · ${event.venue.name}, ${event.venue.city}` : ''}
                </p>
              )}
            </div>

            {/* Step indicator */}
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Step n={1} label="Select seats" active />
              <div className="bg-border h-px w-6" />
              <Step n={2} label="Checkout" active={false} />
            </div>
          </div>
        </div>

        {/* ── Seat map ── */}
        <SeatMapClient event={event} userId={session.userId} />
      </main>

      <SiteFooter />
    </div>
  )
}

function Step({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          active ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'
        }`}
      >
        {n}
      </span>
      <span
        className={`text-[12px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  )
}
