'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  acquireGroupSlotLock,
  releaseGroupSlotLock,
  acquireSeatLock,
  releaseAllSeatLocks,
} from '@/lib/redis'
import { scheduleGroupExpiry } from '@/lib/queues'
import { sendGroupCompleteEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import {
  createGroupOrderSchema,
  claimSlotSchema,
  confirmGroupSlotSchema,
  releaseSlotSchema,
  cancelGroupOrderSchema,
} from './schemas'
import type {
  CreateGroupOrderResult,
  ClaimSlotResult,
  ConfirmGroupSlotResult,
  ReleaseSlotResult,
  CancelGroupOrderResult,
} from './types'
import {
  EventSeatStatus,
  GroupOrderStatus,
  GroupSlotStatus,
  TicketStatus,
} from '@/app/generated/prisma/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateGroupCode(): string {
  return `GRP-${randomBytes(3).toString('hex').toUpperCase()}`
}

function generateTicketNumber(): string {
  const year = new Date().getFullYear()
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `SWT-${year}-${hex}`
}

function generateQrCode(): string {
  return randomBytes(16).toString('hex')
}

// ─── Create a group order ─────────────────────────────────────────────────────

export async function createGroupOrder(input: unknown): Promise<CreateGroupOrderResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = createGroupOrderSchema.safeParse(input)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { eventId, reservedSlots = [], gaSlots = [], requireFullPayment, ttlMinutes } = parsed.data
  const { userId } = session

  if (reservedSlots.length === 0 && gaSlots.length === 0) {
    return { success: false, error: 'Select at least one seat or ticket' }
  }

  // Validate event
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, salesStart: true, salesEnd: true },
  })
  if (!event || event.status !== 'PUBLISHED') {
    return { success: false, error: 'Event not found or not available' }
  }
  if (event.salesEnd && new Date(event.salesEnd) < new Date()) {
    return { success: false, error: 'Ticket sales have ended for this event' }
  }

  // For reserved slots: acquire seat locks before the DB transaction
  const acquiredSeatIds: string[] = []
  for (const slot of reservedSlots) {
    const eventSeat = await db.eventSeat.findUnique({
      where: { id: slot.eventSeatId },
      select: { seatId: true, status: true },
    })
    if (!eventSeat || eventSeat.status !== EventSeatStatus.AVAILABLE) {
      await releaseAllSeatLocks(eventId, acquiredSeatIds, userId)
      return { success: false, error: 'One or more selected seats are no longer available' }
    }
    const locked = await acquireSeatLock(eventId, eventSeat.seatId, userId)
    if (!locked) {
      await releaseAllSeatLocks(eventId, acquiredSeatIds, userId)
      return { success: false, error: 'Could not lock a seat — someone else just selected it' }
    }
    acquiredSeatIds.push(eventSeat.seatId)
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

  try {
    const result = await db.$transaction(async (tx) => {
      // Double-check seat availability inside the transaction
      if (reservedSlots.length > 0) {
        const seats = await tx.eventSeat.findMany({
          where: { id: { in: reservedSlots.map((s) => s.eventSeatId) } },
          select: { id: true, price: true, ticketTypeId: true, status: true },
        })
        const unavailable = seats.filter((s) => s.status !== EventSeatStatus.AVAILABLE)
        if (unavailable.length > 0) throw new Error('SEATS_UNAVAILABLE')
      }

      // Generate a unique code (retry on collision)
      let code = generateGroupCode()
      while (await tx.groupOrder.findUnique({ where: { code } })) {
        code = generateGroupCode()
      }

      const groupOrder = await tx.groupOrder.create({
        data: {
          eventId,
          initiatorId: userId,
          code,
          status: GroupOrderStatus.PENDING,
          requireFullPayment,
          expiresAt,
        },
      })

      // Create slots for reserved seats
      for (const slot of reservedSlots) {
        const eventSeat = await tx.eventSeat.findUnique({
          where: { id: slot.eventSeatId },
          select: { id: true, price: true },
        })
        if (!eventSeat) throw new Error('SEATS_UNAVAILABLE')

        await tx.groupOrderSlot.create({
          data: {
            groupOrderId: groupOrder.id,
            eventSeatId: slot.eventSeatId,
            price: eventSeat.price,
            label: slot.label ?? null,
            status: GroupSlotStatus.OPEN,
          },
        })

        // Hold the seat so it can't be purchased by anyone else
        await tx.eventSeat.update({
          where: { id: slot.eventSeatId },
          data: { status: EventSeatStatus.HELD, lockedUntil: expiresAt },
        })
      }

      // Create slots for GA tickets
      for (const bundle of gaSlots) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: bundle.ticketTypeId },
          select: {
            id: true,
            price: true,
            quantity: true,
            sold: true,
            status: true,
            eventId: true,
          },
        })
        if (!ticketType || ticketType.eventId !== eventId || ticketType.status === 'INACTIVE') {
          throw new Error('INVALID_TICKET_TYPE')
        }
        if (
          ticketType.quantity !== null &&
          ticketType.quantity - ticketType.sold < bundle.quantity
        ) {
          throw new Error('INSUFFICIENT_QUANTITY')
        }

        for (let i = 0; i < bundle.quantity; i++) {
          await tx.groupOrderSlot.create({
            data: {
              groupOrderId: groupOrder.id,
              ticketTypeId: bundle.ticketTypeId,
              price: ticketType.price,
              label:
                bundle.quantity > 1
                  ? `${bundle.label ?? 'Ticket'} ${i + 1}`
                  : (bundle.label ?? null),
              status: GroupSlotStatus.OPEN,
            },
          })
        }
      }

      return groupOrder
    })

    // Schedule the BullMQ expiry job
    await scheduleGroupExpiry(result.id, expiresAt)

    return { success: true, groupOrderId: result.id, code: result.code }
  } catch (err) {
    await releaseAllSeatLocks(eventId, acquiredSeatIds, userId)
    if (err instanceof Error) {
      if (err.message === 'SEATS_UNAVAILABLE')
        return { success: false, error: 'One or more seats are no longer available' }
      if (err.message === 'INVALID_TICKET_TYPE')
        return { success: false, error: 'Invalid ticket type' }
      if (err.message === 'INSUFFICIENT_QUANTITY')
        return { success: false, error: 'Not enough tickets remaining' }
    }
    console.error('[createGroupOrder]', err)
    return { success: false, error: 'Failed to create group order. Please try again.' }
  }
}

