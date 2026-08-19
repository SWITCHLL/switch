'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertCircle, Loader2, Tag, X, CheckCircle2, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'
import { validatePromoCode } from '@/features/promo-codes/actions'
import type { TicketType } from '@/app/generated/prisma/client'
import type { PromoValidation } from '@/features/promo-codes/types'

interface GASelection {
  ticketTypeId: string
  ticketTypeName: string
  price: number
  currency: string
  quantity: number
}

interface GACheckoutClientProps {
  event: {
    id: string
    slug: string
    title: string
    ticketTypes: Pick<TicketType, 'id' | 'name' | 'price' | 'currency'>[]
  }
  selections: GASelection[]
  subtotal: number
}

export function GACheckoutClient({ event, selections, subtotal }: GACheckoutClientProps) {
  const router = useRouter()
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Promo code state ──────────────────────────────────────────────────────
  const [promoInput, setPromoInput] = useState('')
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [appliedPromo, setAppliedPromo] = useState<PromoValidation | null>(null)

  const isFree = subtotal === 0
  const effectiveTotal = appliedPromo ? appliedPromo.finalTotal : subtotal
  const isEffectivelyFree = effectiveTotal === 0

  // ── Apply promo code ──────────────────────────────────────────────────────

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setPromoError(null)
    setIsValidatingPromo(true)

    const ticketTypeIds = selections.map((s) => s.ticketTypeId)

    const result = await validatePromoCode({
      code: promoInput.trim(),
      eventId: event.id,
      ticketTypeIds,
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

  // ── Pay ──────────────────────────────────────────────────────────────────

  async function handlePay() {
    setError(null)
    setIsInitiatingPayment(true)

    try {
      const res = await fetch('/api/payments/initialize-ga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          selections: selections.map((s) => ({
            ticketTypeId: s.ticketTypeId,
            quantity: s.quantity,
          })),
          promoCode: appliedPromo?.code ?? undefined,
        }),
      })

      const json = (await res.json()) as {
        authorizationUrl?: string
        free?: boolean
        reservationId?: string
        error?: string
      }

      if (!res.ok || json.error) {
        setError(json.error ?? 'Payment initialization failed')
        return
      }

      if (json.free && json.reservationId) {
        router.push(
          `/events/${event.slug}/checkout/success?reservation=${json.reservationId}&type=ga`
        )
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      {/* ── Left: payment section ── */}
      <div>
        {/* Errors */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
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
                  {isValidatingPromo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Apply'
                  )}
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
            disabled={isInitiatingPayment}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3.5',
              'text-[15px] font-semibold text-white transition-all',
              isInitiatingPayment
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

          {appliedPromo && !isEffectivelyFree && (
            <p className="mt-2 text-center text-[12px] text-emerald-500">
              You save {formatPrice(appliedPromo.discountAmount)} with code {appliedPromo.code}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: order summary ── */}
      <div className="lg:sticky lg:top-[80px] lg:self-start">
        <GAOrderSummary selections={selections} subtotal={subtotal} appliedPromo={appliedPromo} />
      </div>
    </div>
  )
}

// ─── GA Order Summary ─────────────────────────────────────────────────────────

function GAOrderSummary({
  selections,
  subtotal,
  appliedPromo,
}: {
  selections: GASelection[]
  subtotal: number
  appliedPromo?: PromoValidation | null
}) {
  const effectiveTotal = appliedPromo ? appliedPromo.finalTotal : subtotal

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="text-brand-500 h-4 w-4" />
        <h2 className="text-[15px] font-semibold">Order Summary</h2>
      </div>

      <div className="space-y-3">
        {selections.map((s) => (
          <div key={s.ticketTypeId} className="flex items-center justify-between text-[13.5px]">
            <div>
              <p className="font-medium">{s.ticketTypeName}</p>
              <p className="text-muted-foreground text-[12px]">
                {s.quantity} × {s.price === 0 ? 'Free' : formatPrice(s.price, s.currency)}
              </p>
            </div>
            <span className="font-medium">
              {s.price === 0 ? 'Free' : formatPrice(s.price * s.quantity, s.currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-border/60 mt-5 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{subtotal === 0 ? 'Free' : formatPrice(subtotal)}</span>
        </div>

        {appliedPromo && appliedPromo.discountAmount > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-emerald-500">
              Promo ({appliedPromo.code})
              {appliedPromo.discountType === 'PERCENTAGE'
                ? ` −${appliedPromo.discountValue}%`
                : ''}
            </span>
            <span className="font-medium text-emerald-500">
              −{formatPrice(appliedPromo.discountAmount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Service fee</span>
          <span className="text-muted-foreground">—</span>
        </div>

        <div className="border-border/60 flex items-center justify-between border-t pt-3 text-[15px] font-bold">
          <span>Total</span>
          <span>{effectiveTotal === 0 ? 'Free' : formatPrice(effectiveTotal)}</span>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-[11px]">
        By completing this order you agree to our Terms of Service
      </p>
    </div>
  )
}
