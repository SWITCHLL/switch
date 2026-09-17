import 'server-only'
import { db } from '@/lib/db'
import type { EventSessionWithEnrolmentCount } from './types'
import type { SessionEnrolment, EventSession } from '@/app/generated/prisma/client'

/**
 * Get all sessions for an event, ordered by start time, enriched with
 * enrolment counts and remaining capacity.
 */
export async function getEventSessions(
  eventId: string
): Promise<EventSessionWithEnrolmentCount[]> {
  const sessions = await db.eventSession.findMany({
    where: { eventId },
    orderBy: { startsAt: 'asc' },
    include: {
      _count: {
        select: { enrolments: true },
      },
    },
  })

  return sessions.map((session) => {
    const enrolmentCount = session._count.enrolments
    const remaining =
      session.capacity !== null ? session.capacity - enrolmentCount : null

    // Exclude _count from the returned shape
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _count, ...sessionBase } = session

    return {
      ...sessionBase,
      enrolmentCount,
      remaining,
    } satisfies EventSessionWithEnrolmentCount
  })
}

/**
 * Get all session enrolments for a given ticket, including session details.
 */
export async function getTicketEnrolments(
  ticketId: string
): Promise<(SessionEnrolment & { session: EventSession })[]> {
  return db.sessionEnrolment.findMany({
    where: { ticketId },
    include: { session: true },
    orderBy: { session: { startsAt: 'asc' } },
  })
}
