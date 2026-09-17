/**
 * BullMQ Queue definitions.
 *
 * Import the queue you need from here — do NOT instantiate Queue inline.
 * This module is safe to import in Next.js server components / actions.
 */
import 'server-only'
import { Queue } from 'bullmq'
import { redis } from './redis'
import type { GroupExpiryJobData } from '@/workers/group-expiry.worker'
import type { ReservationExpiryJobData } from '@/workers/reservation-expiry.worker'

// ─── Waitlist Expiry Queue ────────────────────────────────────────────────────

export interface WaitlistExpiryJobData {
  waitlistEntryId: string
}

// ─── Group Order Expiry Queue ─────────────────────────────────────────────────

const GROUP_EXPIRY_QUEUE = 'group-expiry'

let _groupExpiryQueue: Queue<GroupExpiryJobData> | null = null

export function getGroupExpiryQueue(): Queue<GroupExpiryJobData> {
  if (!_groupExpiryQueue) {
    _groupExpiryQueue = new Queue<GroupExpiryJobData>(GROUP_EXPIRY_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    })
  }
  return _groupExpiryQueue
}

/**
 * Schedule a group order expiry job to fire at the given date.
 * If the order is already expired (date in the past), fires immediately.
 */
export async function scheduleGroupExpiry(groupOrderId: string, expiresAt: Date): Promise<string> {
  const queue = getGroupExpiryQueue()
  const delay = Math.max(0, expiresAt.getTime() - Date.now())
  const job = await queue.add(
    'expire',
    { groupOrderId },
    {
      delay,
      jobId: `group-expiry-${groupOrderId}`, // idempotent — won't duplicate
    }
  )
  return job.id ?? groupOrderId
}

// ─── Reservation Expiry Queue ─────────────────────────────────────────────────

const RESERVATION_EXPIRY_QUEUE = 'reservation-expiry'

let _reservationExpiryQueue: Queue<ReservationExpiryJobData> | null = null

export function getReservationExpiryQueue(): Queue<ReservationExpiryJobData> {
  if (!_reservationExpiryQueue) {
    _reservationExpiryQueue = new Queue<ReservationExpiryJobData>(RESERVATION_EXPIRY_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    })
  }
  return _reservationExpiryQueue
}

/**
 * Schedule a reservation expiry job to fire when the reservation times out.
 * Idempotent — won't create a duplicate job for the same reservationId.
 */
export async function scheduleReservationExpiry(
  reservationId: string,
  expiresAt: Date
): Promise<string> {
  const queue = getReservationExpiryQueue()
  const delay = Math.max(0, expiresAt.getTime() - Date.now())
  const job = await queue.add(
    'expire',
    { reservationId },
    {
      delay,
      jobId: `reservation-expiry-${reservationId}`,
    }
  )
  return job.id ?? reservationId
}

const WAITLIST_EXPIRY_QUEUE = 'waitlist-expiry'

let _waitlistExpiryQueue: Queue<WaitlistExpiryJobData> | null = null

export function getWaitlistExpiryQueue(): Queue<WaitlistExpiryJobData> {
  if (!_waitlistExpiryQueue) {
    _waitlistExpiryQueue = new Queue<WaitlistExpiryJobData>(WAITLIST_EXPIRY_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    })
  }
  return _waitlistExpiryQueue
}

/**
 * Schedule a waitlist offer expiry job to fire when the offer window closes.
 * Idempotent — uses job ID `waitlist-expiry-{waitlistEntryId}`.
 */
export async function scheduleWaitlistExpiry(
  waitlistEntryId: string,
  offerExpiresAt: Date
): Promise<string> {
  const queue = getWaitlistExpiryQueue()
  const delay = Math.max(0, offerExpiresAt.getTime() - Date.now())
  const job = await queue.add(
    'expire',
    { waitlistEntryId },
    {
      delay,
      jobId: `waitlist-expiry-${waitlistEntryId}`,
    }
  )
  return job.id ?? waitlistEntryId
}

// ─── Event Reminder Queue ─────────────────────────────────────────────────────

const EVENT_REMINDER_QUEUE = 'event-reminder'

interface EventReminderJobData {
  eventId: string
  userId: string
  ticketId: string
}

let _eventReminderQueue: Queue<EventReminderJobData> | null = null

function getEventReminderQueue(): Queue<EventReminderJobData> {
  if (!_eventReminderQueue) {
    _eventReminderQueue = new Queue<EventReminderJobData>(EVENT_REMINDER_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    })
  }
  return _eventReminderQueue
}

/**
 * Schedule an event reminder job to fire 24 hours before the event starts.
 * Idempotent — uses job ID `event-reminder-{eventId}-{userId}`.
 * Processed by workers/event-reminder.worker.ts.
 */
export async function scheduleEventReminder(
  eventId: string,
  userId: string,
  ticketId: string,
  eventStartsAt: Date
): Promise<void> {
  const queue = getEventReminderQueue()
  const reminderAt = new Date(eventStartsAt.getTime() - 24 * 60 * 60 * 1000)
  const delay = Math.max(0, reminderAt.getTime() - Date.now())
  await queue.add(
    'remind',
    { eventId, userId, ticketId },
    {
      delay,
      jobId: `event-reminder-${eventId}-${userId}`,
    }
  )
}
