'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { PaymentStatus, TicketStatus } from '@/app/generated/prisma/client'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Approve KYC application ──────────────────────────────────────────────────

export async function approveKycApplication(
  applicationId: string,
  note?: string
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const application = await db.organizerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, organizerName: true, bio: true, kycStatus: true },
  })
  if (!application) return { success: false, error: 'Application not found' }
  if (application.kycStatus === 'APPROVED') {
    return { success: false, error: 'Application already approved' }
  }

  // Check if organizer record already exists
  const existing = await db.organizer.findUnique({
    where: { userId: application.userId },
    select: { id: true },
  })

  await db.$transaction(async (tx) => {
    // Update application status
    await tx.organizerApplication.update({
      where: { id: applicationId },
      data: {
        kycStatus: 'APPROVED',
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: session.userId,
      },
    })

    // Promote user role to ORGANIZER
    await tx.user.update({
      where: { id: application.userId },
      data: { role: 'ORGANIZER' },
    })

    if (!existing) {
      // Create organizer profile using the application's name
      const baseSlug = application.organizerName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Ensure slug uniqueness
      let slug = baseSlug
      let suffix = 1
      while (await tx.organizer.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix++}`
      }

      await tx.organizer.create({
        data: {
          userId: application.userId,
          name: application.organizerName,
          slug,
          bio: application.bio ?? null,
          status: 'ACTIVE',
        },
      })
    } else {
      // Existing organizer record — make active
      await tx.organizer.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      })
    }
  })

  revalidatePath('/dashboard/admin/kyc')
  return { success: true, data: undefined }
}

// ─── Reject KYC application ───────────────────────────────────────────────────

export async function rejectKycApplication(
  applicationId: string,
  note: string
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  if (!note.trim()) return { success: false, error: 'Rejection reason is required' }

  const application = await db.organizerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, kycStatus: true },
  })
  if (!application) return { success: false, error: 'Application not found' }

  await db.organizerApplication.update({
    where: { id: applicationId },
    data: {
      kycStatus: 'REJECTED',
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedBy: session.userId,
    },
  })

  revalidatePath('/dashboard/admin/kyc')
  return { success: true, data: undefined }
}

// ─── Mark refund request as under review ─────────────────────────────────────

export async function markRefundUnderReview(refundRequestId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  await db.refundRequest.update({
    where: { id: refundRequestId },
    data: { status: 'UNDER_REVIEW' },
  })

  revalidatePath('/dashboard/admin/refunds')
  return { success: true, data: undefined }
}

// ─── Admin: refund a paid group slot ──────────────────────────────────────────

/**
 * Issues a Paystack refund for a single paid GroupOrderSlot.
 * Updates the payment → REFUNDED, the ticket → REFUNDED, and the slot → RELEASED.
 * Safe to call multiple times — idempotent once the payment is already REFUNDED.
 */
export async function refundGroupSlot(slotId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }
  if (session.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    include: {
      payment: {
        select: {
          id: true,
          status: true,
          paystackTransactionId: true,
          paystackReference: true,
        },
      },
      ticket: { select: { id: true, status: true } },
    },
  })

  if (!slot) return { success: false, error: 'Slot not found' }
  if (slot.status !== 'PAID') {
    return { success: false, error: `Slot is not in PAID state (current: ${slot.status})` }
  }
  if (!slot.payment) {
    return { success: false, error: 'No payment record linked to this slot' }
  }

  // Idempotency: already refunded
  if (slot.payment.status === 'REFUNDED') {
    return { success: false, error: 'This slot has already been refunded' }
  }

  const transactionRef =
    slot.payment.paystackTransactionId ?? slot.payment.paystackReference
  if (!transactionRef) {
    return { success: false, error: 'No Paystack transaction reference on file for this payment' }
  }

  // Initiate Paystack refund
  let paystackRefundId: string
  try {
    const refund = await paystack.refundTransaction({ transaction: transactionRef })
    paystackRefundId = String(refund.id)
  } catch (err) {
    return {
      success: false,
      error: `Paystack refund failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  // Update DB atomically
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: slot.payment!.id },
      data: { status: PaymentStatus.REFUNDED },
    })

    if (slot.ticket) {
      await tx.ticket.update({
        where: { id: slot.ticket.id },
        data: { status: TicketStatus.REFUNDED },
      })
    }

    await tx.groupOrderSlot.update({
      where: { id: slotId },
      data: { status: 'RELEASED' },
    })
  })

  console.info(
    `[admin] group slot ${slotId} refunded — paystackRefundId: ${paystackRefundId}`
  )

  revalidatePath('/dashboard/admin/groups')
  return { success: true, data: undefined }
}
