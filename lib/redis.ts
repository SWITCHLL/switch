/**
 * ioredis singleton.
 *
 * Redis is used for:
 *  - Seat locking during checkout (TTL-based distributed locks)
 *  - Reservation expiry tracking
 *
 * Falls back gracefully when REDIS_URL is not set (dev without Redis).
 */
import 'server-only'
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis?: Redis }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL is not set. Redis is required for seat locking.')
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    // Don't crash the process on connection errors — let callers handle
    enableOfflineQueue: false,
  })
  client.on('error', (err) => {
    console.error('[Redis] connection error:', err.message)
  })
  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ─── Seat lock helpers ────────────────────────────────────────────────────────

/** TTL for seat locks in seconds — 10 minutes */
export const SEAT_LOCK_TTL = 600

/** Redis key for a seat lock */
export function seatLockKey(eventId: string, seatId: string): string {
  return `seat-lock:${eventId}:${seatId}`
}

/**
 * Acquire a lock on a seat for a given user.
 * Returns true if acquired, false if already locked by another user.
 * Uses SET NX EX for atomicity.
 */
export async function acquireSeatLock(
  eventId: string,
  seatId: string,
  userId: string,
  ttl = SEAT_LOCK_TTL
): Promise<boolean> {
  const key = seatLockKey(eventId, seatId)
  const result = await redis.set(key, userId, 'EX', ttl, 'NX')
  return result === 'OK'
}

/**
 * Release a seat lock — only if owned by this user.
 * Uses a Lua script for atomic check-and-delete.
 */
export async function releaseSeatLock(
  eventId: string,
  seatId: string,
  userId: string
): Promise<void> {
  const key = seatLockKey(eventId, seatId)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, 1, key, userId)
}

/**
 * Release all seat locks for a list of seats.
 */
export async function releaseAllSeatLocks(
  eventId: string,
  seatIds: string[],
  userId: string
): Promise<void> {
  await Promise.all(seatIds.map((seatId) => releaseSeatLock(eventId, seatId, userId)))
}
