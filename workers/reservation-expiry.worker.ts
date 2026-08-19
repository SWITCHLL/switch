/**
 * Reservation Expiry Worker
 *
 * Processes jobs from the "reservation-expiry" BullMQ queue.
 * Fires ~10 minutes after a reservation is created.
 *
 * If the reservation is still ACTIVE at that point, it means the user
 * abandoned checkout without paying. We:
 *   1. Release all HELD EventSeats back to AVAILABLE
 *   2. Cancel the reservation
 *
 * If it's already COMPLETED or CANCELLED we do nothing (idempotent).
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

      const { db } = await import('@/lib/db')
      const { ReservationStatus, EventSeatStatus } = await import('@/app/generated/prisma/client')

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          status: true,
          eventId: true,
          eventSeats: { select: { id: true, status: true } },
        },
      })

      if (!reservation) {
        console.warn(`[ReservationExpiry] Reservation not found: ${reservationId}`)
        return
      }

      // Already resolved — nothing to do
      if (reservation.status !== ReservationStatus.ACTIVE) {
        console.log(
          `[ReservationExpiry] Reservation ${reservationId} already in state: ${reservation.status}`
        )
        return
      }

      const heldSeats = reservation.eventSeats.filter(
        (s) => s.status === EventSeatStatus.HELD
      )

      await db.$transaction(async (tx) => {
        // Release held seats back to AVAILABLE
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
        }

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.CANCELLED },
        })
      })

      console.log(
        `[ReservationExpiry] Reservation ${reservationId} cancelled; ${heldSeats.length} seat(s) released`
      )
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
