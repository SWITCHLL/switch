'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { X, Calendar, MapPin, Tag, Hash } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { TicketQr } from './ticket-qr'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketModalData {
  id: string
  ticketNumber: string
  qrCode: string
  status: string
  issuedAt: Date
  ticketType: { name: string; currency: string }
  event: {
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
    venue: { name: string; city: string } | null
  }
  eventSeat: { seat: { label: string } } | null
}

interface TicketModalProps {
  ticket: TicketModalData
  open: boolean
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Valid', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  USED: { label: 'Used', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  REFUNDED: { label: 'Refunded', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  EXPIRED: { label: 'Expired', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function TicketModal({ ticket, open, onClose }: TicketModalProps) {
  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.ACTIVE
  const isValid = ticket.status === 'ACTIVE'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[360px] -translate-x-1/2 -translate-y-1/2',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <Dialog.Title className="sr-only">{ticket.event.title} — Ticket</Dialog.Title>

          {/* Close button */}
          <Dialog.Close className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>

          {/* ── Ticket body ── */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">

            {/* Top: event image + name */}
            <div className="relative h-[160px] w-full bg-zinc-900">
              {ticket.event.imageUrl ? (
                <Image
                  src={ticket.event.imageUrl}
                  alt={ticket.event.title}
                  fill
                  className="object-cover object-center"
                  sizes="360px"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-900 to-purple-800" />
              )}
              {/* Dark gradient at bottom so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Status badge */}
              <div className="absolute top-3 right-3">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold backdrop-blur-sm',
                    statusCfg.className
                  )}
                >
                  {statusCfg.label}
                </span>
              </div>

              {/* Event title over image */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-[16px] font-bold leading-snug text-white drop-shadow">
                  {ticket.event.title}
                </p>
              </div>
            </div>

            {/* Details strip */}
            <div className="space-y-2.5 bg-white px-5 pt-4 pb-2">
              <DetailRow icon={Calendar}>
                {format(ticket.event.startsAt, 'EEEE, MMMM d, yyyy')}
                <span className="text-zinc-400"> · </span>
                {format(ticket.event.startsAt, 'h:mm a')}
              </DetailRow>

              {ticket.event.venue && (
                <DetailRow icon={MapPin}>
                  {ticket.event.venue.name}, {ticket.event.venue.city}
                </DetailRow>
              )}

              <DetailRow icon={Tag}>
                {ticket.ticketType.name}
                {ticket.eventSeat?.seat && (
                  <span className="text-zinc-400"> · Seat {ticket.eventSeat.seat.label}</span>
                )}
              </DetailRow>

              <DetailRow icon={Hash}>
                <span className="font-mono text-[12px] tracking-wide">
                  {ticket.ticketNumber}
                </span>
              </DetailRow>
            </div>

            {/* ── Torn edge divider ── */}
            <TornEdge />

            {/* QR section */}
            <div className="flex flex-col items-center bg-white px-5 pb-6 pt-2">
              <div
                className={cn(
                  'rounded-2xl p-3',
                  isValid ? 'bg-white ring-2 ring-emerald-400/40' : 'bg-zinc-50 opacity-60'
                )}
              >
                <TicketQr value={ticket.qrCode} size={180} />
              </div>

              <p className="mt-3 text-center text-[11.5px] text-zinc-400">
                {isValid
                  ? 'Present this QR code at the entrance'
                  : 'This ticket is no longer valid'}
              </p>

              <p className="mt-1 font-mono text-[10px] tracking-widest text-zinc-300">
                {ticket.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Torn edge SVG ────────────────────────────────────────────────────────────

function TornEdge() {
  return (
    <div className="relative flex items-center bg-white">
      {/* Left notch */}
      <div className="absolute -left-3 h-6 w-6 rounded-full bg-black/70" />
      {/* Right notch */}
      <div className="absolute -right-3 h-6 w-6 rounded-full bg-black/70" />
      {/* Dashed line */}
      <div className="mx-5 w-full border-t-2 border-dashed border-zinc-200" />
    </div>
  )
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="text-[12.5px] leading-snug text-zinc-700">{children}</span>
    </div>
  )
}
