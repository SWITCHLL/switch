'use server'

import { db } from '@/lib/db'
import { acquireSeatLock, releaseAllSeatLocks, SEAT_LOCK_TTL } from '@/lib/redis'
import { getSession } from '@/lib/session'
import { sendTicketConfirmationEmail } from '@/lib/email'
import { scheduleReservationExpiry } from '@/lib/queues'
import {
  reserveSeatsSchema,
  reserveGASchema,
  confirmOrderSchema,
  releaseReservationSchema,
} from './schemas'
import type { ReserveSeatsResult, ConfirmOrderResult, ReleaseReservationResult } from './types'
import { EventSeatStatus, ReservationStatus, TicketStatus } from '@/app/generated/prisma/client'
import { randomBytes } from 'crypto'

// ─── Reservation TTL ─────────────────────────────────────────────────────────

const RESERVATION_TTL_MS = SEAT_LOCK_TTL * 1000 // 10 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

function generateQrCode(): string {
  // Opaque token — the backend verifies this, never exposing user data in the QR
  return randomBytes(16).toString('hex')
}

// ─── Reserve seats (RESERVED / MIXED events) ─────────────────────────────────

export async function reserveSeats(input: unknown): Promise<ReserveSeatsResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = reserveSeatsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, eventSeatIds } = parsed.data
  const { userId } = session

  // 1. Validate event exists and is published
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, salesStart: true, salesEnd: true },
  })
  if (!event || event.status !== 'PUBLISHED') {
    return { success: false, error: 'Event not found or not available' }
  }
  if (event.salesEnd && new Date(event.salesEnd) < new Date()) {
    return { success: false, error: 'Ticket sales have ended' }
  }
  if (event.salesStart && new Date(event.salesStart) > new Date()) {
    return { success: false, error: 'Ticket sales have not started yet' }
  }

  // 2. Acquire Redis locks for all seats atomically
  // If any lock fails, roll back all acquired locks
  const acquiredSeatIds: string[] = []
  const conflictingSeatIds: string[] = []

  for (const eventSeatId of eventSeatIds) {
    // Get the underlying seatId for the lock key
    const eventSeat = await db.eventSeat.findUnique({
      where: { id: eventSeatId },
      select: { seatId: true, status: true },
    })
    if (!eventSeat || eventSeat.status !== EventSeatStatus.AVAILABLE) {
      conflictingSeatIds.push(eventSeatId)
      continue
    }
    const acquired = await acquireSeatLock(eventId, eventSeat.seatId, userId)
    if (!acquired) {
      conflictingSeatIds.push(eventSeatId)
    } else {
      acquiredSeatIds.push(eventSeat.seatId)
    }
  }

  if (conflictingSeatIds.length > 0) {
    // Roll back any locks we did acquire
    await releaseAllSeatLocks(eventId, acquiredSeatIds, userId)
    return {
      success: false,
      error: `${conflictingSeatIds.length} seat(s) are no longer available`,
      conflictingSeatIds,
    }
  }

  // 3. Database transaction: create reservation + mark seats as HELD
  try {
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

    const result = await db.$transaction(async (tx) => {
      // Re-check seat availability inside the transaction (double-check after lock)
      const seats = await tx.eventSeat.findMany({
        where: { id: { in: eventSeatIds } },
        select: { id: true, seatId: true, status: true, price: true },
      })

      const unavailable = seats.filter((s) => s.status !== EventSeatStatus.AVAILABLE)
      if (unavailable.length > 0) {
        throw new Error('SEATS_UNAVAILABLE')
      }

      // Create the reservation
      const reservation = await tx.reservation.create({
        data: {
          eventId,
          userId,
          status: ReservationStatus.ACTIVE,
          expiresAt,
        },
      })

      // Mark each seat as HELD and link to reservation
      await tx.eventSeat.updateMany({
        where: { id: { in: eventSeatIds } },
        data: {
          status: EventSeatStatus.HELD,
          reservationId: reservation.id,
          lockedUntil: expiresAt,
        },
      })

      return reservation
    })

    // Schedule background cleanup in case the user abandons checkout
    scheduleReservationExpiry(result.id, result.expiresAt).catch(console.error)

    return {
      success: true,
      reservationId: result.id,
      expiresAt: result.expiresAt,
    }
  } catch (err) {
    // Release all Redis locks on failure
    await releaseAllSeatLocks(eventId, acquiredSeatIds, userId)

    if (err instanceof Error && err.message === 'SEATS_UNAVAILABLE') {
      return { success: false, error: 'One or more seats are no longer available' }
    }
    console.error('[reserveSeats] transaction error:', err)
    return { success: false, error: 'Failed to reserve seats. Please try again.' }
  }
}

