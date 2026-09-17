'use client'

/**
 * Scan PIN manager — shown on the manage event page.
 * Lets the organizer generate/rotate/revoke a scan PIN and share the URL.
 */

import { useState } from 'react'
import { ScanLine, RefreshCw, Trash2, Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanPinManagerProps {
  eventId: string
  appUrl: string
}

export function ScanPinManager({ eventId, appUrl }: ScanPinManagerProps) {
  const [pin, setPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const scanUrl = pin
    ? `${appUrl}/scan/${eventId}?pin=${encodeURIComponent(pin)}`
    : null

  async function generatePin() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/scan-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      if (!res.ok) throw new Error('Failed to generate PIN')
      const data = (await res.json()) as { pin: string }
      setPin(data.pin)
    } catch {
      setError('Could not generate PIN. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function revokePin() {
    setLoading(true)
    setError('')
    try {
      await fetch('/api/scan-pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      setPin(null)
    } catch {
      setError('Could not revoke PIN.')
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl() {
    if (!scanUrl) return
    try {
      await navigator.clipboard.writeText(scanUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this URL:', scanUrl)
    }
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
          <ScanLine className="text-brand-400 h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold">Door Staff Scanner</h3>
          <p className="text-muted-foreground text-[12px]">
            Share a PIN link — no login needed for scanning.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">{error}</p>
      )}

      {/* No PIN yet */}
      {!pin && (
        <button
          onClick={generatePin}
          disabled={loading}
          className="from-brand-600 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ScanLine className="h-4 w-4" />
          {loading ? 'Generating…' : 'Generate Scan PIN'}
        </button>
      )}

      {/* PIN active */}
      {pin && (
        <div className="space-y-3">
          {/* PIN display */}
          <div className="border-border flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <p className="text-muted-foreground text-[11px] uppercase tracking-wider">Scan PIN</p>
              <p className="font-mono text-[26px] font-bold tracking-widest">{pin}</p>
            </div>
            <button
              onClick={generatePin}
              disabled={loading}
              title="Rotate PIN (invalidates the old one)"
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>

          {/* Share URL */}
          {scanUrl && (
            <div className="border-border flex items-center gap-2 overflow-hidden rounded-xl border p-1 pl-3.5">
              <p className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-zinc-400 select-all">
                {scanUrl}
              </p>
              <div className="flex shrink-0 gap-1">
                <a
                  href={scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open scanner page"
                  className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                >
                  <ExternalLink className="text-muted-foreground h-3.5 w-3.5" />
                </a>
                <button
                  onClick={copyUrl}
                  title="Copy URL"
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                    copied
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-brand-600 hover:bg-brand-500 text-white',
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* How to use */}
          <p className="text-muted-foreground text-[12px]">
            Share the link or PIN with door staff. They open it on any phone — no account needed.
            PIN expires in 24 hours. Tap{' '}
            <RefreshCw className="mb-0.5 inline h-3 w-3" /> to rotate it instantly.
          </p>

          {/* Revoke */}
          <button
            onClick={revokePin}
            disabled={loading}
            className="text-muted-foreground hover:text-red-400 flex items-center gap-1.5 text-[12px] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Revoke PIN
          </button>
        </div>
      )}
    </div>
  )
}
