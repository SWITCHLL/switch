'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { submitApplicationSchema } from './schemas'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Submit KYC application ───────────────────────────────────────────────────

export async function submitOrganizerApplication(
  formData: FormData
): Promise<ActionResult<{ applicationId: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  // Already an organizer or admin
  if (session.role === 'ORGANIZER' || session.role === 'ADMIN') {
    return { success: false, error: 'You already have organizer access' }
  }

  // Check for an existing application
  const existing = await db.organizerApplication.findUnique({
    where: { userId: session.userId },
    select: { id: true, kycStatus: true },
  })

  if (existing) {
    if (existing.kycStatus === 'PENDING' || existing.kycStatus === 'UNDER_REVIEW') {
      return { success: false, error: 'You already have a pending application' }
    }
    if (existing.kycStatus === 'APPROVED') {
      return { success: false, error: 'Your application has already been approved' }
    }
    // REJECTED — allow resubmission
  }

  const raw = Object.fromEntries(formData)
  const parsed = submitApplicationSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      success: false,
      error: first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input',
    }
  }

  const {
    organizerName,
    bio,
    nin,
    bvn,
    idType,
    idDocUrl,
    instagramUrl,
    twitterUrl,
    facebookUrl,
    websiteUrl,
  } = parsed.data

  let application

  if (existing) {
    // Resubmission after rejection — update the existing record
    application = await db.organizerApplication.update({
      where: { userId: session.userId },
      data: {
        organizerName,
        bio,
        nin,
        bvn,
        idType,
        idDocUrl,
        instagramUrl,
        twitterUrl,
        facebookUrl,
        websiteUrl,
        kycStatus: 'PENDING',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      select: { id: true },
    })
  } else {
    application = await db.organizerApplication.create({
      data: {
        userId: session.userId,
        organizerName,
        bio,
        nin,
        bvn,
        idType,
        idDocUrl,
        instagramUrl,
        twitterUrl,
        facebookUrl,
        websiteUrl,
      },
      select: { id: true },
    })
  }

  revalidatePath('/dashboard/become-organizer')
  return { success: true, data: { applicationId: application.id } }
}
