'use client'

/**
 * Universal QR scanner — Chrome, Firefox, Safari, Android, iOS.
 * Uses @zxing/browser (software canvas decode loop, no native browser APIs).
 *
 * Permission flow:
 *  1. Show an explicit "Enable Camera" button — browsers require a user
 *     gesture before getUserMedia will show the OS permission prompt.
 *     Auto-starting on mount causes a silent NotAllowedError on HTTP and on
 *     pages where permission state is "prompt".
 *  2. After the user taps the button, request the camera and start decoding.
 *  3. On denial → show a retry / manual-entry fallback.
 *  4. Manual entry is always available as an escape hatch.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'
import { Camera, CameraOff, Keyboard, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QrScannerProps {
  onScan: (qrCode: string) => void
  scanning: boolean
}

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'no-camera'

export function QrScanner({ onScan, scanning }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const onScanRef = useRef(onScan)
  const scanningRef = useRef(scanning)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [manualMode, setManualMode] = useState(false)
  const [manualValue, setManualValue] = useState('')

  // Keep refs current without restarting the camera
  useEffect(() => { onScanRef.current = onScan }, [onScan])
  useEffect(() => { scanningRef.current = scanning }, [scanning])

  // Stop camera on unmount
  useEffect(() => {
    return () => { controlsRef.current?.stop() }
  }, [])

  // ── Start camera (called on button tap, or on retry) ──────────────────────

  const startCamera = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    // Stop any previous stream before restarting
    controlsRef.current?.stop()
    controlsRef.current = null

    setCameraState('requesting')

    try {
      const reader = new BrowserQRCodeReader()

      // Prefer rear camera on phones; fall back to first available
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const rear = devices.find((d) => /back|rear|environment/i.test(d.label))
      const deviceId = rear?.deviceId ?? devices[0]?.deviceId

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        video,
        (result) => {
          if (!result || !scanningRef.current) return
          scanningRef.current = false           // disarm to prevent double-fire
          onScanRef.current(result.getText())
        },
      )

      controlsRef.current = controls
      setCameraState('active')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[QrScanner]', msg)

      if (/NotAllowed|Permission|denied|secure/i.test(msg)) {
        setCameraState('denied')
      } else {
        setCameraState('no-camera')
        setManualMode(true)
      }
    }
  }, [])

  // ── Manual entry ──────────────────────────────────────────────────────────

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = manualValue.trim()
    if (!val || !scanningRef.current) return
    scanningRef.current = false
    onScanRef.current(val)
    setManualValue('')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Camera panel ── */}
      <div className={cn('relative overflow-hidden rounded-2xl bg-black', manualMode && 'hidden')}>

        {/* Video element — always in the DOM so the ref is ready for zxing */}
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-[300px] w-full object-cover sm:h-[360px]"
          aria-label="Camera feed for QR scanning"
        />

        {/* ── IDLE: explicit permission request ── */}
        {cameraState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white">Camera access needed</p>
              <p className="mt-1 text-[12.5px] text-white/55">
                Tap the button below — your browser will ask for permission.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="from-brand-600 mt-1 rounded-xl bg-gradient-to-r to-violet-600 px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Enable Camera
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="text-[12px] text-white/40 underline underline-offset-2 hover:text-white/70"
            >
              Enter code manually instead
            </button>
          </div>
        )}

        {/* ── REQUESTING: waiting for OS prompt ── */}
        {cameraState === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75">
            <Camera className="h-8 w-8 animate-pulse text-white" />
            <p className="text-[13px] text-white/80">Waiting for permission…</p>
          </div>
        )}

        {/* ── DENIED ── */}
        {cameraState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
            <CameraOff className="h-8 w-8 text-red-400" />
            <p className="text-[14px] font-semibold text-white">Camera access denied</p>
            <p className="text-[12px] text-white/55">
              Open your browser&apos;s site settings, allow the camera, then tap Retry.
            </p>
            <div className="mt-1 flex gap-2">
              <button
                onClick={startCamera}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-white/20"
              >
                Retry
              </button>
              <button
                onClick={() => setManualMode(true)}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-white/20"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Manual entry
              </button>
            </div>
          </div>
        )}

        {/* ── ACTIVE: aim guide ── */}
        {cameraState === 'active' && scanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {/* Manual entry escape hatch */}
        {cameraState === 'active' && (
          <button
            onClick={() => setManualMode(true)}
            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11.5px] font-medium text-white backdrop-blur-sm hover:bg-black/70"
          >
            <Keyboard className="h-3 w-3" />
            Manual entry
          </button>
        )}
      </div>

      {/* ── Manual entry panel ── */}
      {manualMode && (
        <div className="border-border bg-surface space-y-3 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Enter QR code manually</p>
            {/* Only show the back button if the camera is (or was) working */}
            {(cameraState === 'active' || cameraState === 'idle') && (
              <button
                onClick={() => { setManualMode(false); setManualValue('') }}
                aria-label="Back to camera"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {cameraState === 'no-camera' && (
            <p className="text-[12px] text-amber-400">
              No camera detected. Paste the QR code value shown on the ticket.
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Paste or type QR code value…"
              autoFocus
              className={cn(
                'border-border bg-background flex-1 rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none',
                'focus:border-brand-500 focus:ring-brand-500/20 transition-colors focus:ring-2',
              )}
            />
            <button
              type="submit"
              disabled={!manualValue.trim()}
              className="from-brand-600 rounded-xl bg-gradient-to-r to-violet-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Check
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
