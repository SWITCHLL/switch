/**
 * Redis-backed sliding-window rate limiter.
 *
 * Uses a sorted set per key. Each request adds a member with the current
 * timestamp as score; old entries outside the window are pruned atomically.
 * All operations are a single Lua script for atomicity.
 *
 * Usage:
 *   const result = await rateLimit('checkin:ip:1.2.3.4', { limit: 20, windowMs: 60_000 })
 *   if (!result.success) return 429
 */
import 'server-only'
import { redis } from './redis'

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  /** How many requests remain in the current window */
  remaining: number
  /** Unix ms when the oldest request in the window expires */
  resetAt: number
}

// Lua script: atomic sliding-window check
// KEYS[1] = sorted set key
// ARGV[1] = current timestamp (ms)
// ARGV[2] = window size (ms)
// ARGV[3] = limit
// ARGV[4] = TTL (seconds, = ceil(windowMs / 1000) + 1)
const SCRIPT = `
local key      = KEYS[1]
local now      = tonumber(ARGV[1])
local window   = tonumber(ARGV[2])
local limit    = tonumber(ARGV[3])
local ttl      = tonumber(ARGV[4])
local cutoff   = now - window

-- Remove entries outside the window
redis.call("ZREMRANGEBYSCORE", key, "-inf", cutoff)

-- Count current entries
local count = redis.call("ZCARD", key)

if count < limit then
  -- Add this request
  redis.call("ZADD", key, now, now .. "-" .. math.random(1e9))
  redis.call("EXPIRE", key, ttl)
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local reset = oldest[2] and (tonumber(oldest[2]) + window) or (now + window)
  return {1, limit - count - 1, reset}
else
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local reset = oldest[2] and (tonumber(oldest[2]) + window) or (now + window)
  return {0, 0, reset}
end
`

/**
 * Check and record a rate-limited request.
 *
 * @param key      Unique identifier for this limit bucket (e.g. "checkin:ip:x.x.x.x")
 * @param options  limit + windowMs
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, windowMs } = options
  const now = Date.now()
  const ttl = Math.ceil(windowMs / 1000) + 1

  try {
    const result = (await redis.eval(
      SCRIPT,
      1,
      `rl:${key}`,
      String(now),
      String(windowMs),
      String(limit),
      String(ttl)
    )) as [number, number, number]

    return {
      success: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
    }
  } catch {
    // If Redis is unavailable, fail open rather than blocking legitimate requests.
    // Log the failure so ops can investigate.
    console.error('[rateLimit] Redis error — failing open for key:', key)
    return { success: true, remaining: 0, resetAt: now + windowMs }
  }
}

/**
 * Extract a best-effort client IP from a Next.js request.
 * Checks x-forwarded-for (set by proxies/Vercel) then falls back to a static string.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return 'unknown'
}
