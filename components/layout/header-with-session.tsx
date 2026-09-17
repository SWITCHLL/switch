import { getSession } from '@/lib/session'
import { SiteHeader } from './site-header'

/**
 * Async server component that reads the session cookie at request time.
 * Rendered inside a <Suspense> boundary so it's never baked into a
 * prerendered/cached shell — guarantees the header always reflects the
 * current auth state (e.g. after logout).
 */
export async function HeaderWithSession() {
  const session = await getSession()
  return <SiteHeader userEmail={session?.email} />
}
