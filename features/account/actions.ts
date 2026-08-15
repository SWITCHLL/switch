'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ─── Update profile ───────────────────────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const parsed = updateProfileSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  await db.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
  })

  revalidatePath('/dashboard/settings')
  return { success: true, data: undefined }
}
