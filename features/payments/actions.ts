'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { PaymentStatus, PayoutStatus, RefundStatus } from '@/app/generated/prisma/client'
import { z } from 'zod'
import { randomBytes } from 'crypto'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

const PAYOUT_HOLD_HOURS = 48
const REFUND_WINDOW_HOURS = 48

// ─── Save organizer bank account ──────────────────────────────────────────────

const bankAccountSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
})

export async function saveBankAccount(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = bankAccountSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }

  // Verify account name via Paystack
  let accountName: string
  try {
    const result = await paystack.verifyBankAccount({
      account_number: parsed.data.accountNumber,
      bank_code: parsed.data.bankCode,
    })
    accountName = result.account_name
  } catch {
    return { success: false, error: 'Could not verify bank account. Please check the details.' }
  }

  await db.organizer.update({
    where: { id: organizer.id },
    data: {
      bankCode: parsed.data.bankCode,
      bankAccountNumber: parsed.data.accountNumber,
      bankAccountName: accountName,
    },
  })

  revalidatePath('/dashboard/settings')
  return { success: true, data: undefined }
}

// ─── Request payout ───────────────────────────────────────────────────────────

export async function requestPayout(eventId: string): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true, bankCode: true, bankAccountNumber: true, bankAccountName: true },
  })
  if (!organizer) return { success: false, error: 'Not an organizer' }
  if (!organizer.bankAccountNumber) {
    return {
      success: false,
      error: 'Please add your bank account details before requesting a payout',
    }
  }

  // Load event + verify ownership
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, title: true, endsAt: true, status: true },
  })
  if (!event) return { success: false, error: 'Event not found' }

  // Payout is only available 48h after event ends
  const endsAt = event.endsAt
  if (!endsAt) {
    return { success: false, error: 'Event has no end date — payout cannot be processed' }
  }
  const payoutEligibleAt = new Date(endsAt.getTime() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000)
  if (new Date() < payoutEligibleAt) {
    const hoursLeft = Math.ceil((payoutEligibleAt.getTime() - Date.now()) / (60 * 60 * 1000))
    return {
      success: false,
      error: `Payout available in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} (48h after event ends)`,
    }
  }

  // Check for existing payout request
  const existingRequest = await db.payoutRequest.findFirst({
    where: { organizerId: organizer.id, eventId },
  })
  if (existingRequest) {
    return {
      success: false,
      error: `A payout request already exists (status: ${existingRequest.status})`,
    }
  }

  // Sum all successful payments for this event / organizer
  const payments = await db.payment.findMany({
    where: {
      eventId,
      organizerId: organizer.id,
      status: PaymentStatus.SUCCESS,
      payoutRequestId: null, // not already in a payout
    },
    select: { id: true, amount: true, platformFeeAmount: true, netAmount: true, currency: true },
  })

  if (payments.length === 0) {
    return { success: false, error: 'No eligible payments found for this event' }
  }

  const grossAmount = payments.reduce((s, p) => s + p.amount, 0)
  const totalFees = payments.reduce((s, p) => s + p.platformFeeAmount, 0)
  const netAmount = payments.reduce((s, p) => s + p.netAmount, 0)
  const currency = payments[0]!.currency

  const payoutRequest = await db.$transaction(async (tx) => {
    const pr = await tx.payoutRequest.create({
      data: {
        organizerId: organizer.id,
        eventId,
        grossAmount,
        totalFees,
        netAmount,
        currency,
        status: PayoutStatus.PENDING,
      },
    })

    // Link payments to this payout request
    await tx.payment.updateMany({
      where: { id: { in: payments.map((p) => p.id) } },
      data: { payoutRequestId: pr.id },
    })

    return pr
  })

  revalidatePath('/dashboard/payouts')
  return { success: true, data: { id: payoutRequest.id } }
}

// ─── Admin: approve payout + initiate transfer ────────────────────────────────

