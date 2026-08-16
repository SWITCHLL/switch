import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { getEventBySlug } from '@/features/events'
import { db } from '@/lib/db'
import { CheckoutClient } from '@/features/checkout/components/checkout-client'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ seats?: string; reservation?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Checkout' }
  return { title: `Checkout — ${event.title}` }
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { seats: seatsParam, reservation: reservationParam } = await searchParams

  const [session, event] = await Promise.all([getSession(), getEventBySlug(slug)])

  if (!event) notFound()
  if (!session) redirect(`/login?redirect=/events/${slug}/checkout`)

  // ── Reserved seating: load EventSeat data from the seat IDs in the URL ──
  let checkoutSeats: Array<{
    id: string
    price: number
    seat: { id: string; label: string; sectionId: string }
    ticketType: { id: string; name: string; currency: string } | null
    section: { name: string }
    row: { label: string }
  }> = []

  if (seatsParam && event.seatingType !== 'GENERAL_ADMISSION') {
    const eventSeatIds = seatsParam.split(',').filter(Boolean).slice(0, 10)

    if (eventSeatIds.length > 0) {
      const rawSeats = await db.eventSeat.findMany({
        where: {
          id: { in: eventSeatIds },
          eventId: event.id,
          status: { in: ['AVAILABLE', 'HELD'] },
        },
        include: {
          seat: {
            select: {
              id: true,
              label: true,
              sectionId: true,
              row: { select: { label: true } },
            },
          },
          ticketType: { select: { id: true, name: true, currency: true } },
        },
      })

      // Resolve section names
      const sectionIds = [...new Set(rawSeats.map((s) => s.seat.sectionId))]
      const sections = await db.section.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, name: true },
      })
      const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s.name]))

      checkoutSeats = rawSeats.map((s) => ({
        id: s.id,
        price: s.price,
        seat: { id: s.seat.id, label: s.seat.label, sectionId: s.seat.sectionId },
        ticketType: s.ticketType,
        section: { name: sectionMap[s.seat.sectionId] ?? 'Section' },
        row: { label: s.seat.row.label },
      }))
    }

    // If no valid seats found, redirect back to seat selection
    if (checkoutSeats.length === 0) {
      redirect(`/events/${slug}/seats`)
    }
  }

  const subtotal = checkoutSeats.reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session.email} />

      <main className="flex-1 pt-[60px]">
        {/* ── Top bar ── */}
        <div className="border-border/60 border-b">
          <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-5 py-3.5 sm:px-8">
            <Link
              href={`/events/${slug}/seats`}
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 text-[13px] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to seats
            </Link>

            <div className="border-border hidden h-4 w-px sm:block" />

            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-[13.5px] font-semibold">{event.title}</p>
              {event.startsAt && (
                <p className="text-muted-foreground text-[11.5px]">
                  {format(event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
                  {event.venue ? ` · ${event.venue.name}` : ''}
                </p>
              )}
            </div>

            {/* Step indicator */}
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Step n={1} label="Select seats" active={false} done />
              <div className="bg-border h-px w-6" />
              <Step n={2} label="Checkout" active />
              <div className="bg-border h-px w-6" />
              <Step n={3} label="Confirmation" active={false} />
            </div>
          </div>
        </div>

        {/* ── Checkout content ── */}
        <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
          <CheckoutClient
            event={{
              id: event.id,
              slug: event.slug,
              title: event.title,
              seatingType: event.seatingType,
              ticketTypes: event.ticketTypes,
            }}
            checkoutSeats={checkoutSeats}
            subtotal={subtotal}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function Step({
  n,
  label,
  active,
  done,
}: {
  n: number
  label: string
  active: boolean
  done?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          done
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-brand-600 text-white'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span
        className={`text-[12px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  )
}
