import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Calendar, MapPin, Ticket, ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { formatPrice } from '@/features/events/utils'

export const metadata: Metadata = { title: 'Booking Confirmed' }

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reservation?: string }>
}

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { reservation: reservationId } = await searchParams

  const session = await getSession()
  if (!session) redirect(`/login`)
  if (!reservationId) redirect(`/events/${slug}`)

  // Load confirmed reservation and its tickets
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId, userId: session.userId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          endsAt: true,
          venue: { select: { name: true, city: true, state: true } },
        },
      },
      eventSeats: {
        include: {
          tickets: {
            select: {
              id: true,
              ticketNumber: true,
              qrCode: true,
              status: true,
            },
          },
          seat: { select: { label: true } },
          ticketType: { select: { name: true, currency: true } },
        },
      },
    },
  })

  if (!reservation || reservation.status !== 'COMPLETED') {
    redirect(`/events/${slug}`)
  }

  const { event } = reservation
  const tickets = reservation.eventSeats
    .flatMap((es) => es.tickets)
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const totalPaid = reservation.eventSeats.reduce((sum, es) => sum + es.price, 0)
  const currency = reservation.eventSeats[0]?.ticketType?.currency ?? 'NGN'

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session.email} />

      <main className="flex-1 pt-[60px]">
        <div className="mx-auto max-w-[680px] px-5 py-12 sm:px-8 sm:py-16">
          {/* ── Success header ── */}
          <div className="mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight">You&apos;re going!</h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Your tickets are confirmed. Check your email for a copy.
            </p>
          </div>

          {/* ── Event card ── */}
          <div className="border-border bg-surface mb-6 overflow-hidden rounded-2xl border">
            {event.imageUrl && (
              <div className="relative h-[160px] w-full">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover object-center"
                  sizes="680px"
                />
                <div className="from-background/80 absolute inset-0 bg-gradient-to-t to-transparent" />
              </div>
            )}
            <div className="p-5">
              <h2 className="text-[17px] font-semibold">{event.title}</h2>
              <div className="mt-3 space-y-2">
                <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {format(event.startsAt, 'EEEE, MMMM d, yyyy · h:mm a')}
                  {event.endsAt && ` – ${format(event.endsAt, 'h:mm a')}`}
                </div>
                {event.venue && (
                  <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {event.venue.name}, {event.venue.city}
                    {event.venue.state ? `, ${event.venue.state}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tickets ── */}
          <div className="mb-6 space-y-3">
            {reservation.eventSeats.map((es) => (
              <div
                key={es.id}
                className="border-border bg-surface flex items-center gap-4 rounded-2xl border p-4"
              >
                {/* QR placeholder */}
                <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
                  <Ticket className="text-muted-foreground h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">
                    {es.ticketType?.name ?? 'Ticket'}
                    {es.seat && (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · Seat {es.seat.label}
                      </span>
                    )}
                  </p>
                  {es.tickets[0] && (
                    <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                      {es.tickets[0].ticketNumber}
                    </p>
                  )}
                </div>

                <p className="text-brand-500 shrink-0 text-[13.5px] font-bold">
                  {es.price === 0
                    ? 'Free'
                    : formatPrice(es.price, es.ticketType?.currency ?? currency)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Order total ── */}
          <div className="border-border bg-surface mb-8 rounded-2xl border p-5">
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="text-muted-foreground">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </span>
              <span className="font-bold">
                {totalPaid === 0 ? 'Free' : formatPrice(totalPaid, currency)}
              </span>
            </div>
            <div className="border-border/60 mt-3 border-t pt-3">
              <p className="text-muted-foreground text-[11.5px]">
                Booking ref: <span className="font-mono font-medium">{reservationId}</span>
              </p>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/tickets"
              className="from-brand-600 flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              View my tickets
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="border-border hover:bg-muted flex flex-1 items-center justify-center rounded-xl border py-3 text-[14px] font-medium transition-colors"
            >
              Discover more events
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
