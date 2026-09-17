'use client'

import { useState, useCallback } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitRsvp } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RsvpButtonProps {
  eventId: string
  ticketTypeId: string
  /** Number of tickets to register for. Defaults to 1. */
  quantity?: number
  /** Display label. Defaults to "Register for free". */
  label?: string
  /** Additional class names for the button element. */
  className?: string
  /** Called after a successful RSVP with the issued ticket IDs. */
  onSuccess?: (ticketIds: string[]) => void
}

// ─── Simple in-page toast ─────────────────────────────────────────────────────

function showToast(message: string, type: 'success' | 'error') {
  const portal = document.getElementById('toaster-portal')
  if (!portal) return

  const toast = document.createElement('div')
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')

  const isSuccess = type === 'success'
  toast.className = cn(
    'pointer-events-auto flex w-full items-center gap-3 rounded-xl border px-4 py-3 shadow-lg',
    'text-[13px] font-medium transition-all',
    isSuccess
      ? 'border-emerald-500/30 bg-[#0a1a12] text-emerald-400'
      : 'border-red-500/30 bg-[#1a0a0a] text-red-400'
  )
  toast.innerHTML = `
    <span class="shrink-0">
      ${
        isSuccess
          ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      }
    </span>
    <span>${message}</span>
  `

  portal.appendChild(toast)

  // Fade out after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(8px)'
    toast.style.transition = 'opacity 300ms, transform 300ms'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RsvpButton({
  eventId,
  ticketTypeId,
  quantity = 1,
  label = 'Register for free',
  className,
  onSuccess,
}: RsvpButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRsvp = useCallback(async () => {
    if (isLoading || isSuccess) return

    setError(null)
    setIsLoading(true)

    try {
      const result = await submitRsvp({ eventId, ticketTypeId, quantity })

      if (result.success) {
        setIsSuccess(true)
        showToast(
          `You're registered! Check your email for your ticket${quantity !== 1 ? 's' : ''}.`,
          'success'
        )
        onSuccess?.(result.ticketIds)
      } else {
        setError(result.error === 'UNAUTHENTICATED' ? 'Sign in to register' : result.error)
        showToast(
          result.error === 'UNAUTHENTICATED' ? 'Sign in to register for this event' : result.error,
          'error'
        )
      }
    } catch {
      const msg = 'Something went wrong. Please try again.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, ticketTypeId, quantity, isLoading, isSuccess, onSuccess])

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRsvp}
        disabled={isLoading || isSuccess}
        aria-busy={isLoading}
        aria-label={isSuccess ? 'You are registered' : label}
        className={cn(
          'relative flex w-full items-center justify-center gap-2 rounded-xl py-3.5',
          'text-[15px] font-semibold text-white transition-all',
          isSuccess
            ? 'cursor-default bg-emerald-600/80'
            : isLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90 active:scale-[0.98]',
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Registering…</span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Registered</span>
          </>
        ) : (
          <>
            <Ticket className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Inline error display */}
      {error && !isSuccess && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-500"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
