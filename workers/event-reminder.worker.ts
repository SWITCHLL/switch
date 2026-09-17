/**
 * Event Reminder Worker
 *
 * Processes jobs from the "event-reminder" BullMQ queue.
 * Jobs are scheduled 24 hours before an event starts.
 *
 * Logic:
 *   1. Load the Ticket; skip if not ACTIVE (idempotent)
 *   2. Send event-reminder email (non-blocking)
 */
import { Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

export interface EventReminderJobData {
  eventId: string
  userId: string
  ticketId: string
}

const QUEUE_NAME = 'event-reminder'

export function createEventReminderWorker(redisUrl: string) {
  const isTls = redisUrl.startsWith('rediss://')

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(isTls && { tls: { rejectUnauthorized: false } }),
  })

  const worker = new Worker<EventReminderJobData>(
    QUEUE_NAME,
    async (job: Job<EventReminderJobData>) => {
      const { ticketId, eventId, userId } = job.data
      console.log(
        `[EventReminder] Processing reminder for ticket: ${ticketId} (event: ${eventId}, user: ${userId})`
      )

      // Dynamic imports — avoid loading app code at worker bootstrap time
      const { db } = await import('@/lib/db')
      const { TicketStatus } = await import('@/app/generated/prisma/client')
      const { sendEventReminder } = await import('@/lib/email')

      // ── 1. Load ticket with event and user context ──────────────────────────
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          status: true,
          ticketNumber: true,
          qrCode: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startsAt: true,
              venueName: true,
              venueAddress: true,
              venueCity: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })

      if (!ticket) {
        console.warn(`[EventReminder] Ticket not found: ${ticketId}`)
        return
      }

      // ── 2. Idempotency guard — only send reminders for ACTIVE tickets ──────
      if (ticket.status !== TicketStatus.ACTIVE) {
        console.log(
          `[EventReminder] Ticket ${ticketId} is in state ${ticket.status} — skipping reminder`
        )
        return
      }

      // ── 3. Send event reminder email ───────────────────────────────────────
      if (ticket.user && ticket.event) {
        try {
          await sendEventReminder({
            toEmail: ticket.user.email,
            toName: ticket.user.name,
            eventTitle: ticket.event.title,
            eventSlug: ticket.event.slug,
            eventStartsAt: ticket.event.startsAt,
            venueName: ticket.event.venueName,
            venueAddress: ticket.event.venueAddress,
            venueCity: ticket.event.venueCity,
            ticketNumber: ticket.ticketNumber,
            qrCode: ticket.qrCode,
          })
          console.log(`[EventReminder] Reminder sent for ticket ${ticketId}`)
        } catch (err) {
          console.error(`[EventReminder] Failed to send reminder email for ticket ${ticketId}:`, err)
          // Re-throw so BullMQ can retry the job
          throw err
        }
      }
    },
    {
      connection,
      concurrency: 20,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[EventReminder] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
