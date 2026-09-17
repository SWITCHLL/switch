/**
 * BullMQ Workers entry point.
 *
 * Each worker handles a specific job queue.
 * Workers run as a separate long-lived Node.js process,
 * not as part of the Next.js request lifecycle.
 *
 * Start with: npx tsx workers/index.ts
 */
import { createGroupExpiryWorker } from './group-expiry.worker'
import { createReservationExpiryWorker } from './reservation-expiry.worker'
import { createWaitlistExpiryWorker } from './waitlist-expiry.worker'
import { createEventReminderWorker } from './event-reminder.worker'

const redisUrl = process.env.WORKER_REDIS_URL ?? process.env.REDIS_URL
if (!redisUrl) {
  throw new Error('WORKER_REDIS_URL (or REDIS_URL) is required to start workers')
}

const groupExpiryWorker = createGroupExpiryWorker(redisUrl)
const reservationExpiryWorker = createReservationExpiryWorker(redisUrl)
const waitlistExpiryWorker = createWaitlistExpiryWorker(redisUrl)
const eventReminderWorker = createEventReminderWorker(redisUrl)

console.log('[Workers] Group expiry worker started.')
console.log('[Workers] Reservation expiry worker started.')
console.log('[Workers] Waitlist expiry worker started.')
console.log('[Workers] Event reminder worker started.')

// Graceful shutdown
async function shutdown() {
  console.log('[Workers] Shutting down…')
  await Promise.all([
    groupExpiryWorker.close(),
    reservationExpiryWorker.close(),
    waitlistExpiryWorker.close(),
    eventReminderWorker.close(),
  ])
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
