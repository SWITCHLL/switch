/**
 * OTP (One-Time Password) Utilities
 *
 * OTPs are stored in the `VerificationToken` table (already in the Prisma schema).
 * The `identifier` field stores the email, `token` stores the hashed OTP, and
 * `expires` enforces the 10-minute TTL.
 *
 * We hash the OTP before storing it to prevent leakage if the DB is compromised.
 */
import 'server-only'
import { createHash, randomInt } from 'crypto'
import { db } from '@/lib/db'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_LENGTH = 6

/** Generate a cryptographically random 6-digit OTP string. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0')
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

/**
 * Persist a new OTP for the given email, invalidating any previous one.
 * Returns the plain-text OTP so it can be emailed.
 */
export async function createOtp(email: string): Promise<string> {
  const otp = generateOtp()
  const expires = new Date(Date.now() + OTP_TTL_MS)

  // Delete any existing token for this email first
  await db.verificationToken.deleteMany({ where: { identifier: email } })

  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashOtp(otp),
      expires,
    },
  })

  return otp
}

export type VerifyOtpResult =
  { success: true; email: string } | { success: false; error: 'invalid' | 'expired' }

/** Verify the submitted OTP. Deletes the token on success or expiry. */
export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpResult> {
  const record = await db.verificationToken.findFirst({
    where: { identifier: email },
  })

  if (!record) {
    return { success: false, error: 'invalid' }
  }

  // Check expiry
  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token: record.token } })
    return { success: false, error: 'expired' }
  }

  // Constant-time comparison via hashing
  const expectedHash = hashOtp(otp.trim())
  if (record.token !== expectedHash) {
    return { success: false, error: 'invalid' }
  }

  // Consume the token
  await db.verificationToken.delete({ where: { token: record.token } })

  return { success: true, email }
}
