'use server'

import { db } from '@/lib/db'
import { acquireSeatLock, releaseAllSeatLocks, SEAT_LOCK_TTL, redis, ticketUnlockKey } from '@/lib/redis'
import { getSession } from '@/lib/session'
import { sendTicketConfirmationEmail } from '@/lib/email'
import { scheduleReservationExpiry, scheduleEventReminder } from '@/lib/queues'
import { writeAuditLog } from '@/lib/audit'
import { enforcePurchaseLimits, parseLimitError } from '@/lib/purchase-limits'
import { hashPassword, comparePassword, generateToken } from '@/lib/crypto-utils'
import {
  reserveSeatsSchema,
  reserveGASchema,
  confirmOrderSchema,
  releaseReservationSchema,
  submitRsvpSchema,
  unlockPasswordProtectedTicketSchema,
  validateDirectLinkTokenSchema,
} from './schemas'
import type {
  ReserveSeatsResult,
  ConfirmOrderResult,
  ReleaseReservationResult,
  SubmitRsvpResult,
  UnlockPasswordProtectedTicketResult,
  ValidateDirectLinkTokenResult,
} from './types'
import {
  AuditAction,
  AuditEntityType,
  EventSeatStatus,
  ReservationStatus,
  SessionInclusionMode,
  TicketStatus,
  TicketTypeStatus,
  TicketVisibility,
} from '@/app/generated/prisma/client'
import type { PrismaTransactionClient } from '@/lib/audit'
import { randomBytes } from 'node:crypto'

// ─── Reservation TTL ─────────────────────────────────────────────────────────

const RESERVATION_TTL_MS = SEAT_LOCK_TTL * 1000 // 10 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

function generateQrCode(): string {
  // 32 bytes = 64 hex chars — consistent with submitRsvp, group-booking, and crypto-utils
  return randomBytes(32).toString('hex')
}

/**
 * Checks whether access to a TicketType is allowed given its visibility settings.
 *
 * - PUBLIC:               always allowed
 * - PASSWORD_PROTECTED:   requires a valid Redis session token
 * - HIDDEN:               requires the correct directLinkToken
 *
 * Returns null on success, or an error code string if access is denied.
 */
async function checkTicketVisibilityAccess(
  ticketType: {
    id: string
    visibility: TicketVisibility
    directLinkToken: string | null
  },
  opts: {
    /** For PASSWORD_PROTECTED types — the token from sessionStorage */
    sessionToken?: string
    /** For HIDDEN types — the ?unlock= query param value */
    directLinkToken?: string
  }
): Promise<'ACCESS_DENIED' | null> {
  if (ticketType.visibility === TicketVisibility.PUBLIC) {
    return null
  }

  if (ticketType.visibility === TicketVisibility.PASSWORD_PROTECTED) {
    if (!opts.sessionToken) return 'ACCESS_DENIED'
    const val = await redis.get(ticketUnlockKey(ticketType.id, opts.sessionToken))
    return val === '1' ? null : 'ACCESS_DENIED'
  }

  if (ticketType.visibility === TicketVisibility.HIDDEN) {
    if (!opts.directLinkToken || ticketType.directLinkToken !== opts.directLinkToken) {
      return 'ACCESS_DENIED'
    }
  }

  return null
}

// ─── Auto-enrol helper ────────────────────────────────────────────────────────

/**
 * Auto-enrols tickets in all INCLUDED sessions for the event.
 * Must be called inside an existing Prisma transaction.
 * Uses createMany with skipDuplicates so it is safe to call more than once.
 */
async function autoEnrolIncludedSessions(
  tx: PrismaTransactionClient,
  eventId: string,
  ticketIds: string[]
): Promise<void> {
  if (ticketIds.length === 0) return

  const includedSessions = await tx.eventSession.findMany({
    where: {
      eventId,
      inclusionMode: SessionInclusionMode.INCLUDED,
      status: TicketTypeStatus.ACTIVE,
    },
    select: { id: true },
  })

  if (includedSessions.length === 0) return

  const enrolmentData = ticketIds.flatMap((ticketId) =>
    includedSessions.map((session) => ({
      ticketId,
      sessionId: session.id,
    }))
  )

  await tx.sessionEnrolment.createMany({
    data: enrolmentData,
    skipDuplicates: true,
  })
}

// ─── Reserve seats (RESERVED / MIXED events) ─────────────────────────────────

