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

const redisUrl = process.env.WORKER_REDIS_URL ?? process.env.REDIS_URL
if (!redisUrl) {
  throw new Error('WORKER_REDIS_URL (or REDIS_URL) is required to start workers')
}

const groupExpiryWorker = createGroupExpiryWorker(redisUrl)
const reservationExpiryWorker = createReservationExpiryWorker(redisUrl)

console.log('[Workers] Group expiry worker started.')
console.log('[Workers] Reservation expiry worker started.')

// Graceful shutdown
async function shutdown() {
  console.log('[Workers] Shutting down…')
  await Promise.all([groupExpiryWorker.close(), reservationExpiryWorker.close()])
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
