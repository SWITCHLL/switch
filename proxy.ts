import { type NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

/**
 * Protected routes — any path that starts with these prefixes requires auth.
 * Add more as the app grows.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/profile', '/events/manage']

/** Routes that authenticated users should be bounced away from. */
const AUTH_ROUTES = ['/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Fast path — nothing to check for public routes
  if (!isProtected && !isAuthRoute) return NextResponse.next()

  const token = request.cookies.get('switch-session')?.value
  const session = token ? await decrypt(token) : null

  // Unauthenticated user hitting a protected route → send to login
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user hitting an auth route → send to dashboard
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
