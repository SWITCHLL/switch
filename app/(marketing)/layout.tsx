import type { ReactNode } from 'react'

/**
 * Marketing layout — wraps public pages like /events, /about, /blog.
 * The root layout already provides fonts, metadata, and providers.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
