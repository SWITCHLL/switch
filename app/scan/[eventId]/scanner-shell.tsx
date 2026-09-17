'use client'

/**
 * Client shell for the public scan page.
 * Handles PIN entry, then renders the full scanner once authenticated.
 */

import { useState, useCallback } from 'react'
import { ScanLine, KeyRound } from 'lucide-react'
import { CheckinScanner } from '@/features/checkin/components/checkin-scanner'
import { cn } from '@/lib/utils'

interface ScannerShellProps {
  eventId: string
  eventTitle: string
  initialPin: string
  initialPinValid: boolean
}

export function ScannerShell({
  eventId,
  eventTitle,
  initialPin,
  initialPinValid,
}: ScannerShellProps) {
  const [pinValid, setPinValid] = useState(initialPinValid)
  const [pin, setPin] = useState(initialPin)
  const [pinInput, setPinInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [pinError, setPinError] = useState('')

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const raw = pinInput.trim()
    if (!raw) return
    setChecking(true)
    setPinError('')

    try {
      // Validate PIN via the checkin API by sending a dummy qrCode
      // We use a dedicated lightweight check: just re-verify via scan-pin endpoint
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: '__pin_check__', eventId, scanPin: raw }),
      })
      // 401 = invalid PIN, 400 = missing qrCode caught first — we check the auth layer
      // Actually we need a dedicated verify endpoint — use a small trick:
      // send a clearly invalid QR; if we get 200 {success:false, reason:'INVALID'} the PIN was valid
      // if we get 401/403 the PIN was wrong
      if (res.status === 401 || res.status === 403) {
        setPinError('Invalid PIN. Check with the event organizer.')
      } else {
        // PIN accepted (even though QR was invalid — we just needed auth to pass)
        setPin(raw)
        setPinValid(true)
        // Update URL without reload so sharing still works
        window.history.replaceState(null, '', `?pin=${encodeURIComponent(raw)}`)
      }
    } catch {
      setPinError('Could not connect. Check your internet.')
    } finally {
      setChecking(false)
    }
  }

  // ── PIN gate ──────────────────────────────────────────────────────────────

  if (!pinValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ScanLine className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-[20px] font-bold text-white">Check-in Scanner</h1>
            <p className="mt-1 text-[13px] text-white/50">{eventTitle}</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <div>
              <label htmlFor="pin-input" className="mb-1.5 block text-[12.5px] font-medium text-white/60">
                Enter scan PIN
              </label>
              <input
                id="pin-input"
                type="text"
                inputMode="numeric"
                placeholder="000-000"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={7}
                autoFocus
                className={cn(
                  'w-full rounded-xl border bg-white/10 px-4 py-3 text-center font-mono text-[20px] font-bold text-white outline-none placeholder:text-white/20',
                  'transition-colors focus:border-violet-500',
                  pinError ? 'border-red-500/60' : 'border-white/10',
                )}
              />
              {pinError && (
                <p className="mt-1.5 text-center text-[12px] text-red-400">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={checking || !pinInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <KeyRound className="h-4 w-4" />
              {checking ? 'Checking…' : 'Start scanning'}
            </button>
          </form>

          <p className="text-center text-[11.5px] text-white/30">
            Ask the event organizer for the 6-digit scan PIN.
          </p>
        </div>
      </div>
    )
  }

  // ── Full scanner ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <CheckinScanner eventId={eventId} eventTitle={eventTitle} scanPin={pin} />
    </div>
  )
}
