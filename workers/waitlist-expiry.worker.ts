/**
 * Waitlist Expiry Worker
 *
 * Processes jobs from the "waitlist-expiry" BullMQ queue.
 * Fires when a waitlist offer window closes without the attendee completing payment.
 *
 * Logic:
 *   1. Load WaitlistEntry; skip if not OFFERED (idempotent)
 *   2. DB transaction:
 *      a. Set WaitlistEntry → EXPIRED
 *      b. Set associated Reservation → EXPIRED (if present)
 *      c. Write AuditLog entries for both
 *   3. Delete the Redis waitlist hold key
 *   4. Call advanceWaitlist to offer the next PENDING entry
 *   5. Send waitlist-offer-expired email (non-blocking)
 */
import { Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

export interface WaitlistExpiryJobData {
  waitlistEntryId: string
}

const QUEUE_NAME = 'waitlist-expiry'

export function createWaitlistExpiryWorker(redisUrl: string) {
  const isTls = redisUrl.startsWith('rediss://')

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(isTls && { tls: { rejectUnauthorized: false } }),
  })

  const worker = new Worker<WaitlistExpiryJobData>(
    QUEUE_NAME,
    async (job: Job<WaitlistExpiryJobData>) => {
      const { waitlistEntryId } = job.data
      console.log(`[WaitlistExpiry] Processing expiry for waitlist entry: ${waitlistEntryId}`)

      // Dynamic imports — avoid loading app code at worker bootstrap time
      const { db } = await import('@/lib/db')
      const { WaitlistStatus, ReservationStatus, AuditEntityType, AuditAction } = await import(
        '@/app/generated/prisma/client'
      )
      const { redis, waitlistHoldKey } = await import('@/lib/redis')
      const { writeAuditLog } = await import('@/lib/audit')
      const { advanceWaitlist } = await import('@/features/waitlist/actions')
      const { sendWaitlistOfferExpired } = await import('@/lib/email')

      // ── 1. Load WaitlistEntry with related Reservation, event, and user ────
      const entry = await db.waitlistEntry.findUnique({
        where: { id: waitlistEntryId },
        select: {
          id: true,
          status: true,
          ticketTypeId: true,
          requestedQty: true,
          userId: true,
          // Reservation linked via waitlistEntryId on the Reservation model
          reservation: {
            select: {
              id: true,
              status: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
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

      if (!entry) {
        console.warn(`[WaitlistExpiry] WaitlistEntry not found: ${waitlistEntryId}`)
        return
      }

      // ── 2. Idempotency guard — only act on OFFERED entries ─────────────────
      if (entry.status !== WaitlistStatus.OFFERED) {
        console.log(
          `[WaitlistExpiry] WaitlistEntry ${waitlistEntryId} already in state: ${entry.status} — skipping`
        )
        return
      }

      // ── 3. DB transaction — expire the WaitlistEntry and its Reservation ───
      await db.$transaction(async (tx) => {
        // Set WaitlistEntry → EXPIRED
        await tx.waitlistEntry.update({
          where: { id: waitlistEntryId },
          data: { status: WaitlistStatus.EXPIRED },
        })

        await writeAuditLog(tx, {
          entityType: AuditEntityType.WAITLIST_ENTRY,
          entityId: waitlistEntryId,
          action: AuditAction.EXPIRED,
          oldStatus: WaitlistStatus.OFFERED,
          newStatus: WaitlistStatus.EXPIRED,
          actor: 'system',
          metadata: {
            ticketTypeId: entry.ticketTypeId,
            requestedQty: entry.requestedQty,
          },
        })

        // Set associated Reservation → EXPIRED (if it exists and is still ACTIVE)
        if (entry.reservation && entry.reservation.status === ReservationStatus.ACTIVE) {
          await tx.reservation.update({
            where: { id: entry.reservation.id },
            data: { status: ReservationStatus.EXPIRED },
          })

          await writeAuditLog(tx, {
            entityType: AuditEntityType.RESERVATION,
            entityId: entry.reservation.id,
            action: AuditAction.EXPIRED,
            oldStatus: ReservationStatus.ACTIVE,
            newStatus: ReservationStatus.EXPIRED,
            actor: 'system',
            metadata: { waitlistEntryId },
          })
        }
      })

      console.log(
        `[WaitlistExpiry] WaitlistEntry ${waitlistEntryId} expired${entry.reservation ? `; Reservation ${entry.reservation.id} also expired` : ''}`
      )

      // ── 4. Delete Redis waitlist hold key ──────────────────────────────────
      redis.del(waitlistHoldKey(waitlistEntryId)).catch((err) => {
        console.error(
          `[WaitlistExpiry] Failed to delete Redis hold key for ${waitlistEntryId}:`,
          err
        )
      })

      // ── 5. Advance waitlist — offer spot to the next PENDING entry ─────────
      advanceWaitlist({
        ticketTypeId: entry.ticketTypeId,
        releasedQty: entry.requestedQty,
      }).catch((err) => {
        console.error(
          `[WaitlistExpiry] advanceWaitlist failed for ticketTypeId ${entry.ticketTypeId}:`,
          err
        )
      })

      // ── 6. Send waitlist-offer-expired email (non-blocking) ────────────────
      if (entry.user && entry.event) {
        sendWaitlistOfferExpired({
          toEmail: entry.user.email,
          toName: entry.user.name,
          eventTitle: entry.event.title,
          eventSlug: entry.event.slug,
        }).catch((err) => {
          console.error(
            `[WaitlistExpiry] Failed to send offer-expired email for ${waitlistEntryId}:`,
            err
          )
        })
      }
    },
    {
      connection,
      concurrency: 10,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[WaitlistExpiry] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
