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

  // Upstash uses TLS (rediss://) — use SNI hostname pinning instead of
  // disabling certificate validation entirely
  const isTls = url.startsWith('rediss://')
  let tlsHostname: string | undefined
  if (isTls) {
    try {
      tlsHostname = new URL(url).hostname
    } catch {
      // malformed URL — fall through without SNI
    }
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: true, // Allow queueing commands during temporary disconnections
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000) // Cap retry delay at 2 seconds
      return delay
    },
    reconnectOnError: (err: Error) => {
      // Reconnect on most errors
      if (err.message.includes('READONLY')) return true
      if (err.message.includes('ECONNREFUSED')) return true
      if (err.message.includes('ETIMEDOUT')) return true
      return false
    },
    ...(isTls && tlsHostname ? { tls: { servername: tlsHostname } } : {}),
  })

  client.on('error', (err) => {
    console.error('[Redis] connection error:', err.message)
  })

  client.on('reconnecting', () => {
    console.warn('[Redis] reconnecting after connection loss')
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

// ─── GA inventory hold helpers ────────────────────────────────────────────────

/**
 * Redis key for a GA (general admission) inventory hold during checkout.
 * Key: ga-hold:{eventId}:{ticketTypeId}:{userId}
 * Value: quantity held as a string
 * TTL: SEAT_LOCK_TTL (600 s)
 */
export function gaHoldKey(eventId: string, ticketTypeId: string, userId: string): string {
  return `ga-hold:${eventId}:${ticketTypeId}:${userId}`
}

/**
 * Acquire a GA inventory hold for a user.
 * Stores qty as the value so workers know how much to release.
 * Returns true if acquired (key did not exist), false if another hold is active.
 * Uses SET NX EX for atomicity.
 */
export async function acquireGaHold(
  eventId: string,
  ticketTypeId: string,
  userId: string,
  qty: number,
  ttl = SEAT_LOCK_TTL
): Promise<boolean> {
  const key = gaHoldKey(eventId, ticketTypeId, userId)
  const result = await redis.set(key, String(qty), 'EX', ttl, 'NX')
  return result === 'OK'
}

/**
 * Release a GA inventory hold — only if the key still exists (owned by this checkout session).
 * Uses a Lua check-and-delete so a racing expiry or double-release is a no-op.
 */
export async function releaseGaHold(
  eventId: string,
  ticketTypeId: string,
  userId: string
): Promise<void> {
  const key = gaHoldKey(eventId, ticketTypeId, userId)
  const script = `
    if redis.call("exists", KEYS[1]) == 1 then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, 1, key)
}

// ─── Time-slot hold helpers ───────────────────────────────────────────────────

/**
 * Redis key for a time-slot capacity hold during checkout.
 * Key: slot-hold:{timeSlotId}:{userId}
 * Value: quantity held as a string
 * TTL: SEAT_LOCK_TTL (600 s)
 */
export function slotHoldKey(timeSlotId: string, userId: string): string {
  return `slot-hold:${timeSlotId}:${userId}`
}

/**
 * Acquire a time-slot capacity hold for a user.
 * Returns true if acquired, false if a hold for this user+slot already exists.
 * Uses SET NX EX for atomicity.
 */
export async function acquireSlotHold(
  timeSlotId: string,
  userId: string,
  qty: number,
  ttl = SEAT_LOCK_TTL
): Promise<boolean> {
  const key = slotHoldKey(timeSlotId, userId)
  const result = await redis.set(key, String(qty), 'EX', ttl, 'NX')
  return result === 'OK'
}

/**
 * Release a time-slot capacity hold.
 * Uses a Lua check-and-delete so a racing expiry is a no-op.
 */
export async function releaseSlotHold(timeSlotId: string, userId: string): Promise<void> {
  const key = slotHoldKey(timeSlotId, userId)
  const script = `
    if redis.call("exists", KEYS[1]) == 1 then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, 1, key)
}

// ─── Waitlist offer hold helpers ──────────────────────────────────────────────

/**
 * Redis key for a waitlist offer inventory hold.
 * Key: waitlist-hold:{waitlistEntryId}
 * Value: quantity offered as a string
 * TTL: waitlistWindowSeconds (default 1800 s / 30 min)
 */
export function waitlistHoldKey(waitlistEntryId: string): string {
  return `waitlist-hold:${waitlistEntryId}`
}

// ─── Ticket visibility unlock helpers ─────────────────────────────────────────

/**
 * Redis key for a password-unlock session token on a PASSWORD_PROTECTED TicketType.
 * Key: ticket-unlock:{ticketTypeId}:{sessionToken}
 * Value: "1"
 * TTL: 3600 s (1 hour session)
 */
export function ticketUnlockKey(ticketTypeId: string, sessionToken: string): string {
  return `ticket-unlock:${ticketTypeId}:${sessionToken}`
}
