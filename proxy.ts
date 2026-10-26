import { type NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

/**
 * Next.js Proxy (formerly middleware) — runs before every matched request.
 *
 * Responsibilities:
 *  1. Redirect unauthenticated users away from protected routes to /login.
 *  2. Redirect authenticated users away from auth routes (e.g. /login) to /dashboard.
 *
 * NOTE: Full revocation checking (sessionVersion DB lookup) happens inside
 * getSession() in server components/actions — the proxy runtime doesn't have
 * direct DB access. The proxy provides the first fast gate; per-action checks
 * enforce the revocation invariant.
 */

/** Routes that require a valid session. */
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/profile', '/events/manage']

/** Routes that authenticated users should be bounced away from. */
const AUTH_ROUTES = ['/login']

// Must match SESSION_COOKIE in lib/session.ts exactly.
const SESSION_COOKIE = '__Host-switch-session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Fast path — nothing to check for fully public routes
  if (!isProtected && !isAuthRoute) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await decrypt(token) : null

  // Unauthenticated user hitting a protected route → redirect to login
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user hitting an auth route → redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, site.webmanifest
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon|site\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff2?)).*)',
  ],
}
