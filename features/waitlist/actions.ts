'use server'

import 'server-only'
import { db } from '@/lib/db'
import { redis, waitlistHoldKey } from '@/lib/redis'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { scheduleWaitlistExpiry } from '@/lib/queues'
import { sendWaitlistJoined, sendWaitlistOffered } from '@/lib/email'
import { joinWaitlistSchema, leaveWaitlistSchema } from './schemas'
import {
  AuditAction,
  AuditEntityType,
  WaitlistStatus,
  ReservationStatus,
} from '@/app/generated/prisma/client'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Waitlist offer window in milliseconds — 30 minutes */
const WAITLIST_WINDOW_MS = 30 * 60 * 1000

/** Waitlist offer window in seconds — for Redis TTL */
const WAITLIST_WINDOW_SECONDS = 30 * 60

// ─── Join Waitlist ────────────────────────────────────────────────────────────

export async function joinWaitlist(
  input: unknown
): Promise<
  { success: true; waitlistEntryId: string; position: number } | { success: false; error: string }
> {
  // 1. Authenticate
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // 2. Validate input
  const parsed = joinWaitlistSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { eventId, ticketTypeId, quantity } = parsed.data
  const { userId } = session

  // 3. Verify TicketType exists and is sold out
  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: { id: true, eventId: true, quantity: true, sold: true, status: true },
  })

  if (!ticketType || ticketType.eventId !== eventId) {
    return { success: false, error: 'Ticket type not found' }
  }

  // Must be sold out (or have no available inventory) to join waitlist
  const available =
    ticketType.quantity !== null ? ticketType.quantity - ticketType.sold : Infinity
  if (available > 0) {
    return { success: false, error: 'Tickets are still available — no waitlist needed' }
  }

  // 4. Reject duplicate entries for same userId+ticketTypeId
  const existing = await db.waitlistEntry.findUnique({
    where: { userId_ticketTypeId: { userId, ticketTypeId } },
  })
  if (existing && (existing.status === WaitlistStatus.PENDING || existing.status === WaitlistStatus.OFFERED)) {
    return { success: false, error: 'You are already on the waitlist for this ticket type' }
  }

  // 5. DB transaction: compute MAX(position), insert at position+1, write AuditLog
  try {
    const result = await db.$transaction(async (tx) => {
      // Get the current maximum position for this ticketTypeId
      const aggregate = await tx.waitlistEntry.aggregate({
        where: { ticketTypeId },
        _max: { position: true },
      })
      const nextPosition = (aggregate._max.position ?? 0) + 1

      // Insert the new waitlist entry
      const entry = await tx.waitlistEntry.create({
        data: {
          eventId,
          userId,
          ticketTypeId,
          requestedQty: quantity,
          position: nextPosition,
          status: WaitlistStatus.PENDING,
        },
      })

      // Write audit log
      await writeAuditLog(tx, {
        entityType: AuditEntityType.WAITLIST_ENTRY,
        entityId: entry.id,
        action: AuditAction.CREATED,
        newStatus: WaitlistStatus.PENDING,
        actor: userId,
        metadata: { eventId, ticketTypeId, quantity, position: nextPosition },
      })

      return entry
    })

    // 6. Send waitlist-joined email non-blocking
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { title: true, slug: true },
    })
    if (user && event) {
      sendWaitlistJoined({
        toEmail: user.email,
        toName: user.name,
        eventTitle: event.title,
        eventSlug: event.slug,
        position: result.position,
        requestedQty: quantity,
      }).catch(console.error)
    }

    return {
      success: true,
      waitlistEntryId: result.id,
      position: result.position,
    }
  } catch (err) {
    console.error('[joinWaitlist] transaction error:', err)
    return { success: false, error: 'Failed to join waitlist. Please try again.' }
  }
}

// ─── Leave Waitlist ───────────────────────────────────────────────────────────

