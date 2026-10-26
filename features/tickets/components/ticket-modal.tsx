'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { X, Calendar, MapPin, Tag, Hash, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useRef, useState } from 'react'
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
    /** Resolved venue label, prefers FK relation then inline fields */
    resolvedVenue: string | null
  }
  timeSlot?: {
    id: string
    label: string
    startsAt: Date
    endsAt: Date
  }
  eventSeat: { seat: { label: string } } | null
}

interface TicketModalProps {
  ticket: TicketModalData
  open: boolean
  onClose: () => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; border: string; bg: string }
> = {
  ACTIVE: {
    label: 'Valid',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
  },
  USED: {
    label: 'Used',
    dot: 'bg-zinc-400',
    text: 'text-zinc-500',
    border: 'border-zinc-300',
    bg: 'bg-zinc-50',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    text: 'text-red-700',
    border: 'border-red-300',
    bg: 'bg-red-50',
  },
  REFUNDED: {
    label: 'Refunded',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
  },
  EXPIRED: {
    label: 'Expired',
    dot: 'bg-zinc-400',
    text: 'text-zinc-500',
    border: 'border-zinc-300',
    bg: 'bg-zinc-50',
  },
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function TicketModal({ ticket, open, onClose }: TicketModalProps) {
  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.ACTIVE
  const isValid = ticket.status === 'ACTIVE'
  const ticketRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return

    try {
      setIsDownloading(true)
      // Dynamically import html-to-image so it's not bundled in the initial JS
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `ticket-${ticket.ticketNumber}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download ticket:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[360px] -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[calc(100dvh-2rem)] flex-col px-4',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <Dialog.Title className="sr-only">{ticket.event.title} — Ticket</Dialog.Title>

          {/* Action buttons row — always visible above ticket */}
          <div className="mb-3 flex shrink-0 items-center justify-end gap-2">
            {/* Download button */}
            <button
              onClick={handleDownloadTicket}
              disabled={isDownloading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition-all hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download ticket as image"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download ticket</span>
            </button>

            {/* Close */}
            <Dialog.Close className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition-all hover:bg-white/20">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {/* Scrollable ticket area */}
          <div className="min-h-0 overflow-y-auto rounded-3xl">

          {/* ── Physical ticket shell ── */}
          <div ref={ticketRef} className="ticket-paper overflow-hidden rounded-3xl">

            {/* ── TOP: event image banner ── */}
            <div className="relative h-[165px] w-full overflow-hidden">
              {ticket.event.imageUrl ? (
                <Image
                  src={ticket.event.imageUrl}
                  alt={ticket.event.title}
                  fill
                  className="object-cover object-center"
                  sizes="360px"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-800 to-indigo-700" />
              )}
              {/* Gradient so text reads cleanly */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              {/* Inner shine at top edge — like light hitting the ticket */}
              <div className="absolute inset-x-0 top-0 h-px bg-white/30" />

              {/* Status stamp */}
              <div className="absolute top-3.5 right-3.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide backdrop-blur-sm',
                    statusCfg.bg,
                    statusCfg.text,
                    statusCfg.border
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                  {statusCfg.label}
                </span>
              </div>

              {/* Event title */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <p className="text-[17px] font-bold leading-snug text-white drop-shadow-md">
                  {ticket.event.title}
                </p>
              </div>
            </div>

            {/* ── MIDDLE: event details in two columns ── */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 pt-5 pb-4">
              {/* Show title if available */}
              {ticket.timeSlot && (
                <TicketField
                  label="Show"
                  icon={Calendar}
                  value={ticket.timeSlot.label}
                  wide
                />
              )}
              
              <TicketField
                label="Date"
                icon={Calendar}
                value={format(ticket.timeSlot?.startsAt ?? ticket.event.startsAt, 'MMM d, yyyy')}
              />
              <TicketField
                label="Time"
                icon={Calendar}
                value={format(ticket.timeSlot?.startsAt ?? ticket.event.startsAt, 'h:mm a')}
              />
              {ticket.event.resolvedVenue && (
                <TicketField
                  label="Venue"
                  icon={MapPin}
                  value={ticket.event.resolvedVenue}
                  wide
                />
              )}
              <TicketField
                label="Ticket type"
                icon={Tag}
                value={ticket.ticketType.name}
              />
              {ticket.eventSeat?.seat && (
                <TicketField
                  label="Seat"
                  icon={Tag}
                  value={ticket.eventSeat.seat.label}
                />
              )}
            </div>

            {/* Ticket number strip — full width, mono */}
            <div className="mx-5 flex items-center gap-2 rounded-lg bg-zinc-100/80 px-3 py-2 ring-1 ring-zinc-200/80">
              <Hash className="h-3 w-3 shrink-0 text-zinc-400" />
              <span className="font-mono text-[11.5px] tracking-[0.12em] text-zinc-500">
                {ticket.ticketNumber}
              </span>
            </div>

            {/* ── PERFORATION ── */}
            <Perforation />

            {/* ── STUB: QR code ── */}
            <div className="flex flex-col items-center px-5 pt-3 pb-6">
              {/* QR frame with stamp feel */}
              <div
                className={cn(
                  'ticket-stamp flex flex-col items-center gap-2 px-6 py-4',
                  !isValid && 'opacity-50 grayscale'
                )}
              >
                <TicketQr value={ticket.qrCode} size={170} />

                {/* Scan instruction */}
                <p className="ticket-label mt-1">
                  {isValid ? 'Scan at entrance' : 'Ticket invalid'}
                </p>
              </div>

              {/* Unique ID */}
              <p className="mt-3 font-mono text-[9.5px] tracking-[0.2em] text-zinc-300 uppercase">
                {ticket.id.slice(0, 8)}
              </p>
            </div>
          </div>
          </div>{/* end scrollable wrapper */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Perforation divider ──────────────────────────────────────────────────────
// Semicircle notches + dashed line, like a real tear-off stub.

function Perforation() {
  return (
    <div className="relative my-4 flex items-center">
      {/* Left notch */}
      <div className="absolute -left-3.5 z-10 h-7 w-7 rounded-full bg-black/55 shadow-inner" />
      {/* Right notch */}
      <div className="absolute -right-3.5 z-10 h-7 w-7 rounded-full bg-black/55 shadow-inner" />
      {/* Dashed perforation line */}
      <div className="mx-5 flex w-full items-center gap-[5px]">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="h-px flex-1 rounded-full bg-zinc-300"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Ticket field ─────────────────────────────────────────────────────────────

function TicketField({
  label,
  icon: Icon,
  value,
  wide = false,
}: {
  label: string
  icon: React.ElementType
  value: string
  wide?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'col-span-2')}>
      <span className="ticket-label">{label}</span>
      <div className="flex items-start gap-1.5">
        <Icon className="mt-[1px] h-3 w-3 shrink-0 text-zinc-400" />
        <span className="text-[12.5px] leading-snug text-zinc-700">{value}</span>
      </div>
    </div>
  )
}