export async function reserveGATickets(input: unknown): Promise<ReserveSeatsResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = reserveGASchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, selections } = parsed.data
  const { userId } = session

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, salesStart: true, salesEnd: true },
  })
  if (!event || event.status !== 'PUBLISHED') {
    return { success: false, error: 'Event not found or not available' }
  }

  try {
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)

    const result = await db.$transaction(async (tx) => {
      // Verify ticket type availability
      for (const sel of selections) {
        const tt = await tx.ticketType.findUnique({
          where: { id: sel.ticketTypeId },
          select: { id: true, quantity: true, sold: true, status: true, eventId: true },
        })
        if (!tt || tt.eventId !== eventId || tt.status === 'INACTIVE') {
          throw new Error('INVALID_TICKET_TYPE')
        }
        if (tt.quantity !== null && tt.quantity - tt.sold < sel.quantity) {
          throw new Error('INSUFFICIENT_QUANTITY')
        }
      }

      return tx.reservation.create({
        data: {
          eventId,
          userId,
          status: ReservationStatus.ACTIVE,
          expiresAt,
        },
      })
    })

    // Schedule background cleanup in case the user abandons checkout
    scheduleReservationExpiry(result.id, result.expiresAt).catch(console.error)

    return {
      success: true,
      reservationId: result.id,
      expiresAt: result.expiresAt,
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_TICKET_TYPE') {
        return { success: false, error: 'Invalid ticket type' }
      }
      if (err.message === 'INSUFFICIENT_QUANTITY') {
        return { success: false, error: 'Not enough tickets remaining' }
      }
    }
    console.error('[reserveGATickets] error:', err)
    return { success: false, error: 'Failed to reserve tickets. Please try again.' }
  }
}

// ─── Confirm order (post-payment) ────────────────────────────────────────────
// In production this would be called from a payment webhook, not directly.
// For now it's called directly to complete the flow (payment integration TBD).

export async function confirmOrder(input: unknown): Promise<ConfirmOrderResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = confirmOrderSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { reservationId } = parsed.data
  const { userId } = session

  // Load the reservation with its held seats
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: {
        include: {
          ticketType: { select: { id: true } },
          seat: { select: { id: true } },
        },
      },
      event: { select: { id: true, slug: true, title: true, startsAt: true } },
    },
  })

  if (!reservation) return { success: false, error: 'Reservation not found' }
  if (reservation.userId !== userId) return { success: false, error: 'Unauthorized' }
  if (reservation.status !== ReservationStatus.ACTIVE) {
    return { success: false, error: 'Reservation is no longer active' }
  }
  if (new Date(reservation.expiresAt) < new Date()) {
    return { success: false, error: 'Reservation has expired' }
  }

  try {
    const ticketIds = await db.$transaction(async (tx) => {
      const createdTicketIds: string[] = []

      for (const eventSeat of reservation.eventSeats) {
        const ticketNumber = generateTicketNumber()
        const qrCode = generateQrCode()

        const ticket = await tx.ticket.create({
          data: {
            eventId: reservation.eventId,
            userId,
            eventSeatId: eventSeat.id,
            ticketTypeId: eventSeat.ticketTypeId ?? reservation.eventSeats[0]!.ticketTypeId!,
            ticketNumber,
            qrCode,
            status: TicketStatus.ACTIVE,
            issuedAt: new Date(),
          },
        })
        createdTicketIds.push(ticket.id)

        // Mark seat as SOLD
        await tx.eventSeat.update({
          where: { id: eventSeat.id },
          data: { status: EventSeatStatus.SOLD },
        })

        // Increment sold count on ticket type
        if (eventSeat.ticketTypeId) {
          await tx.ticketType.update({
            where: { id: eventSeat.ticketTypeId },
            data: { sold: { increment: 1 } },
          })
        }
      }

      // Mark reservation as completed
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.COMPLETED },
      })

      return createdTicketIds
    })

    // Release Redis locks (seats are now SOLD, locks no longer needed)
    const seatIds = reservation.eventSeats.map((es) => es.seatId)
    await releaseAllSeatLocks(
      reservation.eventId,
      seatIds.map((s) => s),
      userId
    )

    // Send confirmation email (non-blocking — don't fail the order if email fails)
    db.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: {
        ticketNumber: true,
        qrCode: true,
        ticketType: { select: { name: true } },
        eventSeat: { select: { seat: { select: { label: true } } } },
      },
    }).then((tickets) =>
      sendTicketConfirmationEmail({
        userId,
        eventTitle: reservation.event.title,
        eventDate: reservation.event.startsAt,
        eventSlug: reservation.event.slug,
        ticketCount: ticketIds.length,
        reservationId,
        tickets: tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          qrCode: t.qrCode,
          ticketTypeName: t.ticketType.name,
          seatLabel: t.eventSeat?.seat?.label ?? null,
        })),
      })
    ).catch((err) => console.error('[confirmOrder] email error:', err))

    return { success: true, ticketIds }
  } catch (err) {
    console.error('[confirmOrder] transaction error:', err)
    return { success: false, error: 'Failed to confirm order. Please contact support.' }
  }
}

// ─── Release reservation ──────────────────────────────────────────────────────

export async function releaseReservation(input: unknown): Promise<ReleaseReservationResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = releaseReservationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { reservationId } = parsed.data
  const { userId } = session

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      eventSeats: { select: { id: true, seatId: true } },
    },
  })

  if (!reservation) return { success: false, error: 'Reservation not found' }
  if (reservation.userId !== userId) return { success: false, error: 'Unauthorized' }

  try {
    await db.$transaction(async (tx) => {
      // Release all held seats back to AVAILABLE
      await tx.eventSeat.updateMany({
        where: {
          reservationId,
          status: EventSeatStatus.HELD,
        },
        data: {
          status: EventSeatStatus.AVAILABLE,
          reservationId: null,
          lockedUntil: null,
        },
      })

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      })
    })

    // Release Redis locks
    const seatIds = reservation.eventSeats.map((es) => es.seatId)
    await releaseAllSeatLocks(reservation.eventId, seatIds, userId)

    return { success: true }
  } catch (err) {
    console.error('[releaseReservation] error:', err)
    return { success: false, error: 'Failed to release reservation' }
  }
}