export async function approvePayout(payoutRequestId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const pr = await db.payoutRequest.findUnique({
    where: { id: payoutRequestId },
    include: {
      organizer: {
        select: { name: true, bankCode: true, bankAccountNumber: true, bankAccountName: true },
      },
    },
  })
  if (!pr) return { success: false, error: 'Payout request not found' }
  if (pr.status !== PayoutStatus.PENDING) {
    return { success: false, error: `Cannot approve a payout in status: ${pr.status}` }
  }
  if (!pr.organizer.bankAccountNumber || !pr.organizer.bankCode) {
    return { success: false, error: 'Organizer has no bank account on file' }
  }

  // Create Paystack transfer recipient
  let recipientCode: string
  try {
    const recipient = await paystack.createTransferRecipient({
      type: 'nuban',
      name: pr.organizer.bankAccountName ?? pr.organizer.name,
      account_number: pr.organizer.bankAccountNumber,
      bank_code: pr.organizer.bankCode,
      currency: pr.currency,
    })
    recipientCode = recipient.recipient_code
  } catch (err) {
    return {
      success: false,
      error: `Failed to create transfer recipient: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }

  // Initiate transfer
  let transferCode: string
  try {
    const transfer = await paystack.initiateTransfer({
      source: 'balance',
      amount: pr.netAmount,
      recipient: recipientCode,
      reason: `SWITCH payout - event ${pr.eventId}`,
      reference: `PAYOUT-${pr.id}-${randomBytes(4).toString('hex')}`,
    })
    transferCode = transfer.transfer_code
  } catch (err) {
    return {
      success: false,
      error: `Failed to initiate transfer: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }

  await db.payoutRequest.update({
    where: { id: payoutRequestId },
    data: {
      status: PayoutStatus.PROCESSING,
      paystackRecipientCode: recipientCode,
      paystackTransferCode: transferCode,
      reviewedBy: session.userId,
      reviewedAt: new Date(),
    },
  })

  revalidatePath('/dashboard/admin/payouts')
  return { success: true, data: undefined }
}

// ─── Admin: reject payout ─────────────────────────────────────────────────────

export async function rejectPayout(payoutRequestId: string, reason: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  await db.payoutRequest.update({
    where: { id: payoutRequestId },
    data: {
      status: PayoutStatus.REJECTED,
      reviewNote: reason,
      reviewedBy: session.userId,
      reviewedAt: new Date(),
    },
  })

  revalidatePath('/dashboard/admin/payouts')
  return { success: true, data: undefined }
}

// ─── Submit event review ──────────────────────────────────────────────────────

const reviewSchema = z.object({
  ticketId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
})

export async function submitReview(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { ticketId, rating, body } = parsed.data

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId, userId: session.userId },
    include: {
      event: { select: { id: true, endsAt: true, startsAt: true } },
      review: true,
    },
  })

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.review) return { success: false, error: 'You have already reviewed this event' }

  const eventEnd = ticket.event.endsAt ?? ticket.event.startsAt
  if (new Date() < eventEnd) {
    return { success: false, error: 'Reviews can only be submitted after the event has ended' }
  }

  await db.eventReview.create({
    data: {
      eventId: ticket.event.id,
      userId: session.userId,
      ticketId,
      rating,
      body: body ?? null,
    },
  })

  revalidatePath(`/events/${ticket.eventId}`)
  return { success: true, data: undefined }
}

// ─── Organizer reply to review ────────────────────────────────────────────────

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().min(1).max(1000),
})

export async function replyToReview(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = replySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { reviewId, reply } = parsed.data

  const review = await db.eventReview.findUnique({
    where: { id: reviewId },
    include: { event: { select: { organizerId: true } } },
  })
  if (!review) return { success: false, error: 'Review not found' }

  const organizer = await db.organizer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  if (!organizer || review.event.organizerId !== organizer.id) {
    return { success: false, error: 'Unauthorized' }
  }

  await db.eventReview.update({
    where: { id: reviewId },
    data: { reply, replyAt: new Date() },
  })

  return { success: true, data: undefined }
}

// ─── Submit refund request ────────────────────────────────────────────────────

const refundRequestSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().min(10, 'Please provide at least 10 characters').max(2000),
})

export async function submitRefundRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = refundRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { paymentId, reason } = parsed.data

  const payment = await db.payment.findUnique({
    where: { id: paymentId, userId: session.userId, status: PaymentStatus.SUCCESS },
    include: {
      event: { select: { endsAt: true, startsAt: true, id: true } },
      refundRequest: true,
    },
  })

  if (!payment) return { success: false, error: 'Payment not found' }
  if (payment.refundRequest) {
    return { success: false, error: 'A refund request already exists for this payment' }
  }

  // Refund window: 48h after event ends
  const eventEnd = payment.event.endsAt ?? payment.event.startsAt
  const refundDeadline = new Date(eventEnd.getTime() + REFUND_WINDOW_HOURS * 60 * 60 * 1000)
  if (new Date() > refundDeadline) {
    return { success: false, error: 'The 48-hour refund window has closed for this event' }
  }

  await db.refundRequest.create({
    data: {
      paymentId,
      userId: session.userId,
      eventId: payment.eventId,
      reason,
    },
  })

  revalidatePath('/dashboard/tickets')
  return { success: true, data: undefined }
}

// ─── Admin: approve refund ────────────────────────────────────────────────────

export async function approveRefund(refundRequestId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const rr = await db.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      payment: { select: { amount: true, paystackTransactionId: true, paystackReference: true } },
    },
  })
  if (!rr) return { success: false, error: 'Refund request not found' }
  if (rr.status !== RefundStatus.OPEN && rr.status !== RefundStatus.UNDER_REVIEW) {
    return { success: false, error: `Cannot approve refund in status: ${rr.status}` }
  }

  const transactionRef = rr.payment.paystackTransactionId ?? rr.payment.paystackReference
  if (!transactionRef) {
    return { success: false, error: 'No Paystack transaction reference on file' }
  }

  let paystackRefundId: string
  try {
    const refund = await paystack.refundTransaction({ transaction: transactionRef })
    paystackRefundId = String(refund.id)
  } catch (err) {
    return {
      success: false,
      error: `Paystack refund failed: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }

  await db.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundStatus.APPROVED,
        paystackRefundId,
        reviewedBy: session.userId,
        reviewedAt: new Date(),
      },
    })

    await tx.payment.update({
      where: { id: rr.paymentId },
      data: { status: PaymentStatus.REFUNDED },
    })

    await tx.ticket.update({
      where: { id: rr.payment.paystackReference ?? '' },
      data: { status: 'REFUNDED' },
    })
  })

  revalidatePath('/dashboard/admin/refunds')
  return { success: true, data: undefined }
}

// ─── Admin: reject refund ─────────────────────────────────────────────────────

export async function rejectRefund(refundRequestId: string, note: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  await db.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      status: RefundStatus.REJECTED,
      reviewNote: note,
      reviewedBy: session.userId,
      reviewedAt: new Date(),
    },
  })

  revalidatePath('/dashboard/admin/refunds')
  return { success: true, data: undefined }
}