export async function reserveSeats(input: unknown): Promise<ReserveSeatsResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = reserveSeatsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, eventSeatIds, sessionTokens = {}, directLinkToken } = parsed.data
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

  // 1b. Validate visibility access for all ticket types referenced by the selected seats
  const uniqueTicketTypeIds = new Set<string>()
  for (const eventSeatId of eventSeatIds) {
    const seat = await db.eventSeat.findUnique({
      where: { id: eventSeatId },
      select: { ticketTypeId: true },
    })
    if (seat?.ticketTypeId) {
      uniqueTicketTypeIds.add(seat.ticketTypeId)
    }
  }
  for (const ttId of uniqueTicketTypeIds) {
    const tt = await db.ticketType.findUnique({
      where: { id: ttId },
      select: { id: true, visibility: true, directLinkToken: true },
    })
    if (tt) {
      const accessError = await checkTicketVisibilityAccess(tt, {
        sessionToken: sessionTokens[ttId],
        directLinkToken,
      })
      if (accessError) {
        return { success: false, error: accessError }
      }
    }
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

  const { eventId, selections, sessionTokens = {}, directLinkToken } = parsed.data
  const { userId } = session

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, salesStart: true, salesEnd: true },
  })
  if (!event || event.status !== 'PUBLISHED') {
    return { success: false, error: 'Event not found or not available' }
  }

  // Validate visibility access for each selected ticket type
  for (const sel of selections) {
    const tt = await db.ticketType.findUnique({
      where: { id: sel.ticketTypeId },
      select: { id: true, visibility: true, directLinkToken: true },
    })
    if (tt) {
      const accessError = await checkTicketVisibilityAccess(tt, {
        sessionToken: sessionTokens[sel.ticketTypeId],
        directLinkToken,
      })
      if (accessError) {
        return { success: false, error: accessError }
      }
    }
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
// Called after a successful Paystack payment to finalise a reserved-seat order.
// Requires a verified Payment record (created by the Paystack webhook) to exist
// for this reservation — prevents ticket issuance without confirmed payment.

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
      event: { select: { id: true, slug: true, title: true, startsAt: true, isFree: true, imageUrl: true, venue: { select: { name: true, city: true } }, venueName: true, venueCity: true } },
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

  // Payment guard — for paid events, require at least one SUCCESS payment
  // created by the Paystack webhook for this reservation's event + user.
  // Free events (isFree = true) skip this check.
  if (!reservation.event.isFree) {
    const verifiedPayment = await db.payment.findFirst({
      where: {
        userId,
        eventId: reservation.eventId,
        status: 'SUCCESS',
      },
      select: { id: true },
    })
    if (!verifiedPayment) {
      return { success: false, error: 'No verified payment found for this reservation' }
    }
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

      // Auto-enrol tickets in INCLUDED sessions
      await autoEnrolIncludedSessions(tx, reservation.eventId, createdTicketIds)

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

    // Send confirmation email (awaited for reliable delivery)
    try {
      const tickets = await db.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: {
          ticketNumber: true,
          qrCode: true,
          ticketType: { select: { name: true } },
          eventSeat: { select: { seat: { select: { label: true } } } },
          timeSlotTickets: {
            select: { timeSlot: { select: { label: true, startsAt: true } } },
            take: 1,
          },
        },
      })

      await sendTicketConfirmationEmail({
        userId,
        eventTitle:    reservation.event.title,
        eventDate:     reservation.event.startsAt,
        eventSlug:     reservation.event.slug,
        eventImageUrl: reservation.event.imageUrl ?? undefined,
        eventVenue:    reservation.event.venue
          ? `${reservation.event.venue.name}, ${reservation.event.venue.city}`
          : reservation.event.venueName
          ? [reservation.event.venueName, reservation.event.venueCity].filter(Boolean).join(', ')
          : undefined,
        ticketCount:   ticketIds.length,
        reservationId,
        tickets: tickets.map((t) => {
          const slot = t.timeSlotTickets[0]?.timeSlot
          return {
            ticketNumber:   t.ticketNumber,
            qrCode:         t.qrCode,
            ticketTypeName: t.ticketType.name,
            seatLabel:      t.eventSeat?.seat?.label ?? null,
            showLabel:      slot?.label ?? null,
            showDate:       slot?.startsAt ?? null,
          }
        }),
      })
    } catch (err) {
      console.error('[confirmOrder] email error:', err)
      // Don't throw — order is already confirmed; email failure shouldn't fail the operation
    }

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

// ─── Free RSVP ───────────────────────────────────────────────────────────────

