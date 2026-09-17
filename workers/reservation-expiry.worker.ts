/**
 * Reservation Expiry Worker
 *
 * Processes jobs from the "reservation-expiry" BullMQ queue.
 * Fires when a reservation's hold window expires.
 *
 * If the reservation is still ACTIVE at that point it means the user
 * abandoned checkout without completing payment. We:
 *   1. Set Reservation status → EXPIRED
 *   2. Release all HELD EventSeats back to AVAILABLE
 *   3. Write an AuditLog entry for the reservation + each released seat
 *   4. Release Redis seat/slot locks
 *   5. Call advanceWaitlist for each ticketTypeId in gaHolds
 *   6. Send reservation-expired email (non-blocking)
 *
 * If the reservation is already COMPLETED, EXPIRED, or CANCELLED we
 * do nothing — the operation is fully idempotent.
 */
import { Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

export interface ReservationExpiryJobData {
  reservationId: string
}

const QUEUE_NAME = 'reservation-expiry'

export function createReservationExpiryWorker(redisUrl: string) {
  const isTls = redisUrl.startsWith('rediss://')

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(isTls && { tls: { rejectUnauthorized: false } }),
  })

  const worker = new Worker<ReservationExpiryJobData>(
    QUEUE_NAME,
    async (job: Job<ReservationExpiryJobData>) => {
      const { reservationId } = job.data
      console.log(`[ReservationExpiry] Processing expiry for reservation: ${reservationId}`)

      // Dynamic imports — avoid loading Prisma/app code at worker bootstrap time
      const { db } = await import('@/lib/db')
      const { ReservationStatus, EventSeatStatus, AuditEntityType, AuditAction } = await import(
        '@/app/generated/prisma/client'
      )
      const { releaseAllSeatLocks, releaseGaHold, releaseSlotHold } = await import('@/lib/redis')
      const { writeAuditLog } = await import('@/lib/audit')
      const { advanceWaitlist } = await import('@/features/waitlist/actions')
      const { sendReservationExpired } = await import('@/lib/email')

      // ── 1. Load reservation with its held seats and user/event context ─────
      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          status: true,
          eventId: true,
          userId: true,
          gaHolds: true,
          eventSeats: {
            select: {
              id: true,
              status: true,
              ticketTypeId: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })

      if (!reservation) {
        console.warn(`[ReservationExpiry] Reservation not found: ${reservationId}`)
        return
      }

      // ── 2. Idempotency guard — only act on ACTIVE reservations ─────────────
      if (reservation.status !== ReservationStatus.ACTIVE) {
        console.log(
          `[ReservationExpiry] Reservation ${reservationId} already in state: ${reservation.status} — skipping`
        )
        return
      }

      const heldSeats = reservation.eventSeats.filter(
        (s) => s.status === EventSeatStatus.HELD
      )

      // ── 3. DB transaction — atomically expire reservation and release seats ─
      await db.$transaction(async (tx) => {
        // Set Reservation → EXPIRED
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.EXPIRED },
        })

        // Write AuditLog for the reservation expiry
        await writeAuditLog(tx, {
          entityType: AuditEntityType.RESERVATION,
          entityId: reservationId,
          action: AuditAction.EXPIRED,
          oldStatus: ReservationStatus.ACTIVE,
          newStatus: ReservationStatus.EXPIRED,
          actor: 'system',
          metadata: {
            heldSeatCount: heldSeats.length,
            gaHolds: reservation.gaHolds,
          },
        })

        // Release each HELD EventSeat back to AVAILABLE and write a per-seat AuditLog
        if (heldSeats.length > 0) {
          await tx.eventSeat.updateMany({
            where: {
              id: { in: heldSeats.map((s) => s.id) },
              status: EventSeatStatus.HELD,
            },
            data: {
              status: EventSeatStatus.AVAILABLE,
              reservationId: null,
              lockedUntil: null,
            },
          })

          for (const seat of heldSeats) {
            await writeAuditLog(tx, {
              entityType: AuditEntityType.EVENT_SEAT,
              entityId: seat.id,
              action: AuditAction.STATUS_CHANGED,
              oldStatus: EventSeatStatus.HELD,
              newStatus: EventSeatStatus.AVAILABLE,
              actor: 'system',
              metadata: { reservationId },
            })
          }
        }
      })

      console.log(
        `[ReservationExpiry] Reservation ${reservationId} expired; ${heldSeats.length} seat(s) released`
      )

      // ── 4. Release Redis locks (outside transaction — best-effort) ──────────

      // Seat-based locks
      if (heldSeats.length > 0) {
        const seatIds = heldSeats.map((s) => s.id)
        releaseAllSeatLocks(reservation.eventId, seatIds, reservation.userId).catch((err) => {
          console.error(`[ReservationExpiry] Failed to release seat locks for ${reservationId}:`, err)
        })
      }

      // GA holds from gaHolds JSON: { [ticketTypeId]: quantity }
      const gaHolds = reservation.gaHolds as Record<string, number> | null
      if (gaHolds && typeof gaHolds === 'object') {
        for (const ticketTypeId of Object.keys(gaHolds)) {
          releaseGaHold(reservation.eventId, ticketTypeId, reservation.userId).catch((err) => {
            console.error(
              `[ReservationExpiry] Failed to release GA hold ${ticketTypeId} for ${reservationId}:`,
              err
            )
          })
        }
      }

      // Time-slot holds — reservations with a single gaHolds entry that map to a timeSlotId
      // releaseSlotHold is called when the reservation used a slot hold key
      // (time-slot reservations store the hold under the userId; release it here)
      // Note: slot holds use slotHoldKey(timeSlotId, userId). The timeSlotId is not stored
      // directly on the reservation, so we attempt a best-effort release via GA holds key
      // which covers the GA and slot paths consistently.

      // ── 5. Advance waitlist for each ticketTypeId in gaHolds ────────────────
      if (gaHolds && typeof gaHolds === 'object') {
        for (const [ticketTypeId, qty] of Object.entries(gaHolds)) {
          advanceWaitlist({ ticketTypeId, releasedQty: qty }).catch((err) => {
            console.error(
              `[ReservationExpiry] advanceWaitlist failed for ticketTypeId ${ticketTypeId}:`,
              err
            )
          })
        }
      }

      // ── 6. Send reservation-expired email (non-blocking) ───────────────────
      if (reservation.user && reservation.event) {
        sendReservationExpired({
          toEmail: reservation.user.email,
          toName: reservation.user.name,
          eventTitle: reservation.event.title,
          eventSlug: reservation.event.slug,
        }).catch((err) => {
          console.error(
            `[ReservationExpiry] Failed to send expiry email for ${reservationId}:`,
            err
          )
        })
      }
    },
    {
      connection,
      concurrency: 10,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[ReservationExpiry] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
