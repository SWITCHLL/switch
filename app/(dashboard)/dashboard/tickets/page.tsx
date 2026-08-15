import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Ticket, Calendar, MapPin, QrCode } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getUserTickets } from '@/features/organizer/queries'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Tickets' }

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500',
  USED: 'bg-zinc-500/10 text-zinc-400',
  CANCELLED: 'bg-red-500/10 text-red-500',
  REFUNDED: 'bg-amber-500/10 text-amber-500',
  EXPIRED: 'bg-zinc-500/10 text-zinc-400',
}

export default async function MyTicketsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tickets = await getUserTickets(session.userId)

  const upcoming = tickets.filter((t) => new Date(t.event.startsAt) >= new Date())
  const past = tickets.filter((t) => new Date(t.event.startsAt) < new Date())

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Ticket className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="text-[16px] font-semibold">No tickets yet</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
            Book an event to see your tickets here.
          </p>
          <Link
            href="/events"
            className="from-brand-600 mt-6 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <TicketGroup title="Upcoming" tickets={upcoming} />}
          {past.length > 0 && <TicketGroup title="Past" tickets={past} dimmed />}
        </>
      )}
    </div>
  )
}

type Ticket = Awaited<ReturnType<typeof getUserTickets>>[number]

function TicketGroup({
  title,
  tickets,
  dimmed,
}: {
  title: string
  tickets: Ticket[]
  dimmed?: boolean
}) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-3 text-[14px] font-semibold tracking-wide uppercase">
        {title} · {tickets.length}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} dimmed={dimmed} />
        ))}
      </div>
    </div>
  )
}

function TicketCard({ ticket, dimmed }: { ticket: Ticket; dimmed?: boolean }) {
  const isPast = new Date(ticket.event.startsAt) < new Date()

  return (
    <div
      className={cn(
        'border-border bg-surface overflow-hidden rounded-2xl border',
        dimmed && 'opacity-70'
      )}
    >
      {/* Event image */}
      <div className="relative h-[110px]">
        {ticket.event.imageUrl ? (
          <Image
            src={ticket.event.imageUrl}
            alt={ticket.event.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 340px"
          />
        ) : (
          <div className="from-brand-900/50 h-full w-full bg-gradient-to-br to-violet-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold backdrop-blur-sm',
              STATUS_STYLES[ticket.status] ?? STATUS_STYLES.ACTIVE
            )}
          >
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="line-clamp-1 text-[13.5px] font-semibold">{ticket.event.title}</h3>

        <div className="mt-2.5 space-y-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {format(ticket.event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
          </div>
          {ticket.event.venue && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {ticket.event.venue.name}, {ticket.event.venue.city}
            </div>
          )}
        </div>

        {/* Ticket info */}
        <div className="border-border/60 mt-3.5 flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-[12px] font-medium">{ticket.ticketType.name}</p>
            {ticket.eventSeat?.seat && (
              <p className="text-muted-foreground text-[11px]">
                Seat {ticket.eventSeat.seat.label}
              </p>
            )}
            <p className="text-muted-foreground mt-0.5 font-mono text-[10.5px]">
              {ticket.ticketNumber}
            </p>
          </div>

          {/* QR code icon — full QR view is a future enhancement */}
          <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
            <QrCode className="text-muted-foreground h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
