'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'
import { reserveSeats, releaseReservation } from '../actions'
import { OrderSummary } from './order-summary'
import type { TicketType } from '@/app/generated/prisma/client'

interface CheckoutSeat {
  id: string
  price: number
  seat: { id: string; label: string; sectionId: string }
  ticketType: { id: string; name: string; currency: string } | null
  section: { name: string }
  row: { label: string }
}

interface CheckoutClientProps {
  event: {
    id: string
    slug: string
    title: string
    seatingType: string
    ticketTypes: Pick<
      TicketType,
      'id' | 'name' | 'price' | 'currency' | 'quantity' | 'sold' | 'status'
    >[]
  }
  checkoutSeats: CheckoutSeat[]
  subtotal: number
}

const COUNTDOWN_SECONDS = 600 // 10 minutes

export function CheckoutClient({ event, checkoutSeats, subtotal }: CheckoutClientProps) {
  const router = useRouter()
  const [reservationId, setReservationId] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [isReserving, setIsReserving] = useState(false)
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  const isFree = subtotal === 0

  // ── Step 1: Create reservation on mount for reserved seating ──
  useEffect(() => {
    if (event.seatingType === 'GENERAL_ADMISSION' || checkoutSeats.length === 0) return

    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setIsReserving(true)
    }, 0)

    reserveSeats({
      eventId: event.id,
      eventSeatIds: checkoutSeats.map((s) => s.id),
    }).then((result) => {
      if (cancelled) return
      setIsReserving(false)
      if (result.success) {
        setReservationId(result.reservationId)
        setSecondsLeft(Math.max(0, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000)))
      } else {
        setError(result.error)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Countdown timer ──
  useEffect(() => {
    if (!reservationId) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [reservationId])

  // ── Release on unmount if not confirmed ──
  const handleRelease = useCallback(async () => {
    if (reservationId) await releaseReservation({ reservationId })
  }, [reservationId])

  useEffect(() => {
    return () => {
      void handleRelease()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId])

  // ── Pay / confirm ──
  const handlePay = async () => {
    if (!reservationId && !isFree) return
    setError(null)
    setIsInitiatingPayment(true)

    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })
      const json = (await res.json()) as {
        authorizationUrl?: string
        free?: boolean
        error?: string
      }

      if (!res.ok || json.error) {
        setError(json.error ?? 'Payment initialization failed')
        return
      }

      if (json.free) {
        // Free ticket — navigate to success directly
        router.push(`/events/${event.slug}/checkout/success?reservation=${reservationId}`)
        return
      }

      if (json.authorizationUrl) {
        // Redirect to Paystack hosted checkout
        window.location.href = json.authorizationUrl
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsInitiatingPayment(false)
    }
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const isUrgent = secondsLeft <= 120

  const canPay =
    !isInitiatingPayment && !isReserving && !error && !expired && (isFree || reservationId !== null)

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-[18px] font-semibold">Your reservation expired</h2>
        <p className="text-muted-foreground mt-2 max-w-xs text-[14px]">
          Your held seats have been released. Please go back and select seats again.
        </p>
        <a
          href={`/events/${event.slug}/seats`}
          className="from-brand-600 mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Choose seats again
        </a>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      {/* ── Left: payment section ── */}
      <div>
        {/* Countdown */}
        {reservationId && (
          <div
            className={cn(
              'mb-6 flex items-center gap-3 rounded-xl border px-4 py-3',
              isUrgent
                ? 'border-red-500/30 bg-red-500/10 text-red-500'
                : 'border-border bg-muted/40 text-muted-foreground'
            )}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <p className="text-[13px]">
              {isUrgent ? 'Hurry! ' : ''}Seats held for{' '}
              <span className="font-bold tabular-nums">
                {mins}:{secs}
              </span>
            </p>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isReserving && (
          <div className="border-border bg-muted/30 mb-6 flex items-center gap-3 rounded-xl border px-4 py-3">
            <Loader2 className="text-brand-500 h-4 w-4 animate-spin" />
            <p className="text-muted-foreground text-[13px]">Holding your seats…</p>
          </div>
        )}

        {/* Payment info */}
        <div className="border-border rounded-2xl border p-6">
          <h2 className="mb-1 text-[16px] font-semibold">Payment</h2>
          <p className="text-muted-foreground mb-6 text-[13px]">
            {isFree
              ? 'This is a free event. Click below to confirm your tickets.'
              : 'You will be redirected to Paystack to complete your payment securely.'}
          </p>

          {!isFree && (
            <div className="border-border bg-muted/20 flex items-center gap-4 rounded-xl border px-5 py-4">
              {/* Paystack logo placeholder */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00C3F7]/10">
                <svg viewBox="0 0 40 40" className="h-6 w-6 fill-[#00C3F7]">
                  <rect x="4" y="12" width="32" height="5" rx="2.5" />
                  <rect x="4" y="23" width="20" height="5" rx="2.5" />
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-semibold">Paystack</p>
                <p className="text-muted-foreground text-[12px]">Cards · Bank Transfer · USSD</p>
              </div>
            </div>
          )}

          <div className="text-muted-foreground mt-4 flex items-center gap-2 text-[12px]">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Secured by 256-bit SSL encryption
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6">
          <button
            onClick={handlePay}
            disabled={!canPay}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3.5',
              'text-[15px] font-semibold text-white transition-all',
              !canPay
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
            )}
          >
            {isInitiatingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </>
            ) : isFree ? (
              'Confirm free tickets'
            ) : (
              <>Pay {formatPrice(subtotal)} with Paystack</>
            )}
          </button>
        </div>
      </div>

      {/* ── Right: order summary ── */}
      <div className="lg:sticky lg:top-[80px] lg:self-start">
        <OrderSummary event={event} checkoutSeats={checkoutSeats} subtotal={subtotal} />
      </div>
    </div>
  )
}
