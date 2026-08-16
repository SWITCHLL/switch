/**
 * Group Order Expiry Worker
 *
 * Processes jobs from the "group-expiry" BullMQ queue.
 * Each job carries a groupOrderId and fires when the group order deadline passes.
 *
 * Logic:
 *  - requireFullPayment=true  → all unpaid slots are released; if any unpaid exist,
 *                               the entire order is marked EXPIRED (paid slots get refunded via admin)
 *  - requireFullPayment=false → paid slots keep their tickets; unpaid slots are released
 *                               back to general inventory; order closes as COMPLETE or EXPIRED
 */
import { Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

export interface GroupExpiryJobData {
  groupOrderId: string
}

const QUEUE_NAME = 'group-expiry'

export function createGroupExpiryWorker(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null })

  const worker = new Worker<GroupExpiryJobData>(
    QUEUE_NAME,
    async (job: Job<GroupExpiryJobData>) => {
      const { groupOrderId } = job.data
      console.log(`[GroupExpiry] Processing expiry for group order: ${groupOrderId}`)

      // Dynamic import to avoid loading Prisma in the worker bootstrap
      const { db } = await import('@/lib/db')
      const { GroupOrderStatus, GroupSlotStatus } = await import('@/app/generated/prisma/client')

      const order = await db.groupOrder.findUnique({
        where: { id: groupOrderId },
        include: { slots: true },
      })

      if (!order) {
        console.warn(`[GroupExpiry] Group order not found: ${groupOrderId}`)
        return
      }

      // Already resolved — nothing to do
      if (
        order.status === GroupOrderStatus.COMPLETE ||
        order.status === GroupOrderStatus.CANCELLED
      ) {
        console.log(
          `[GroupExpiry] Order ${groupOrderId} already in terminal state: ${order.status}`
        )
        return
      }

      const unpaidSlots = order.slots.filter(
        (s) => s.status === GroupSlotStatus.OPEN || s.status === GroupSlotStatus.HELD
      )
      const paidSlots = order.slots.filter((s) => s.status === GroupSlotStatus.PAID)

      if (unpaidSlots.length === 0) {
        // Everything is paid — mark complete
        await db.groupOrder.update({
          where: { id: groupOrderId },
          data: { status: GroupOrderStatus.COMPLETE },
        })
        console.log(
          `[GroupExpiry] Order ${groupOrderId} marked COMPLETE (all slots paid on expiry)`
        )
        return
      }

      await db.$transaction(async (tx) => {
        // Release unpaid slots back to AVAILABLE
        for (const slot of unpaidSlots) {
          await tx.groupOrderSlot.update({
            where: { id: slot.id },
            data: { status: GroupSlotStatus.RELEASED },
          })

          // Release the underlying event seat if it was for reserved seating
          if (slot.eventSeatId) {
            await tx.eventSeat.update({
              where: { id: slot.eventSeatId },
              data: { status: 'AVAILABLE', reservationId: null, lockedUntil: null },
            })
          }
        }

        if (order.requireFullPayment && paidSlots.length > 0) {
          // Mark order EXPIRED — admin will process refunds for the paid slots
          await tx.groupOrder.update({
            where: { id: groupOrderId },
            data: { status: GroupOrderStatus.EXPIRED },
          })
          console.log(
            `[GroupExpiry] Order ${groupOrderId} EXPIRED with ${paidSlots.length} paid slots requiring refund`
          )
        } else {
          // Best-effort: paid slots keep tickets, order closes
          const finalStatus =
            paidSlots.length > 0 ? GroupOrderStatus.COMPLETE : GroupOrderStatus.EXPIRED
          await tx.groupOrder.update({
            where: { id: groupOrderId },
            data: { status: finalStatus },
          })
          console.log(
            `[GroupExpiry] Order ${groupOrderId} closed as ${finalStatus} (${paidSlots.length} paid, ${unpaidSlots.length} released)`
          )
        }
      })
    },
    {
      connection,
      concurrency: 5,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[GroupExpiry] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
