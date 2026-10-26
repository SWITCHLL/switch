/**
 * Stateless Session Management
 *
 * Uses Jose (already installed via next-auth) to sign/verify JWT sessions
 * stored in an HttpOnly cookie. Follows the Next.js 16 auth guide pattern.
 *
 * Revocation: every JWT embeds the user's `sessionVersion`. On sensitive
 * operations (password change, forced logout, suspension) increment
 * `User.sessionVersion` in the DB. `getSession()` rejects any token whose
 * version is lower than the current DB value, invalidating all older tokens.
 *
 * Cookie hardening: the cookie uses the `__Host-` prefix which enforces
 * HTTPS-only delivery, exact host binding, path=/, and no Domain attribute,
 * protecting against subdomain cookie injection.
 */
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export interface SessionPayload {
  userId: string
  email: string
  role: string
  /** Matches User.sessionVersion at the time the session was created. */
  sessionVersion: number
  expiresAt: Date
}

// __Host- prefix: enforces Secure, path=/, no Domain — hardened against
// subdomain cookie injection. Works in both dev (localhost) and production.
const SESSION_COOKIE = '__Host-switch-session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Cookie options shared by create/refresh/delete.
 * __Host- prefix requires: Secure=true, Path=/, no Domain attribute.
 */
function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: true, // required by __Host- prefix
    expires: expiresAt,
    sameSite: 'lax' as const,
    path: '/', // required by __Host- prefix
    // Domain must NOT be set when using __Host- prefix
  }
}

export async function createSession(
  payload: Omit<SessionPayload, 'expiresAt'>
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const token = await encrypt({ ...payload, expiresAt })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt))
}

/**
 * Returns the validated session payload, or null if the token is missing,
 * expired, or the session has been revoked (sessionVersion mismatch).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await decrypt(token)
  if (!payload) return null

  // Revocation check: compare the embedded version against the current DB value.
  // Skip if sessionVersion is undefined (existing tokens before this change).
  if (typeof payload.sessionVersion === 'number') {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { sessionVersion: true },
    })
    if (!user || user.sessionVersion > payload.sessionVersion) {
      return null
    }
  }

  return payload
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    ...cookieOptions(new Date(0)),
    maxAge: 0,
  })
}

/** Refresh the session expiry (call from middleware on each request). */
export async function refreshSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return

  const payload = await decrypt(token)
  if (!payload) return

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const newToken = await encrypt({ ...payload, expiresAt })
  cookieStore.set(SESSION_COOKIE, newToken, cookieOptions(expiresAt))
}

/**
 * Revoke all active sessions for a user by incrementing their sessionVersion.
 * Call this on password change, account suspension, or forced logout.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  })
}