// ─── Claim a slot ─────────────────────────────────────────────────────────────

export async function claimSlot(input: unknown): Promise<ClaimSlotResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = claimSlotSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { slotId } = parsed.data
  const { userId } = session

  // Load slot with its group order
  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    include: { groupOrder: { select: { status: true, expiresAt: true, eventId: true } } },
  })

  if (!slot) return { success: false, error: 'Slot not found' }
  if (slot.groupOrder.status !== GroupOrderStatus.PENDING) {
    return { success: false, error: 'This group order is no longer accepting payments' }
  }
  if (new Date(slot.groupOrder.expiresAt) < new Date()) {
    return { success: false, error: 'This group order has expired' }
  }
  if (slot.status !== GroupSlotStatus.OPEN) {
    return { success: false, error: 'This slot has already been claimed' }
  }

  // Acquire Redis lock on the slot
  const locked = await acquireGroupSlotLock(slotId, userId)
  if (!locked) {
    return { success: false, error: 'Someone else is claiming this slot right now. Try another.' }
  }

  try {
    // Mark slot as HELD inside a transaction
    await db.$transaction(async (tx) => {
      const current = await tx.groupOrderSlot.findUnique({
        where: { id: slotId },
        select: { status: true },
      })
      if (current?.status !== GroupSlotStatus.OPEN) throw new Error('ALREADY_CLAIMED')

      await tx.groupOrderSlot.update({
        where: { id: slotId },
        data: {
          status: GroupSlotStatus.HELD,
          claimedBy: userId,
          claimedAt: new Date(),
        },
      })
    })

    return { success: true, slotId, amount: slot.price, currency: slot.currency }
  } catch (err) {
    await releaseGroupSlotLock(slotId, userId)
    if (err instanceof Error && err.message === 'ALREADY_CLAIMED') {
      return { success: false, error: 'This slot was just claimed by someone else' }
    }
    console.error('[claimSlot]', err)
    return { success: false, error: 'Failed to claim slot. Please try again.' }
  }
}

