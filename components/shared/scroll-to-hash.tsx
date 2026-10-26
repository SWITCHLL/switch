'use client'

import { useEffect } from 'react'

/**
 * After hydration, reads the `_scroll` query param and scrolls to the
 * matching element by id, then removes the param from the URL.
 *
 * Why a query param instead of a hash: server-side redirect() in a Server
 * Action performs a client-side RSC navigation — fragments survive — but to
 * be safe we use a plain param that definitely survives all redirect paths.
 *
 * Why not useSearchParams: it requires Suspense wrapping; reading
 * window.location directly in useEffect is simpler and avoids that constraint.
 */
export function ScrollToHash() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const target = params.get('_scroll')
    if (!target) return

    // Remove _scroll from the URL immediately so it doesn't persist on refresh
    params.delete('_scroll')
    const cleanUrl =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : '') +
      window.location.hash
    window.history.replaceState(null, '', cleanUrl)

    // Scroll after a short delay so layout and reveal animations have settled
    const id = setTimeout(() => {
      const el = document.getElementById(target)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)

    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — that's the only time we land from a redirect

  return null
}
