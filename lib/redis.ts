/**
 * ioredis singleton.
 *
 * Redis is used for:
 *  - Seat locking during checkout (TTL-based distributed locks)
 *  - Reservation expiry tracking
 *  - BullMQ job queue (group booking expiry)
 *
 * Supports Upstash TCP connections (rediss:// with TLS).
 * The rediss:// scheme enables TLS automatically in ioredis.
 */
import 'server-only'
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis?: Redis }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL is not set. Redis is required for seat locking.')
  }

  // Upstash uses TLS (rediss://) — allow their shared certificate
  const isTls = url.startsWith('rediss://')

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
    // Required for Upstash: their TLS cert is on a shared *.upstash.io domain
    ...(isTls && { tls: { rejectUnauthorized: false } }),
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

// ─── Group booking slot lock helpers ─────────────────────────────────────────

/** TTL for group slot claims in seconds — 15 minutes to complete payment */
export const GROUP_SLOT_LOCK_TTL = 900

/** Redis key for a group slot claim lock */
export function groupSlotLockKey(slotId: string): string {
  return `group-slot-lock:${slotId}`
}

/**
 * Acquire a claim lock on a group slot for a given user.
 * Returns true if acquired, false if already claimed by another user.
 */
export async function acquireGroupSlotLock(slotId: string, userId: string): Promise<boolean> {
  const key = groupSlotLockKey(slotId)
  const result = await redis.set(key, userId, 'EX', GROUP_SLOT_LOCK_TTL, 'NX')
  return result === 'OK'
}

/**
 * Release a group slot claim lock — only if owned by this user.
 */
export async function releaseGroupSlotLock(slotId: string, userId: string): Promise<void> {
  const key = groupSlotLockKey(slotId)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, 1, key, userId)
}

/** Redis key for storing the BullMQ job id that expires a group order */
export function groupExpiryJobKey(groupOrderId: string): string {
  return `group-expiry-job:${groupOrderId}`
}
