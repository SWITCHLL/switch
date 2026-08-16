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

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL is required to start workers')
}

const groupExpiryWorker = createGroupExpiryWorker(redisUrl)

console.log('[Workers] Group expiry worker started.')

// Graceful shutdown
async function shutdown() {
  console.log('[Workers] Shutting down…')
  await groupExpiryWorker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
