/**
 * Generates a PDF ticket file as a Uint8Array.
 *
 * One page per ticket. Each page is A5 landscape (148×210mm) — wallet-friendly
 * and easy to print or show on a phone screen.
 *
 * Layout per page:
 *   ┌─────────────────────────────────────────┐
 *   │  SWITCH                    [event name] │
 *   │─────────────────────────────────────────│
 *   │  [ticket type]  [seat?]                 │
 *   │  [ticket number]                        │
 *   │  [date]                                 │
 *   │  [venue]                                │
 *   │                          [QR code 90px] │
 *   │─────────────────────────────────────────│
 *   │  Ref: xxx                               │
 *   └─────────────────────────────────────────┘
 */

import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'

export interface TicketPdfInput {
  eventTitle: string
  eventDate: Date
  venueName?: string | null
  tickets: Array<{
    ticketNumber: string
    qrCode: string
    ticketTypeName: string
    seatLabel?: string | null
  }>
  reservationId: string
}

// A5 landscape in points (1pt = 1/72 inch)
const PAGE_W = 595  // ~210mm
const PAGE_H = 420  // ~148mm
const MARGIN = 36

function hex(r: number, g: number, b: number) {
  return rgb(r / 255, g / 255, b / 255)
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateTicketPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const boldFont  = await doc.embedFont(StandardFonts.HelveticaBold)
  const plainFont = await doc.embedFont(StandardFonts.Helvetica)

  const dateStr = input.eventDate.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  for (const ticket of input.tickets) {
    const page = doc.addPage([PAGE_W, PAGE_H])

    // ── Background ──────────────────────────────────────────────────────────
    page.drawRectangle({
      x: 0, y: 0,
      width: PAGE_W, height: PAGE_H,
      color: hex(9, 9, 11), // #09090b
    })

    // ── Header band ─────────────────────────────────────────────────────────
    page.drawRectangle({
      x: 0, y: PAGE_H - 56,
      width: PAGE_W, height: 56,
      color: hex(24, 24, 27), // #18181b
    })

    // SWITCH wordmark
    drawText(page, boldFont, 'SWITCH', MARGIN, PAGE_H - 32, 18, hex(250, 250, 250))

    // Event title — truncate to fit
    const titleMaxW = PAGE_W - MARGIN * 2 - 80
    const titleStr = truncate(input.eventTitle, boldFont, 13, titleMaxW)
    drawText(page, boldFont, titleStr, MARGIN, PAGE_H - 50, 13, hex(161, 161, 170))

    // ── Divider ─────────────────────────────────────────────────────────────
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 60 },
      end:   { x: PAGE_W - MARGIN, y: PAGE_H - 60 },
      thickness: 0.5,
      color: hex(39, 39, 42),
    })

    // ── QR code (right side) ─────────────────────────────────────────────
    const QR_SIZE = 110
    const qrX = PAGE_W - MARGIN - QR_SIZE
    const qrY = PAGE_H - 60 - QR_SIZE - 8

    const qrDataUrl = await QRCode.toDataURL(ticket.qrCode, {
      width: QR_SIZE * 3, // high-res for print
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H', // highest for print
    })
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
    const qrImage = await doc.embedPng(Buffer.from(qrBase64, 'base64'))

    // White background behind QR
    page.drawRectangle({
      x: qrX - 6, y: qrY - 6,
      width: QR_SIZE + 12, height: QR_SIZE + 12,
      color: rgb(1, 1, 1),
    })
    page.drawImage(qrImage, {
      x: qrX, y: qrY,
      width: QR_SIZE, height: QR_SIZE,
    })

    // ── Ticket details (left side) ───────────────────────────────────────
    const contentX = MARGIN
    let y = PAGE_H - 80

    // Ticket type + seat
    const typeLabel = ticket.seatLabel
      ? `${ticket.ticketTypeName}  ·  Seat ${ticket.seatLabel}`
      : ticket.ticketTypeName
    drawText(page, boldFont, typeLabel, contentX, y, 15, hex(250, 250, 250))

    y -= 22
    // Ticket number
    drawText(page, plainFont, ticket.ticketNumber, contentX, y, 11, hex(113, 113, 122))

    y -= 24
    // Date
    drawText(page, plainFont, dateStr, contentX, y, 11, hex(161, 161, 170))

    if (input.venueName) {
      y -= 18
      drawText(page, plainFont, input.venueName, contentX, y, 11, hex(161, 161, 170))
    }

    // ── Bottom strip ─────────────────────────────────────────────────────
    page.drawRectangle({
      x: 0, y: 0,
      width: PAGE_W, height: 34,
      color: hex(24, 24, 27),
    })

    drawText(
      page, plainFont,
      `Booking ref: ${input.reservationId}`,
      MARGIN, 12, 9, hex(82, 82, 91)
    )
    drawText(
      page, plainFont,
      'Present this ticket at the entrance',
      PAGE_W - MARGIN - 180, 12, 9, hex(82, 82, 91)
    )

    // ── Torn-edge notches ─────────────────────────────────────────────────
    // Left and right semicircles on the divider line
    page.drawCircle({
      x: 0, y: PAGE_H - 60,
      size: 10,
      color: hex(9, 9, 11),
    })
    page.drawCircle({
      x: PAGE_W, y: PAGE_H - 60,
      size: 10,
      color: hex(9, 9, 11),
    })
  }

  return doc.save()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawText(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>
) {
  page.drawText(text, { x, y, size, font, color })
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '…', size) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}
