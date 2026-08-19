'use client'

import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RotateCcw, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QrScanner } from './qr-scanner'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'already_used'
  | 'cancelled'
  | 'invalid'
  | 'error'

interface ScanResult {
  ticketNumber: string
  attendeeName: string
  ticketTypeName: string
  seatLabel: string | null
}

interface CheckinScannerProps {
  eventId: string
  eventTitle: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckinScanner({ eventId, eventTitle }: CheckinScannerProps) {
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(true)

  const handleScan = useCallback(
    async (qrCode: string) => {
      setState('loading')
      setScanning(false)

      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode, eventId }),
        })

        const json = (await res.json()) as {
          success: boolean
          reason?: string
          ticket?: ScanResult
          error?: string
        }

        if (!res.ok) {
          setState('error')
          return
        }

        if (json.success) {
          setState('success')
          setResult(json.ticket ?? null)
        } else {
          switch (json.reason) {
            case 'ALREADY_USED':
              setState('already_used')
              setResult(json.ticket ?? null)
              break
            case 'CANCELLED':
              setState('cancelled')
              break
            default:
              setState('invalid')
          }
        }
      } catch {
        setState('error')
      }
    },
    [eventId]
  )

  function handleReset() {
    setResult(null)
    setState('idle')
    // Briefly disarm then re-arm so the scanner ref flips cleanly
    setScanning(false)
    requestAnimationFrame(() => setScanning(true))
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Event label */}
      <div className="border-border bg-surface rounded-xl border px-4 py-3">
        <p className="text-muted-foreground text-[11px] uppercase tracking-wider">Checking in</p>
        <p className="text-[14px] font-semibold">{eventTitle}</p>
      </div>

      {/* Scanner — always mounted so the camera stays running */}
      <div className="relative">
        <QrScanner onScan={handleScan} scanning={scanning} />

        {/* Processing overlay on top of the camera */}
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Result card */}
      {state !== 'idle' && state !== 'loading' && (
        <ResultCard state={state} result={result} onReset={handleReset} />
      )}

      {/* Idle instruction */}
      {state === 'idle' && (
        <p className="text-muted-foreground text-center text-[13px]">
          Point the camera at an attendee&apos;s ticket QR code
        </p>
      )}
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

const RESULT_CONFIG: Record<
  Exclude<ScanState, 'idle' | 'loading'>,
  { label: string; description: string; icon: React.ElementType; className: string }
> = {
  success: {
    label: 'Admitted',
    description: 'Ticket is valid — let them in.',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  already_used: {
    label: 'Already scanned',
    description: 'This ticket was already checked in.',
    icon: AlertCircle,
    className: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  cancelled: {
    label: 'Cancelled / Refunded',
    description: 'This ticket is no longer valid.',
    icon: XCircle,
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  invalid: {
    label: 'Invalid ticket',
    description: 'This QR code does not match any ticket for this event.',
    icon: XCircle,
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  error: {
    label: 'Error',
    description: 'Something went wrong. Please try again.',
    icon: AlertCircle,
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
}

function ResultCard({
  state,
  result,
  onReset,
}: {
  state: Exclude<ScanState, 'idle' | 'loading'>
  result: ScanResult | null
  onReset: () => void
}) {
  const cfg = RESULT_CONFIG[state]
  const Icon = cfg.icon

  return (
    <div className={cn('rounded-2xl border p-5', cfg.className)}>
      <div className="mb-3 flex items-center gap-3">
        <Icon className="h-6 w-6 shrink-0" />
        <p className="text-[16px] font-bold">{cfg.label}</p>
      </div>

      <p className="mb-4 text-[13px] opacity-80">{cfg.description}</p>

      {result && (
        <div className="border-current/20 mb-4 space-y-1.5 border-t pt-4">
          <DetailRow icon={UserCheck} label={result.attendeeName} />
          <DetailRow icon={null} label={result.ticketTypeName} />
          {result.seatLabel && <DetailRow icon={null} label={`Seat ${result.seatLabel}`} />}
          <p className="font-mono text-[11px] opacity-60">{result.ticketNumber}</p>
        </div>
      )}

      <button
        onClick={onReset}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/20"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Scan next ticket
      </button>
    </div>
  )
}

function DetailRow({ icon: Icon, label }: { icon: React.ElementType | null; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
      <span>{label}</span>
    </div>
  )
}
