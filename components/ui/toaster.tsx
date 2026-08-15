'use client'

/**
 * Simple toast notification container.
 * Uses the browser's native toast-like behavior via a portal.
 * Replace with a full Radix/shadcn Toast implementation when needed.
 */

export function Toaster() {
  return (
    <div
      id="toaster-portal"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-0 bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]"
    />
  )
}
