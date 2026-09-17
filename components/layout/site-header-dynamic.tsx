/**
 * Lazy wrapper for SiteHeader.
 *
 * SiteHeader is 'use client' and brings framer-motion + lucide-react into its
 * CSS chunk. Importing it statically puts that chunk in the critical render
 * path as a render-blocking <link rel="stylesheet">. Wrapping it with
 * next/dynamic defers the chunk so it loads after the initial paint without
 * blocking LCP.
 *
 * ssr: true keeps server-side rendering (the initial HTML still includes the
 * header markup), only the *stylesheet chunk* is moved out of the critical path.
 *
 * Import this instead of '@/components/layout/site-header' in all page files.
 */
import dynamic from 'next/dynamic'

export const SiteHeader = dynamic(
  () => import('./site-header').then((m) => m.SiteHeader),
  { ssr: true }
)
