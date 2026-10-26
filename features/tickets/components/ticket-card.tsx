'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format, isPast } from 'date-fns'
import { Calendar, MapPin, Tag, Hash, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TicketModal, type TicketModalData } from './ticket-modal'
import type { TicketWithDetails } from '../types'

interface TicketCardProps {
  ticket: TicketWithDetails
  className?: string
}

// Status config — light-on-glass badges
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; ring: string }> = {
  ACTIVE: {
    label: 'Valid',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  ACTIVE_PASSED: {
    label: 'Event Passed',
    dot: 'bg-zinc-500',
    text: 'text-zinc-400',
    ring: 'ring-zinc-500/20',
  },
  USED: {
    label: 'Used',
    dot: 'bg-zinc-500',
    text: 'text-zinc-400',
    ring: 'ring-zinc-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
  },
  REFUNDED: {
    label: 'Refunded',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    ring: 'ring-amber-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    dot: 'bg-zinc-500',
    text: 'text-zinc-500',
    ring: 'ring-zinc-500/20',
  },
}

export function TicketCard({ ticket, className }: TicketCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Determine effective display status:
  // If the ticket is still ACTIVE but the event has already passed, show "Event Passed"
  const eventEnded = isPast(ticket.event.endsAt ?? ticket.event.startsAt)
  const displayStatusKey =
    ticket.status === 'ACTIVE' && eventEnded ? 'ACTIVE_PASSED' : ticket.status

  const statusCfg = STATUS_CONFIG[displayStatusKey] ?? STATUS_CONFIG.ACTIVE
  const isValid = ticket.status === 'ACTIVE' && !eventEnded
  const location = ticket.event.venue
    ? `${ticket.event.venue.name}, ${ticket.event.venue.city}`
    : ticket.event.venueName
    ? [ticket.event.venueName, ticket.event.venueCity].filter(Boolean).join(', ')
    : null

  const modalData: TicketModalData = {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    qrCode: ticket.qrCode,
    status: ticket.status,
    issuedAt: ticket.issuedAt,
    ticketType: {
      name: ticket.ticketType.name,
      currency: ticket.ticketType.currency,
    },
    event: {
      title: ticket.event.title,
      slug: ticket.event.slug,
      imageUrl: ticket.event.imageUrl,
      startsAt: ticket.event.startsAt,
      venue: ticket.event.venue,
      resolvedVenue: location,
    },
    timeSlot: ticket.timeSlotTickets.length > 0 ? ticket.timeSlotTickets[0].timeSlot : undefined,
    eventSeat: ticket.eventSeat,
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          'neo-ticket group relative w-full overflow-hidden rounded-xl bg-zinc-950 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          !isValid && 'opacity-70',
          className
        )}
      >
        {/* ── Image banner ── */}
        <div className="relative h-28 w-full overflow-hidden">
          {ticket.event.imageUrl ? (
            <Image
              src={ticket.event.imageUrl}
              alt={ticket.event.title}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-900/60 to-indigo-900/60" />
          )}

          {/* gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75" />

          {/* Glass status badge */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                'bg-black/40 backdrop-blur-md ring-1',
                statusCfg.text,
                statusCfg.ring
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>

          {/* Scan icon — appears on hover */}
          <div className="absolute right-2.5 bottom-2.5 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <ScanLine className="h-3.5 w-3.5 text-white" aria-hidden />
            </span>
          </div>

          {/* Event title */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
            <p className="line-clamp-1 text-[13.5px] font-bold leading-snug text-white drop-shadow">
              {ticket.event.title}
            </p>
          </div>
        </div>

        {/* ── Details ── */}
        <div className="space-y-1.5 px-3 py-3">
          {/* Show title if available from time slot */}
          {ticket.timeSlotTickets.length > 0 && (
            <div className="mb-2 line-clamp-1 text-xs font-semibold text-zinc-200">
              {ticket.timeSlotTickets[0].timeSlot.label}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Calendar className="h-3 w-3 shrink-0 text-zinc-500" />
            <span>{format(ticket.timeSlotTickets.length > 0 ? ticket.timeSlotTickets[0].timeSlot.startsAt : ticket.event.startsAt, 'MMM d, yyyy')}</span>
            <span className="text-zinc-700">·</span>
            <span>{format(ticket.timeSlotTickets.length > 0 ? ticket.timeSlotTickets[0].timeSlot.startsAt : ticket.event.startsAt, 'h:mm a')}</span>
          </div>

          {location && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <MapPin className="h-3 w-3 shrink-0 text-zinc-500" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Tag className="h-3 w-3 shrink-0 text-zinc-500" />
            <span>{ticket.ticketType.name}</span>
            {ticket.eventSeat?.seat && (
              <>
                <span className="text-zinc-700">·</span>
                <span>Seat {ticket.eventSeat.seat.label}</span>
              </>
            )}
          </div>

          {/* Ticket number — bottom strip */}
          <div className="mt-1 flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-2 py-1.5 ring-1 ring-white/[0.04]">
            <Hash className="h-2.5 w-2.5 shrink-0 text-zinc-600" />
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-zinc-500">
              {ticket.ticketNumber}
            </span>
          </div>
        </div>
      </button>

      <TicketModal ticket={modalData} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
