'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// ─── Schema ───────────────────────────────────────────────────────────────────

const submitReviewSchema = z.object({
  ticketId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
})

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Submit a review ──────────────────────────────────────────────────────────

export async function submitEventReview(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = submitReviewSchema.safeParse({
    ticketId: formData.get('ticketId'),
    rating: formData.get('rating'),
    body: formData.get('body') || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { ticketId, rating, body } = parsed.data

  // Verify the ticket belongs to this user and the event is completed
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      eventId: true,
      review: { select: { id: true } },
      event: { select: { status: true } },
    },
  })

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.userId !== session.userId) return { success: false, error: 'Unauthorized' }
  if (ticket.event.status !== 'COMPLETED') {
    return { success: false, error: 'Event has not completed yet' }
  }
  if (ticket.review) return { success: false, error: 'You have already reviewed this event' }

  await db.eventReview.create({
    data: {
      eventId: ticket.eventId,
      userId: session.userId,
      ticketId: ticket.id,
      rating,
      body: body ?? null,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath(`/events`)

  return { success: true, data: undefined }
}

// ─── Get reviews for an event ─────────────────────────────────────────────────

export async function getEventReviews(eventId: string) {
  return db.eventReview.findMany({
    where: { eventId },
    select: {
      id: true,
      rating: true,
      body: true,
      reply: true,
      replyAt: true,
      createdAt: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Check if the current user can review a specific event ────────────────────

export async function getUserEventReviewStatus(eventId: string) {
  const session = await getSession()
  if (!session) return { canReview: false, hasReviewed: false, ticketId: null }

  const ticket = await db.ticket.findFirst({
    where: {
      userId: session.userId,
      eventId,
      status: { in: ['ACTIVE', 'USED'] },
    },
    select: {
      id: true,
      review: { select: { id: true, rating: true, body: true } },
    },
  })

  if (!ticket) return { canReview: false, hasReviewed: false, ticketId: null }

  return {
    canReview: !ticket.review,
    hasReviewed: Boolean(ticket.review),
    ticketId: ticket.id,
    existingReview: ticket.review,
  }
}