// ─── Confirm slot payment (called from Paystack webhook) ─────────────────────

export async function confirmGroupSlotPayment(input: unknown): Promise<ConfirmGroupSlotResult> {
  const parsed = confirmGroupSlotSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { slotId, paystackReference } = parsed.data

  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    include: {
      groupOrder: {
        include: {
          initiator: { select: { email: true } },
          event: { select: { id: true, organizerId: true, title: true } },
          slots: { select: { status: true } },
        },
      },
      // Pre-load the eventSeat's ticketTypeId so we don't need a nested await
      eventSeat: { select: { id: true, ticketTypeId: true } },
    },
  })

  if (!slot) return { success: false, error: 'Slot not found' }
  if (slot.status !== GroupSlotStatus.HELD) {
    return { success: false, error: `Slot is not in HELD state (current: ${slot.status})` }
  }
  if (!slot.claimedBy) return { success: false, error: 'Slot has no claimer' }

  // Resolve the ticket type ID:
  //   - GA slots  → slot.ticketTypeId
  //   - Reserved  → eventSeat.ticketTypeId
  const resolvedTicketTypeId = slot.ticketTypeId ?? slot.eventSeat?.ticketTypeId
  if (!resolvedTicketTypeId) return { success: false, error: 'Cannot resolve ticket type for slot' }

  // Resolve organizer fee
  const { resolveFeePercent, calculateFee } = await import('@/lib/fees')
  const organizer = await db.organizer.findUnique({
    where: { id: slot.groupOrder.event.organizerId },
    select: { id: true, feePercent: true },
  })
  if (!organizer) return { success: false, error: 'Organizer not found' }

  const feePercent = resolveFeePercent(organizer.feePercent)
  const { feeAmount, netAmount } = calculateFee(slot.price, feePercent)

  try {
    const ticketId = await db.$transaction(async (tx) => {
      // Issue the ticket
      const ticket = await tx.ticket.create({
        data: {
          eventId: slot.groupOrder.eventId,
          userId: slot.claimedBy!,
          eventSeatId: slot.eventSeatId ?? undefined,
          ticketTypeId: resolvedTicketTypeId,
          ticketNumber: generateTicketNumber(),
          qrCode: generateQrCode(),
          status: TicketStatus.ACTIVE,
          issuedAt: new Date(),
        },
      })

      // Record the payment
      await tx.payment.create({
        data: {
          ticketId: ticket.id,
          organizerId: organizer.id,
          userId: slot.claimedBy!,
          eventId: slot.groupOrder.eventId,
          amount: slot.price,
          currency: slot.currency,
          platformFeePercent: feePercent,
          platformFeeAmount: feeAmount,
          netAmount,
          status: 'SUCCESS',
          paystackReference,
        },
      })

      // Mark the event seat as SOLD (reserved seating)
      if (slot.eventSeatId) {
        await tx.eventSeat.update({
          where: { id: slot.eventSeatId },
          data: { status: EventSeatStatus.SOLD },
        })
      }

      // Increment sold count on ticket type (GA seating)
      if (slot.ticketTypeId) {
        await tx.ticketType.update({
          where: { id: slot.ticketTypeId },
          data: { sold: { increment: 1 } },
        })
      }

      // Update the slot
      await tx.groupOrderSlot.update({
        where: { id: slotId },
        data: {
          status: GroupSlotStatus.PAID,
          ticketId: ticket.id,
        },
      })

      return ticket.id
    })

    // Release the Redis slot lock
    await releaseGroupSlotLock(slotId, slot.claimedBy)

    // Check if all slots are now paid
    const refreshed = await db.groupOrderSlot.findMany({
      where: { groupOrderId: slot.groupOrderId },
      select: { status: true },
    })
    const allPaid = refreshed.every((s) => s.status === GroupSlotStatus.PAID)

    if (allPaid) {
      await db.groupOrder.update({
        where: { id: slot.groupOrderId },
        data: { status: GroupOrderStatus.COMPLETE },
      })

      // Notify initiator
      sendGroupCompleteEmail({
        toEmail: slot.groupOrder.initiator.email,
        eventTitle: slot.groupOrder.event.title,
        groupCode: slot.groupOrder.code,
        paidCount: refreshed.length,
      }).catch((err) => console.error('[confirmGroupSlotPayment] complete email error:', err))
    }

    return { success: true, ticketId, groupComplete: allPaid }
  } catch (err) {
    console.error('[confirmGroupSlotPayment]', err)
    return { success: false, error: 'Failed to confirm payment. Please contact support.' }
  }
}

