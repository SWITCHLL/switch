/**
 * BullMQ Queue definitions.
 *
 * Import the queue you need from here — do NOT instantiate Queue inline.
 * This module is safe to import in Next.js server components / actions.
 */
import 'server-only'
import { Queue } from 'bullmq'
import { redis } from './redis'
import type { GroupExpiryJobData } from '@/workers/group-expiry.worker'
import type { ReservationExpiryJobData } from '@/workers/reservation-expiry.worker'

// ─── Group Order Expiry Queue ─────────────────────────────────────────────────

const GROUP_EXPIRY_QUEUE = 'group-expiry'

let _groupExpiryQueue: Queue<GroupExpiryJobData> | null = null

export function getGroupExpiryQueue(): Queue<GroupExpiryJobData> {
  if (!_groupExpiryQueue) {
    _groupExpiryQueue = new Queue<GroupExpiryJobData>(GROUP_EXPIRY_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    })
  }
  return _groupExpiryQueue
}

/**
 * Schedule a group order expiry job to fire at the given date.
 * If the order is already expired (date in the past), fires immediately.
 */
export async function scheduleGroupExpiry(groupOrderId: string, expiresAt: Date): Promise<string> {
  const queue = getGroupExpiryQueue()
  const delay = Math.max(0, expiresAt.getTime() - Date.now())
  const job = await queue.add(
    'expire',
    { groupOrderId },
    {
      delay,
      jobId: `group-expiry-${groupOrderId}`, // idempotent — won't duplicate
    }
  )
  return job.id ?? groupOrderId
}

// ─── Reservation Expiry Queue ─────────────────────────────────────────────────

const RESERVATION_EXPIRY_QUEUE = 'reservation-expiry'

let _reservationExpiryQueue: Queue<ReservationExpiryJobData> | null = null

export function getReservationExpiryQueue(): Queue<ReservationExpiryJobData> {
  if (!_reservationExpiryQueue) {
    _reservationExpiryQueue = new Queue<ReservationExpiryJobData>(RESERVATION_EXPIRY_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    })
  }
  return _reservationExpiryQueue
}

/**
 * Schedule a reservation expiry job to fire when the reservation times out.
 * Idempotent — won't create a duplicate job for the same reservationId.
 */
export async function scheduleReservationExpiry(
  reservationId: string,
  expiresAt: Date
): Promise<string> {
  const queue = getReservationExpiryQueue()
  const delay = Math.max(0, expiresAt.getTime() - Date.now())
  const job = await queue.add(
    'expire',
    { reservationId },
    {
      delay,
      jobId: `reservation-expiry-${reservationId}`,
    }
  )
  return job.id ?? reservationId
}
