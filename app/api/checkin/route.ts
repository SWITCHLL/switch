/**
 * POST /api/checkin
 *
 * Validates a ticket QR code and marks it as USED.
 * Only the event organizer (or an admin) may call this.
 *
 * Body: { qrCode: string; eventId: string }
 *
 * Returns:
 *   200 { success: true; ticket: { ticketNumber, attendeeName, ticketTypeName, seatLabel } }
 *   400 { success: false; reason: 'ALREADY_USED' | 'WRONG_EVENT' | 'INVALID' | 'CANCELLED' }
 *   401 / 403
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { TicketStatus } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const qrCode = body?.qrCode as string | undefined
  const eventId = body?.eventId as string | undefined

  if (!qrCode || !eventId) {
    return NextResponse.json({ error: 'qrCode and eventId are required' }, { status: 400 })
  }

  // Verify the caller is the organizer of this event (or admin)
  if (session.role !== 'ADMIN') {
    const organizer = await db.organizer.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 })
    }
    const event = await db.event.findUnique({
      where: { id: eventId, organizerId: organizer.id },
      select: { id: true },
    })
    if (!event) {
      return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 403 })
    }
  }

  // Find the ticket by QR code
  const ticket = await db.ticket.findFirst({
    where: { qrCode, eventId },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      ticketType: { select: { name: true } },
      eventSeat: { select: { seat: { select: { label: true } } } },
      user: { select: { name: true, email: true } },
    },
  })

  if (!ticket) {
    return NextResponse.json({ success: false, reason: 'INVALID' }, { status: 200 })
  }

  if (ticket.status === TicketStatus.USED) {
    return NextResponse.json(
      {
        success: false,
        reason: 'ALREADY_USED',
        ticket: {
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.user.name ?? ticket.user.email,
          ticketTypeName: ticket.ticketType.name,
          seatLabel: ticket.eventSeat?.seat?.label ?? null,
        },
      },
      { status: 200 }
    )
  }

  if (
    ticket.status === TicketStatus.CANCELLED ||
    ticket.status === TicketStatus.REFUNDED
  ) {
    return NextResponse.json({ success: false, reason: 'CANCELLED' }, { status: 200 })
  }

  // Mark as USED
  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: TicketStatus.USED },
  })

  return NextResponse.json({
    success: true,
    ticket: {
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.user.name ?? ticket.user.email,
      ticketTypeName: ticket.ticketType.name,
      seatLabel: ticket.eventSeat?.seat?.label ?? null,
    },
  })
}
