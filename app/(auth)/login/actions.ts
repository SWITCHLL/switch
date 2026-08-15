'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createOtp, verifyOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { createSession } from '@/lib/session'
import { db } from '@/lib/db'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
})

const otpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type SendOtpState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }

export type VerifyOtpState =
  { status: 'idle' } | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Step 1 — Send OTP
 * Validates the email, upserts the user, generates an OTP, and sends it.
 */
export async function sendOtpAction(
  _prev: SendOtpState,
  formData: FormData
): Promise<SendOtpState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the errors below.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email } = parsed.data

  try {
    // Upsert user — create if first time, otherwise just ensure they exist
    await db.user.upsert({
      where: { email },
      update: {}, // nothing to update
      create: { email },
    })

    const otp = await createOtp(email)
    await sendOtpEmail(email, otp)

    return { status: 'success', email }
  } catch (err) {
    console.error('[sendOtpAction]', err)
    return { status: 'error', message: 'Failed to send the code. Please try again.' }
  }
}

/**
 * Step 2 — Verify OTP & create session
 * Validates the submitted code; on success sets a session cookie and redirects.
 */
export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  const parsed = otpSchema.safeParse({
    email: formData.get('email'),
    otp: formData.get('otp'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the errors below.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, otp } = parsed.data

  try {
    const result = await verifyOtp(email, otp)

    if (!result.success) {
      return {
        status: 'error',
        message:
          result.error === 'expired'
            ? 'Your code has expired. Please request a new one.'
            : 'Invalid code. Please check and try again.',
      }
    }

    // Load the user to get their id + role for the session token
    const user = await db.user.findUniqueOrThrow({ where: { email } })

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (err) {
    console.error('[verifyOtpAction]', err)
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }

  // Redirect outside the try/catch — redirect() throws internally
  redirect('/dashboard')
}