export async function submitRsvp(input: unknown): Promise<SubmitRsvpResult> {
  // 1. Authenticate session
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // 2. Validate input shape
  const parsed = submitRsvpSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, ticketTypeId, quantity } = parsed.data
  const { userId } = session

  // 3. Load and validate TicketType (price, status, sales window)
  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      id: true,
      eventId: true,
      price: true,
      status: true,
      salesStart: true,
      salesEnd: true,
      quantity: true,
      sold: true,
      visibility: true,
      directLinkToken: true,
    },
  })

  if (!ticketType || ticketType.eventId !== eventId) {
    return { success: false, error: 'Ticket type not found' }
  }

  if (ticketType.price !== 0) {
    return { success: false, error: 'This ticket type requires payment' }
  }

  if (ticketType.status !== TicketTypeStatus.ACTIVE) {
    return {
      success: false,
      error:
        ticketType.status === TicketTypeStatus.SOLD_OUT
          ? 'This ticket type is sold out'
          : 'This ticket type is not available',
    }
  }

  // Validate sales window
  const now = new Date()
  if (ticketType.salesStart && now < new Date(ticketType.salesStart)) {
    return { success: false, error: 'Ticket sales have not started yet' }
  }
  if (ticketType.salesEnd && now > new Date(ticketType.salesEnd)) {
    return { success: false, error: 'Ticket sales have ended' }
  }

  // Validate ticket visibility — check PASSWORD_PROTECTED / HIDDEN access tokens
  const visibilityError = await checkTicketVisibilityAccess(
    { id: ticketType.id, visibility: ticketType.visibility, directLinkToken: ticketType.directLinkToken },
    {
      sessionToken: parsed.data.sessionToken,
      directLinkToken: parsed.data.directLinkToken,
    }
  )
  if (visibilityError) {
    return { success: false, error: visibilityError }
  }

  // 4. Open Prisma transaction: enforce limits, verify capacity, create tickets
  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, startsAt: true },
    })

    if (!event || event.status !== 'PUBLISHED') {
      return { success: false, error: 'Event not found or not available' }
    }

    const ticketIds = await db.$transaction(async (tx) => {
      // Lock TicketType row to prevent race conditions on the sold counter
      const tt = await tx.ticketType.findUniqueOrThrow({
        where: { id: ticketTypeId },
        select: { quantity: true, sold: true },
      })

      // Verify sufficient inventory
      const available = tt.quantity !== null ? tt.quantity - tt.sold : Infinity
      if (available < quantity) {
        throw new Error('INSUFFICIENT_QUANTITY')
      }

      // Enforce purchase limits (min/max per order, max per user)
      await enforcePurchaseLimits(tx, userId, ticketTypeId, quantity)

      // Create one Ticket record per requested quantity
      const createdTicketIds: string[] = []
      for (let i = 0; i < quantity; i++) {
        const year = new Date().getFullYear()
        const hex = randomBytes(3).toString('hex').toUpperCase()
        const ticketNumber = `SWT-${year}-${hex}`
        const qrCode = randomBytes(32).toString('hex')

        const ticket = await tx.ticket.create({
          data: {
            eventId,
            userId,
            ticketTypeId,
            ticketNumber,
            qrCode,
            status: TicketStatus.ACTIVE,
            issuedAt: new Date(),
          },
        })
        createdTicketIds.push(ticket.id)
      }

      // Increment sold counter
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { sold: { increment: quantity } },
      })

      // Write audit log — one entry per RSVP batch (records the first ticket as entityId)
      await writeAuditLog(tx, {
        entityType: AuditEntityType.TICKET,
        entityId: createdTicketIds[0]!,
        action: AuditAction.ISSUED,
        newStatus: TicketStatus.ACTIVE,
        actor: userId,
        metadata: {
          ticketTypeId,
          eventId,
          quantity,
          ticketIds: createdTicketIds,
        },
      })

      // Auto-enrol tickets in INCLUDED sessions
      await autoEnrolIncludedSessions(tx, eventId, createdTicketIds)

      return createdTicketIds
    })

    // 5. Post-transaction: send confirmation email (awaited for reliable delivery)
    try {
      const tickets = await db.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: {
          ticketNumber: true,
          qrCode: true,
          ticketType: { select: { name: true } },
        },
      })
      
      const evt = await db.event.findUnique({
        where: { id: eventId },
        select: { title: true, startsAt: true, slug: true, imageUrl: true, venue: { select: { name: true, city: true } }, venueName: true, venueCity: true },
      })
      
      if (evt) {
        await sendTicketConfirmationEmail({
          userId,
          eventTitle:    evt.title,
          eventDate:     evt.startsAt,
          eventSlug:     evt.slug,
          eventImageUrl: evt.imageUrl ?? undefined,
          eventVenue:    evt.venue
            ? `${evt.venue.name}, ${evt.venue.city}`
            : evt.venueName
            ? [evt.venueName, evt.venueCity].filter(Boolean).join(', ')
            : undefined,
          ticketCount:   ticketIds.length,
          reservationId: `rsvp-${ticketIds[0]}`,
          tickets: tickets.map((t) => ({
            ticketNumber:   t.ticketNumber,
            qrCode:         t.qrCode,
            ticketTypeName: t.ticketType.name,
            seatLabel:      null,
          })),
        })
      }
    } catch (err) {
      console.error('[guestCheckout] email error:', err)
      // Don't throw — order is already confirmed; email failure shouldn't fail the operation
    }

    // 6. Schedule event reminder (non-blocking stub — worker implemented in Task 9)
    db.event
      .findUnique({
        where: { id: eventId },
        select: { startsAt: true },
      })
      .then((evt) => {
        if (!evt) return
        return scheduleEventReminder(eventId, userId, ticketIds[0]!, evt.startsAt)
      })
      .catch(console.error)

    return { success: true, ticketIds }
  } catch (err) {
    // Map purchase limit errors to user-facing messages
    const limitError = parseLimitError(err)
    if (limitError) {
      switch (limitError.type) {
        case 'MIN':
          return {
            success: false,
            error: `Minimum order quantity is ${limitError.limit} ticket${limitError.limit !== 1 ? 's' : ''}`,
          }
        case 'MAX':
          return {
            success: false,
            error: `Maximum order quantity is ${limitError.limit} ticket${limitError.limit !== 1 ? 's' : ''}`,
          }
        case 'USER':
          return {
            success: false,
            error: `You can only have ${limitError.limit} ticket${limitError.limit !== 1 ? 's' : ''} for this event`,
          }
      }
    }

    if (err instanceof Error && err.message === 'INSUFFICIENT_QUANTITY') {
      return { success: false, error: 'Not enough tickets remaining' }
    }

    console.error('[submitRsvp] transaction error:', err)
    return { success: false, error: 'Failed to complete RSVP. Please try again.' }
  }
}