export async function leaveWaitlist(
  input: unknown
): Promise<{ success: true } | { success: false; error: string }> {
  // 1. Authenticate
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // 2. Validate input
  const parsed = leaveWaitlistSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { waitlistEntryId } = parsed.data
  const { userId } = session

  // 3. Load entry and verify ownership
  const entry = await db.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  })

  if (!entry) return { success: false, error: 'Waitlist entry not found' }
  if (entry.userId !== userId) return { success: false, error: 'Unauthorized' }

  // 4. Verify status allows leaving
  if (entry.status !== WaitlistStatus.PENDING && entry.status !== WaitlistStatus.OFFERED) {
    return {
      success: false,
      error: `Cannot leave waitlist — current status is ${entry.status}`,
    }
  }

  const wasOffered = entry.status === WaitlistStatus.OFFERED

  // 5. DB transaction: set status CANCELLED, write AuditLog
  try {
    await db.$transaction(async (tx) => {
      await tx.waitlistEntry.update({
        where: { id: waitlistEntryId },
        data: {
          status: WaitlistStatus.CANCELLED,
        },
      })

      await writeAuditLog(tx, {
        entityType: AuditEntityType.WAITLIST_ENTRY,
        entityId: waitlistEntryId,
        action: AuditAction.CANCELLED,
        oldStatus: entry.status,
        newStatus: WaitlistStatus.CANCELLED,
        actor: userId,
      })
    })

    // 6. If was OFFERED: delete Redis hold and advance waitlist
    if (wasOffered) {
      await redis.del(waitlistHoldKey(waitlistEntryId))
      // Advance the waitlist for the next PENDING entry (non-blocking)
      advanceWaitlist({
        ticketTypeId: entry.ticketTypeId,
        releasedQty: entry.requestedQty,
      }).catch(console.error)
    }

    return { success: true }
  } catch (err) {
    console.error('[leaveWaitlist] transaction error:', err)
    return { success: false, error: 'Failed to leave waitlist. Please try again.' }
  }
}

// ─── Advance Waitlist (internal) ──────────────────────────────────────────────

/**
 * Advance the waitlist queue for a given ticketTypeId.
 * Finds the next PENDING entry and creates a Reservation offer with a 30-minute window.
 *
 * This is exported so it can also be called by the reservation-expiry worker (Task 9).
 */
export async function advanceWaitlist(input: {
  ticketTypeId: string
  releasedQty: number
}): Promise<void> {
  const { ticketTypeId, releasedQty } = input

  // Find the next PENDING entry (lowest position)
  const nextEntry = await db.waitlistEntry.findFirst({
    where: {
      ticketTypeId,
      status: WaitlistStatus.PENDING,
    },
    orderBy: { position: 'asc' },
    include: {
      event: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  })

  if (!nextEntry) {
    // No pending entries — nothing to advance
    return
  }

  const now = new Date()
  const offerExpiresAt = new Date(now.getTime() + WAITLIST_WINDOW_MS)

  try {
    const result = await db.$transaction(async (tx) => {
      // Create a Reservation for the offered quantity
      const reservation = await tx.reservation.create({
        data: {
          eventId: nextEntry.eventId,
          userId: nextEntry.userId,
          status: ReservationStatus.ACTIVE,
          expiresAt: offerExpiresAt,
          waitlistEntryId: nextEntry.id,
          // Store the waitlist hold as a gaHolds entry
          gaHolds: { [ticketTypeId]: releasedQty },
        },
      })

      // Update WaitlistEntry to OFFERED
      await tx.waitlistEntry.update({
        where: { id: nextEntry.id },
        data: {
          status: WaitlistStatus.OFFERED,
          offerExpiresAt,
        },
      })

      // Write audit log
      await writeAuditLog(tx, {
        entityType: AuditEntityType.WAITLIST_ENTRY,
        entityId: nextEntry.id,
        action: AuditAction.OFFERED,
        oldStatus: WaitlistStatus.PENDING,
        newStatus: WaitlistStatus.OFFERED,
        actor: 'system',
        metadata: {
          ticketTypeId,
          releasedQty,
          reservationId: reservation.id,
          offerExpiresAt: offerExpiresAt.toISOString(),
        },
      })

      return { reservation }
    })

    // Store waitlist hold in Redis with TTL
    await redis.set(
      waitlistHoldKey(nextEntry.id),
      String(releasedQty),
      'EX',
      WAITLIST_WINDOW_SECONDS
    )

    // Schedule waitlist-expiry BullMQ job
    scheduleWaitlistExpiry(nextEntry.id, offerExpiresAt).catch(console.error)

    // Send waitlist-offered email non-blocking
    sendWaitlistOffered({
      toEmail: nextEntry.user.email,
      toName: nextEntry.user.name,
      eventTitle: nextEntry.event.title,
      eventSlug: nextEntry.event.slug,
      requestedQty: releasedQty,
      offerExpiresAt,
      reservationId: result.reservation.id,
    }).catch(console.error)
  } catch (err) {
    console.error('[advanceWaitlist] error:', err)
    // Don't rethrow — this is a background operation; failures are logged
  }
}
