import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

/**
 * Auth layout — wraps /login (and any future /signup, /forgot-password etc.)
 * Redirects already-authenticated users away from auth pages.
 */

// Auth pages read cookies to check session — must be dynamic.
export const dynamic = 'force-dynamic'

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
