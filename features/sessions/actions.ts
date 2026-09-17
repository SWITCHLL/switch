'use server'

import 'server-only'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { enrolInSessionSchema } from './schemas'
import {
  AuditAction,
  AuditEntityType,
  SessionInclusionMode,
  TicketStatus,
} from '@/app/generated/prisma/client'

// ─── Enrol in Session ─────────────────────────────────────────────────────────

export async function enrolInSession(
  input: unknown
): Promise<
  | { success: true }
  | { success: false; error: string; sessionIds?: string[] }
> {
  // 1. Authenticate
  const session = await getSession()
  if (!session) return { success: false, error: 'UNAUTHENTICATED' }

  // 2. Validate input
  const parsed = enrolInSessionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { ticketId, sessionIds } = parsed.data
  const { userId } = session

  // 3. Verify ticket belongs to user and is ACTIVE
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, eventId: true, status: true },
  })

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.userId !== userId) return { success: false, error: 'Unauthorized' }
  if (ticket.status !== TicketStatus.ACTIVE) {
    return { success: false, error: 'Ticket is not active' }
  }

  // 4. Load sessions and validate inclusionMode allows selection
  const sessions = await db.eventSession.findMany({
    where: {
      id: { in: sessionIds },
      eventId: ticket.eventId,
    },
    select: {
      id: true,
      inclusionMode: true,
      capacity: true,
      _count: { select: { enrolments: true } },
    },
  })

  // Ensure all requested session IDs were found for this event
  if (sessions.length !== sessionIds.length) {
    return { success: false, error: 'One or more sessions not found for this event' }
  }

  // Reject INCLUDED sessions — they are auto-enrolled, not manually selectable
  const includedSessions = sessions.filter(
    (s) => s.inclusionMode === SessionInclusionMode.INCLUDED
  )
  if (includedSessions.length > 0) {
    return {
      success: false,
      error: 'INCLUDED sessions are enrolled automatically and cannot be manually selected',
    }
  }

  // Collect OPTIONAL_PAID sessions — return early; client must redirect to payment
  const paidSessions = sessions.filter(
    (s) => s.inclusionMode === SessionInclusionMode.OPTIONAL_PAID
  )
  if (paidSessions.length > 0) {
    return {
      success: false,
      error: 'REQUIRES_PAYMENT',
      sessionIds: paidSessions.map((s) => s.id),
    }
  }

  // Remaining are OPTIONAL_FREE or CAPACITY_LIMITED — free, proceed
  // 5. DB transaction: for each free session, check capacity and create enrolment
  try {
    await db.$transaction(async (tx) => {
      for (const sess of sessions) {
        // Re-read enrolment count inside the transaction to avoid races
        const enrolmentCount = await tx.sessionEnrolment.count({
          where: { sessionId: sess.id },
        })

        // Capacity check (null = unlimited)
        if (sess.capacity !== null && enrolmentCount >= sess.capacity) {
          throw new Error(`FULL:${sess.id}`)
        }

        // Create enrolment — skipDuplicates avoids failure if already enrolled
        await tx.sessionEnrolment.upsert({
          where: {
            ticketId_sessionId: { ticketId, sessionId: sess.id },
          },
          create: { ticketId, sessionId: sess.id },
          update: {}, // no-op if already enrolled
        })
      }

      // Write a single audit log entry covering all enrolled sessions
      await writeAuditLog(tx, {
        entityType: AuditEntityType.TICKET,
        entityId: ticketId,
        action: AuditAction.STATUS_CHANGED,
        actor: userId,
        metadata: {
          enrolledSessionIds: sessionIds,
          eventId: ticket.eventId,
        },
      })
    })

    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('FULL:')) {
      const sessionId = err.message.slice(5)
      return { success: false, error: `Session is full`, sessionIds: [sessionId] }
    }
    console.error('[enrolInSession] transaction error:', err)
    return { success: false, error: 'Failed to enrol in session. Please try again.' }
  }
}
