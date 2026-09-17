import type { EventSession } from '@/app/generated/prisma/client'

/**
 * An EventSession enriched with enrolment counts.
 * Returned by getEventSessions.
 */
export type EventSessionWithEnrolmentCount = EventSession & {
  /** Number of confirmed enrolments for this session */
  enrolmentCount: number
  /**
   * Remaining capacity.
   * null = unlimited (capacity field on the session is null).
   */
  remaining: number | null
}
