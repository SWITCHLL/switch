'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { unlockPasswordProtectedTicket } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordUnlockModalProps {
  /** The ticket type being unlocked */
  ticketTypeId: string
  /** Human-readable name of the ticket type (shown in the modal heading) */
  ticketTypeName: string
  /** Whether the modal is currently open */
  open: boolean
  /** Called when the user closes the modal without unlocking */
  onClose: () => void
  /** Called after a successful unlock — parent can reveal the ticket type */
  onUnlocked: (ticketTypeId: string, sessionToken: string) => void
}

// ─── sessionStorage key helper ────────────────────────────────────────────────

export const SESSION_TOKEN_KEY = (ticketTypeId: string) =>
  `ticket-unlock-token:${ticketTypeId}`

/**
 * Reads a stored session token from sessionStorage for the given ticketTypeId.
 * Returns null if not found or if sessionStorage is unavailable.
 */
export function getStoredSessionToken(ticketTypeId: string): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY(ticketTypeId))
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PasswordUnlockModal({
  ticketTypeId,
  ticketTypeName,
  open,
  onClose,
  onUnlocked,
}: PasswordUnlockModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens / closes
  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      setIsSuccess(false)
      setShowPassword(false)
      // Focus the password input after the modal mounts
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (isLoading || isSuccess || !password.trim()) return

      setError(null)
      setIsLoading(true)

      try {
        const result = await unlockPasswordProtectedTicket({ ticketTypeId, password })

        if (result.success) {
          // Persist the token so it survives client-side navigation within this tab
          try {
            sessionStorage.setItem(SESSION_TOKEN_KEY(ticketTypeId), result.sessionToken)
          } catch {
            // sessionStorage unavailable (e.g. private browsing with restrictions) — no-op
          }

          setIsSuccess(true)

          // Brief success flash then signal parent
          setTimeout(() => {
            onUnlocked(ticketTypeId, result.sessionToken)
            onClose()
          }, 800)
        } else {
          setError(
            result.error === 'INVALID_PASSWORD'
              ? 'Incorrect password. Please try again.'
              : 'Unable to unlock. Please try again.'
          )
        }
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [ticketTypeId, password, isLoading, isSuccess, onUnlocked, onClose]
  )

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isLoading, onClose])

  if (!open) return null

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => { if (!isLoading) onClose() }}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e12] p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-white/40 transition hover:text-white/80 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Icon + heading */}
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/20">
            <Lock className="h-5 w-5 text-violet-400" aria-hidden="true" />
          </div>
          <div>
            <h2 id="unlock-modal-title" className="text-base font-semibold text-white">
              Password required
            </h2>
            <p className="mt-1 text-[13px] text-white/50">
              Enter the access password to unlock{' '}
              <span className="font-medium text-white/70">{ticketTypeName}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="unlock-password" className="sr-only">
              Access password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="unlock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Enter password"
                disabled={isLoading || isSuccess}
                autoComplete="off"
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'unlock-error' : undefined}
                className={cn(
                  'w-full rounded-xl border bg-white/5 py-3 pl-4 pr-11 text-sm text-white',
                  'placeholder:text-white/30 focus:outline-none focus:ring-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  error
                    ? 'border-red-500/50 focus:ring-red-500/40'
                    : 'border-white/10 focus:ring-violet-500/50'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white/70 disabled:pointer-events-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Inline error */}
            {error && (
              <div
                id="unlock-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-[12px] text-red-400"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isSuccess || !password.trim()}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
              isSuccess
                ? 'cursor-default bg-emerald-600/80'
                : isLoading || !password.trim()
                  ? 'cursor-not-allowed bg-white/10 text-white/40'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 active:scale-[0.98]'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Verifying…</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Unlocked!</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Unlock ticket</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
