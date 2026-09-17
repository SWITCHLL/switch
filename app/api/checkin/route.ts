/**
 * POST /api/checkin
 *
 * Validates a ticket QR code and marks it as USED.
 *
 * Time-slot validation:
 *  - If ticket is for a time slot, verifies it's within the show window (1 hour before start to end time)
 *  - If a time-slot-specific PIN was used, verifies it matches the ticket's slot
 *
 * Auth — two modes, checked in order:
 *  1. Session cookie (organizer logged in on their own device)
 *  2. Scan PIN  (door staff using a shared PIN — no login required)
 *     Body must include { scanPin: string } alongside qrCode + eventId + timeSlotId (optional).
 *
 * Body: { qrCode: string; eventId: string; scanPin?: string; timeSlotId?: string }
 *
 * Returns:
 *   200 { success: true;  ticket: { ticketNumber, attendeeName, ticketTypeName, seatLabel } }
 *   200 { success: false; reason: 'ALREADY_USED' | 'INVALID' | 'CANCELLED' | 'WRONG_TIMESLOT', ticket?, detail? }
 *   400  missing params
 *   401  not authenticated
 *   403  wrong organizer / time slot mismatch
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { verifyScanPin } from '@/lib/scan-pin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { TicketStatus } from '@/app/generated/prisma/client'

const GRACE_PERIOD_MS = 60 * 60 * 1000 // 1 hour grace period

export async function POST(req: NextRequest) {
  // Rate limit: 60 checkin attempts per minute per IP to prevent QR brute-forcing
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`checkin:ip:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  const body = await req.json().catch(() => null)
  const qrCode = body?.qrCode as string | undefined
  const eventId = body?.eventId as string | undefined
  const scanPin = body?.scanPin as string | undefined
  const timeSlotId = body?.timeSlotId as string | undefined

  if (!qrCode || !eventId) {
    return NextResponse.json({ error: 'qrCode and eventId are required' }, { status: 400 })
  }

  // ── Resolve who is calling ────────────────────────────────────────────────
  let authorized = false

  // 1. Session-based auth (organizer logged in)
  const session = await getSession()
  if (session) {
    if (session.role === 'ADMIN') {
      authorized = true
    } else {
      const organizer = await db.organizer.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      })
      if (organizer) {
        const event = await db.event.findUnique({
          where: { id: eventId, organizerId: organizer.id },
          select: { id: true },
        })
        if (event) authorized = true
      }
    }
  }

  // 2. PIN-based auth (door staff without login)
  if (!authorized && scanPin) {
    const pinResult = await verifyScanPin(eventId, scanPin, timeSlotId)
    if (pinResult) {
      // Double-check the event still belongs to that organizer
      const event = await db.event.findUnique({
        where: { id: eventId, organizerId: pinResult.organizerId },
        select: { id: true },
      })
      if (event) authorized = true
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: session ? 'Event not found or unauthorized' : 'Not authenticated' },
      { status: session ? 403 : 401 }
    )
  }

  // ── Find and validate the ticket ─────────────────────────────────────────
  const ticket = await db.ticket.findFirst({
    where: { qrCode, eventId },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      ticketType: { select: { name: true } },
      eventSeat: { select: { seat: { select: { label: true } } } },
      user: { select: { name: true, email: true } },
      timeSlotTickets: {
        select: {
          timeSlot: {
            select: {
              id: true,
              label: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      },
    },
  })

  if (!ticket) {
    return NextResponse.json({ success: false, reason: 'INVALID' })
  }

  if (ticket.status === TicketStatus.USED) {
    return NextResponse.json({
      success: false,
      reason: 'ALREADY_USED',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.user.name ?? ticket.user.email,
        ticketTypeName: ticket.ticketType.name,
        seatLabel: ticket.eventSeat?.seat?.label ?? null,
      },
    })
  }

  if (ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.REFUNDED) {
    return NextResponse.json({ success: false, reason: 'CANCELLED' })
  }

  // ── Validate time slot window (if ticket is for a time slot) ────────────────
  if (ticket.timeSlotTickets.length > 0) {
    const slotTicket = ticket.timeSlotTickets[0]
    const slot = slotTicket.timeSlot
    const now = new Date()

    // Doors open 1 hour before show start
    const doorsOpen = new Date(slot.startsAt.getTime() - GRACE_PERIOD_MS)

    // Show ends
    const showEnds = new Date(slot.endsAt)

    // Too early
    if (now < doorsOpen) {
      return NextResponse.json({
        success: false,
        reason: 'WRONG_TIMESLOT',
        detail: `Doors for "${slot.label}" open at ${doorsOpen.toLocaleTimeString()}`,
      })
    }

    // Show already ended
    if (now > showEnds) {
      return NextResponse.json({
        success: false,
        reason: 'WRONG_TIMESLOT',
        detail: `This ticket was for "${slot.label}" which has already ended`,
      })
    }

    // If PIN was time-slot-specific, verify it matches this ticket's slot
    if (scanPin) {
      const pinResult = await verifyScanPin(eventId, scanPin, slot.id)
      // If slot-specific PIN exists, it must match. Fall back to event-wide PIN.
      if (!pinResult) {
        return NextResponse.json(
          {
            success: false,
            reason: 'WRONG_TIMESLOT',
            detail: `This PIN is not authorized for "${slot.label}"`,
          },
          { status: 403 }
        )
      }
    }
  }

  // ── Mark as USED ──────────────────────────────────────────────────────────
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
