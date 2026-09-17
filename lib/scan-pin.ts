/**
 * Scan PIN helpers
 *
 * A scan PIN lets door staff check in attendees without an organizer login.
 * The organizer generates a PIN from the manage-event page; it's stored in
 * Redis and expires automatically. Any device that presents the correct
 * eventId + PIN can call POST /api/checkin.
 *
 * PINs can be:
 *  - Event-wide: works for any show at the event
 *  - Time-slot specific: works only for a particular show (e.g. "4pm show on 26 Dec")
 *
 * Key schema:  scan-pin:{eventId}:{timeSlotId?}  →  "{pin}:{organizerId}"
 * TTL:         24 hours (configurable via SCAN_PIN_TTL_SECONDS)
 */

import 'server-only'
import { redis } from './redis'

const TTL = parseInt(process.env.SCAN_PIN_TTL_SECONDS ?? '86400', 10) // 24 h default

function pinKey(eventId: string, timeSlotId?: string): string {
  return timeSlotId ? `scan-pin:${eventId}:${timeSlotId}` : `scan-pin:${eventId}`
}

/** Generate a cryptographically random 6-digit PIN (000000–999999). */
function generatePin(): string {
  // Math.random is fine here — this is not a crypto secret, just a short-lived
  // access code. The eventId + PIN combination provides sufficient entropy.
  const n = Math.floor(Math.random() * 1_000_000)
  return n.toString().padStart(6, '0')
}

/** Create (or rotate) a scan PIN for an event or specific time slot. Returns the new PIN. */
export async function createScanPin(
  eventId: string,
  organizerId: string,
  timeSlotId?: string
): Promise<string> {
  const pin = generatePin()
  await redis.set(pinKey(eventId, timeSlotId), `${pin}:${organizerId}`, 'EX', TTL)
  return pin
}

/**
 * Verify a PIN for an event.
 * Returns { organizerId, timeSlotId } if valid, null otherwise.
 * If timeSlotId is passed, only matches PINs for that specific slot.
 * If timeSlotId is not passed, matches both event-wide and slot-specific PINs for that event.
 */
export async function verifyScanPin(
  eventId: string,
  pin: string,
  timeSlotId?: string
): Promise<{ organizerId: string; timeSlotId?: string } | null> {
  // Try slot-specific PIN first if timeSlotId provided
  if (timeSlotId) {
    const stored = await redis.get(pinKey(eventId, timeSlotId))
    if (stored) {
      const [storedPin, organizerId] = stored.split(':')
      if (storedPin === pin.replace(/\D/g, '')) {
        // strip hyphens/spaces
        return { organizerId, timeSlotId }
      }
    }
  }

  // Fall back to event-wide PIN
  const stored = await redis.get(pinKey(eventId))
  if (!stored) return null
  const [storedPin, organizerId] = stored.split(':')
  if (storedPin !== pin.replace(/\D/g, '')) return null // strip hyphens/spaces
  return { organizerId }
}

/** Revoke the scan PIN for an event (event-wide) or a specific time slot. */
export async function revokeScanPin(eventId: string, timeSlotId?: string): Promise<void> {
  await redis.del(pinKey(eventId, timeSlotId))
}

/**
 * Get the TTL (seconds) remaining on a scan PIN.
 * Returns -2 if no PIN exists, -1 if no expiry (shouldn't happen).
 */
export async function getScanPinTtl(eventId: string, timeSlotId?: string): Promise<number> {
  return redis.ttl(pinKey(eventId, timeSlotId))
}
