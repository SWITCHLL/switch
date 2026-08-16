'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ShieldCheck, AlertCircle, Loader2, Tag, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'
import { reserveSeats, releaseReservation } from '../actions'
import { validatePromoCode } from '@/features/promo-codes/actions'
import { OrderSummary } from './order-summary'
import type { TicketType } from '@/app/generated/prisma/client'
import type { PromoValidation } from '@/features/promo-codes/types'

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

  // ── Promo code state ──────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState('')
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [appliedPromo, setAppliedPromo] = useState<PromoValidation | null>(null)

  const isFree = subtotal === 0
  const effectiveTotal = appliedPromo ? appliedPromo.finalTotal : subtotal
  const isEffectivelyFree = effectiveTotal === 0

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

  // ── Apply promo code ──────────────────────────────────────────────────────

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setPromoError(null)
    setIsValidatingPromo(true)

    const ticketTypeIds = [
      ...new Set(
        checkoutSeats.map((s) => s.ticketType?.id).filter((id): id is string => Boolean(id))
      ),
    ]

    const result = await validatePromoCode({
      code: promoInput.trim(),
      eventId: event.id,
      ticketTypeIds: ticketTypeIds.length > 0 ? ticketTypeIds : event.ticketTypes.map((t) => t.id),
      subtotal,
    })

    setIsValidatingPromo(false)

    if (result.success) {
      setAppliedPromo(result.data)
      setPromoInput('')
    } else {
      setPromoError(result.error)
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError(null)
  }

  // ── Pay / confirm ──
  const handlePay = async () => {
    if (!reservationId && !isFree && !isEffectivelyFree) return
    setError(null)
    setIsInitiatingPayment(true)

    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          promoCode: appliedPromo?.code ?? undefined,
        }),
      })
      const json = (await res.json()) as {
        authorizationUrl?: string
        free?: boolean
        error?: string
        discountAmount?: number
        finalTotal?: number
      }

      if (!res.ok || json.error) {
        setError(json.error ?? 'Payment initialization failed')
        return
      }

      if (json.free) {
        router.push(`/events/${event.slug}/checkout/success?reservation=${reservationId}`)
        return
      }

      if (json.authorizationUrl) {
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
    !isInitiatingPayment &&
    !isReserving &&
    !error &&
    !expired &&
    (isFree || isEffectivelyFree || reservationId !== null)

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

        {/* ── Promo code ── */}
        {!isFree && (
          <div className="border-border mb-6 rounded-2xl border p-5">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="text-brand-500 h-4 w-4" />
              <h2 className="text-[15px] font-semibold">Promo Code</h2>
            </div>

            {appliedPromo ? (
              // Applied state
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-500">
                      {appliedPromo.code}
                    </p>
                    <p className="text-muted-foreground text-[12px]">
                      {appliedPromo.discountType === 'PERCENTAGE'
                        ? `${appliedPromo.discountValue}% off`
                        : `${formatPrice(appliedPromo.discountValue)} off`}
                      {' — '}
                      {formatPrice(appliedPromo.discountAmount)} saved
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  aria-label="Remove promo code"
                  className="text-muted-foreground hover:text-foreground ml-2 rounded-lg p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              // Input state
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase())
                    setPromoError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleApplyPromo()
                    }
                  }}
                  placeholder="Enter code"
                  maxLength={30}
                  className={cn(
                    'border-border bg-background flex-1 rounded-lg border px-3 py-2',
                    'placeholder:text-muted-foreground font-mono text-[13px] uppercase placeholder:normal-case',
                    'focus:border-brand-500 focus:ring-brand-500/30 outline-none focus:ring-1',
                    promoError && 'border-red-500/60'
                  )}
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={isValidatingPromo || !promoInput.trim()}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
                    isValidatingPromo || !promoInput.trim()
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:opacity-90'
                  )}
                >
                  {isValidatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}

            {promoError && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {promoError}
              </p>
            )}
          </div>
        )}

        {/* Payment info */}
        <div className="border-border rounded-2xl border p-6">
          <h2 className="mb-1 text-[16px] font-semibold">Payment</h2>
          <p className="text-muted-foreground mb-6 text-[13px]">
            {isEffectivelyFree
              ? 'Your promo code covers the full amount. Click below to confirm your tickets.'
              : isFree
                ? 'This is a free event. Click below to confirm your tickets.'
                : 'You will be redirected to Paystack to complete your payment securely.'}
          </p>

          {!isFree && !isEffectivelyFree && (
            <div className="border-border bg-muted/20 flex items-center gap-4 rounded-xl border px-5 py-4">
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
            ) : isFree || isEffectivelyFree ? (
              'Confirm free tickets'
            ) : (
              <>Pay {formatPrice(effectiveTotal)} with Paystack</>
            )}
          </button>

          {/* Show savings summary below the CTA when a promo is active */}
          {appliedPromo && !isEffectivelyFree && (
            <p className="mt-2 text-center text-[12px] text-emerald-500">
              You save {formatPrice(appliedPromo.discountAmount)} with code {appliedPromo.code}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: order summary ── */}
      <div className="lg:sticky lg:top-[80px] lg:self-start">
        <OrderSummary
          event={event}
          checkoutSeats={checkoutSeats}
          subtotal={subtotal}
          appliedPromo={appliedPromo}
        />
      </div>
    </div>
  )
}
