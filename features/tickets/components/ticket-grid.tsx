'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Calendar, MapPin, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { TicketModal, type TicketModalData } from './ticket-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500',
  USED: 'bg-zinc-500/10 text-zinc-400',
  CANCELLED: 'bg-red-500/10 text-red-500',
  REFUNDED: 'bg-amber-500/10 text-amber-500',
  EXPIRED: 'bg-zinc-500/10 text-zinc-400',
}

interface TicketGridProps {
  tickets: TicketModalData[]
  dimmed?: boolean
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function TicketGrid({ tickets, dimmed }: TicketGridProps) {
  const [selected, setSelected] = useState<TicketModalData | null>(null)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            dimmed={dimmed}
            onClick={() => setSelected(ticket)}
          />
        ))}
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  dimmed,
  onClick,
}: {
  ticket: TicketModalData
  dimmed?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-border bg-surface w-full overflow-hidden rounded-2xl border text-left',
        'transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
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

          {/* QR hint */}
          <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
            <QrCode className="text-muted-foreground h-5 w-5" />
          </div>
        </div>
      </div>
    </button>
  )
}