// ─── Release a claimed (HELD) slot ───────────────────────────────────────────

export async function releaseSlot(input: unknown): Promise<ReleaseSlotResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = releaseSlotSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { slotId } = parsed.data
  const { userId } = session

  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      claimedBy: true,
      status: true,
      eventSeatId: true,
      groupOrder: { select: { eventId: true } },
    },
  })

  if (!slot) return { success: false, error: 'Slot not found' }
  if (slot.claimedBy !== userId) return { success: false, error: 'You did not claim this slot' }
  if (slot.status === GroupSlotStatus.PAID) {
    return { success: false, error: 'Cannot release a paid slot — submit a refund request instead' }
  }
  if (slot.status !== GroupSlotStatus.HELD) {
    return { success: false, error: 'Slot is not held' }
  }

  await db.$transaction(async (tx) => {
    await tx.groupOrderSlot.update({
      where: { id: slotId },
      data: { status: GroupSlotStatus.OPEN, claimedBy: null, claimedAt: null },
    })

    if (slot.eventSeatId) {
      await tx.eventSeat.update({
        where: { id: slot.eventSeatId },
        data: { status: EventSeatStatus.HELD }, // stays HELD for the group, not AVAILABLE yet
      })
    }
  })

  await releaseGroupSlotLock(slotId, userId)

  return { success: true }
}

// ─── Cancel the entire group order ───────────────────────────────────────────

export async function cancelGroupOrder(input: unknown): Promise<CancelGroupOrderResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = cancelGroupOrderSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { groupOrderId } = parsed.data
  const { userId } = session

  const order = await db.groupOrder.findUnique({
    where: { id: groupOrderId },
    include: { slots: { select: { id: true, status: true, eventSeatId: true, claimedBy: true } } },
  })

  if (!order) return { success: false, error: 'Group order not found' }
  if (order.initiatorId !== userId)
    return { success: false, error: 'Only the initiator can cancel' }
  if (order.status !== GroupOrderStatus.PENDING) {
    return { success: false, error: `Cannot cancel an order in ${order.status} state` }
  }

  const hasPaidSlots = order.slots.some((s) => s.status === GroupSlotStatus.PAID)
  if (hasPaidSlots) {
    return {
      success: false,
      error: 'Cannot cancel — one or more members have already paid. Contact support.',
    }
  }

  await db.$transaction(async (tx) => {
    // Release all held event seats back to AVAILABLE
    const seatIds = order.slots.filter((s) => s.eventSeatId).map((s) => s.eventSeatId!)

    if (seatIds.length > 0) {
      await tx.eventSeat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: EventSeatStatus.AVAILABLE, lockedUntil: null },
      })
    }

    // Release all slot locks for HELD claimers
    for (const slot of order.slots) {
      if (slot.status === GroupSlotStatus.HELD && slot.claimedBy) {
        await releaseGroupSlotLock(slot.id, slot.claimedBy)
      }
    }

    await tx.groupOrderSlot.updateMany({
      where: { groupOrderId },
      data: { status: GroupSlotStatus.RELEASED },
    })

    await tx.groupOrder.update({
      where: { id: groupOrderId },
      data: { status: GroupOrderStatus.CANCELLED },
    })
  })

  return { success: true }
}
