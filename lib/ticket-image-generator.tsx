/**
 * Server-side ticket image generation using @vercel/og (Satori).
 *
 * Pure JS — no Chrome, no native binaries. Works on Vercel serverless
 * and locally. Generates PNG buffers suitable for email attachments.
 *
 * Design matches the in-app ticket modal:
 *   - Event banner image (or gradient) with title + Valid badge
 *   - Details section: Date, Time, Ticket Type, Seat, Venue
 *   - Ticket number strip
 *   - Dashed perforation line with side notches
 *   - Large QR code + "SCAN AT ENTRANCE" label
 *   - Short ticket ID at bottom
 */
import 'server-only'
import QRCode from 'qrcode'
import { ImageResponse } from '@vercel/og'
import type { ReactElement } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketData {
  ticketNumber: string
  qrCode: string
  eventTitle: string
  eventDate: Date
  eventImageUrl?: string | null
  eventVenue?: string | null
  showLabel?: string | null
  ticketType: string
  seatLabel?: string | null
  ticketId?: string
  status?: 'ACTIVE' | 'USED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED'
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  ACTIVE:    { label: 'Valid',      dot: '#10b981', text: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' },
  USED:      { label: 'Used',       dot: '#a1a1aa', text: '#52525b', bg: '#f4f4f5', border: '#d4d4d8' },
  CANCELLED: { label: 'Cancelled',  dot: '#ef4444', text: '#991b1b', bg: '#fef2f2', border: '#fca5a5' },
  REFUNDED:  { label: 'Refunded',   dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
  EXPIRED:   { label: 'Expired',    dot: '#a1a1aa', text: '#52525b', bg: '#f4f4f5', border: '#d4d4d8' },
} as const

// ─── Generate ticket PNG ──────────────────────────────────────────────────────

export async function generateTicketImage(ticket: TicketData): Promise<Buffer> {
  const status = (ticket.status ?? 'ACTIVE') as keyof typeof STATUS
  const s = STATUS[status] ?? STATUS.ACTIVE
  const isValid = status === 'ACTIVE'

  const dateStr = ticket.eventDate.toLocaleDateString('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const timeStr = ticket.eventDate.toLocaleTimeString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const qrDataUrl = await QRCode.toDataURL(ticket.qrCode, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const shortId = (ticket.ticketId ?? ticket.qrCode).slice(0, 8).toUpperCase()

  // ─── Satori element tree ───────────────────────────────────────────────────
  // Satori only supports flex layout. All children in arrays must be objects.

  const element = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '400px',
        background: '#ffffff',
        borderRadius: '24px',
        overflow: 'hidden',
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      }}
    >
      {/* ── Header: event banner ── */}
      <div
        style={{
          display: 'flex',
          position: 'relative',
          height: '170px',
          width: '100%',
          overflow: 'hidden',
          background: ticket.eventImageUrl
            ? 'transparent'
            : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        }}
      >
        {/* Event banner image */}
        {ticket.eventImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ticket.eventImageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}

        {/* Dark gradient overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.05) 100%)',
            display: 'flex',
          }}
        />

        {/* Top shine line */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '1px',
            background: 'rgba(255,255,255,0.3)',
            display: 'flex',
          }}
        />

        {/* Status badge — top right */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: s.bg,
            color: s.text,
            border: `1.5px solid ${s.border}`,
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: s.dot,
              display: 'flex',
            }}
          />
          <span>{s.label}</span>
        </div>

        {/* Event title — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '20px',
            right: '20px',
            display: 'flex',
            color: 'white',
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: '1.3',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {ticket.eventTitle}
        </div>
      </div>

      {/* ── Details section ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          padding: '20px 20px 12px',
          gap: '16px 20px',
          background: 'white',
        }}
      >
        {ticket.showLabel && detailField('SHOW', ticket.showLabel, '🎭', true)}
        {detailField('DATE', dateStr, '📅')}
        {detailField('TIME', timeStr, '🕐')}
        {ticket.eventVenue && detailField('VENUE', ticket.eventVenue, '📍', true)}
        {detailField('TICKET TYPE', ticket.ticketType, '🏷')}
        {ticket.seatLabel && detailField('SEAT', ticket.seatLabel, '💺')}
      </div>

      {/* ── Ticket number strip ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '4px 20px 0',
          background: '#f4f4f5',
          border: '1px solid #e4e4e7',
          borderRadius: '10px',
          padding: '9px 14px',
        }}
      >
        <span style={{ color: '#a1a1aa', fontSize: '13px', fontWeight: 600 }}>#</span>
        <span
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            letterSpacing: '0.12em',
            color: '#71717a',
          }}
        >
          {ticket.ticketNumber}
        </span>
      </div>

      {/* ── Perforation ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          margin: '20px 0',
        }}
      >
        {/* Left notch */}
        <div
          style={{
            position: 'absolute',
            left: '-14px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            display: 'flex',
          }}
        />
        {/* Right notch */}
        <div
          style={{
            position: 'absolute',
            right: '-14px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            display: 'flex',
          }}
        />
        {/* Dashed line */}
        <div
          style={{
            flex: 1,
            marginLeft: '20px',
            marginRight: '20px',
            height: '1px',
            backgroundImage: 'repeating-linear-gradient(90deg, #d4d4d8 0, #d4d4d8 5px, transparent 5px, transparent 10px)',
            display: 'flex',
          }}
        />
      </div>

      {/* ── QR code stub ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 20px 28px',
          gap: '12px',
          opacity: isValid ? 1 : 0.4,
        }}
      >
        {/* QR frame */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: '#fafafa',
            border: '1.5px solid #e4e4e7',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR"
            style={{ width: '190px', height: '190px', borderRadius: '4px' }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: '#a1a1aa',
              textTransform: 'uppercase',
            }}
          >
            {isValid ? 'Scan at entrance' : 'Ticket invalid'}
          </span>
        </div>

        {/* Short ID */}
        <span
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: '#d4d4d8',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}
        >
          {shortId}
        </span>
      </div>
    </div>
  )

  const imageResponse = new ImageResponse(element as ReactElement, {
    width: 400,
    height: 680,
  })

  const arrayBuffer = await imageResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── Detail field helper ──────────────────────────────────────────────────────

function detailField(label: string, value: string, _icon: string, wide = false) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: wide ? '100%' : '46%',
        minWidth: '0',
      }}
    >
      <span
        style={{
          fontSize: '9.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#a1a1aa',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px', color: '#27272a', fontWeight: 500 }}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ─── Generate multiple ticket images ─────────────────────────────────────────

export async function generateTicketImages(
  tickets: TicketData[]
): Promise<Array<{ filename: string; content: Buffer; mimeType: string }>> {
  return Promise.all(
    tickets.map(async (ticket) => ({
      filename: `ticket-${ticket.ticketNumber}.png`,
      content: await generateTicketImage(ticket),
      mimeType: 'image/png',
    }))
  )
}