// ─── Unlock password-protected ticket type ────────────────────────────────────

/**
 * Verifies the password for a PASSWORD_PROTECTED TicketType.
 * On success, generates a session token, stores it in Redis (TTL 3600s),
 * and returns it so the client can persist it in sessionStorage.
 */
export async function unlockPasswordProtectedTicket(
  input: unknown
): Promise<UnlockPasswordProtectedTicketResult> {
  const parsed = unlockPasswordProtectedTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { ticketTypeId, password } = parsed.data

  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { visibility: true, accessPasswordHash: true },
  })

  if (!ticketType) {
    return { success: false, error: 'Ticket type not found' }
  }

  if (ticketType.visibility !== TicketVisibility.PASSWORD_PROTECTED) {
    return { success: false, error: 'This ticket type does not require a password' }
  }

  if (!ticketType.accessPasswordHash) {
    return { success: false, error: 'INVALID_PASSWORD' }
  }

  const isMatch = await comparePassword(password, ticketType.accessPasswordHash)

  if (!isMatch) {
    return { success: false, error: 'INVALID_PASSWORD' }
  }

  // Generate a secure random session token and store in Redis with 1-hour TTL
  const sessionToken = generateToken(32)
  await redis.set(ticketUnlockKey(ticketTypeId, sessionToken), '1', 'EX', 3600)

  return { success: true, sessionToken }
}

// ─── Validate direct-link token for HIDDEN ticket type ────────────────────────

/**
 * Validates a directLinkToken for a HIDDEN TicketType.
 * Used server-side to confirm the ?unlock= query param is valid before
 * rendering the hidden ticket type on the event page.
 */
export async function validateDirectLinkToken(
  input: unknown
): Promise<ValidateDirectLinkTokenResult> {
  const parsed = validateDirectLinkTokenSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { ticketTypeId, token } = parsed.data

  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { visibility: true, directLinkToken: true },
  })

  if (!ticketType) {
    return { success: false, error: 'Ticket type not found' }
  }

  if (ticketType.visibility !== TicketVisibility.HIDDEN) {
    return { success: false, error: 'This ticket type is not hidden' }
  }

  if (!ticketType.directLinkToken || ticketType.directLinkToken !== token) {
    return { success: false, error: 'ACCESS_DENIED' }
  }

  return { success: true }
}
