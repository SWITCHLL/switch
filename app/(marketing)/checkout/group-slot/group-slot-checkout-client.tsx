'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatPrice } from '@/features/events/utils'
import { cn } from '@/lib/utils'

interface GroupSlotCheckoutClientProps {
  slotId: string
  groupCode: string
  expiresAt: Date
  event: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    startsAt: Date
    venue: { name: string; city: string } | null
  }
  ticketName: string
  seatLabel: string | null
  amount: number
  currency: string
}

function getSecondsLeft(expiresAt: Date) {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
}

export function GroupSlotCheckoutClient({
  slotId,
  groupCode,
  expiresAt,
  event,
  ticketName,
  seatLabel,
  amount,
  currency,
}: GroupSlotCheckoutClientProps) {
  const [isInitiating, setIsInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(expiresAt))
  const [expired, setExpired] = useState(false)

  // Countdown to group expiry
  useEffect(() => {
    const interval = setInterval(() => {
      const s = getSecondsLeft(expiresAt)
      setSecondsLeft(s)
      if (s <= 0) {
        clearInterval(interval)
        setExpired(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const isUrgent = secondsLeft > 0 && secondsLeft <= 180

  async function handlePay() {
    setError(null)
    setIsInitiating(true)
    try {
      const res = await fetch('/api/payments/initialize-group-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      })
      const json = (await res.json()) as {
        authorizationUrl?: string
        free?: boolean
        code?: string
        error?: string
      }

      if (!res.ok || json.error) {
        setError(json.error ?? 'Payment initialization failed')
        return
      }

      if (json.free) {
        // Free slot — redirect straight to the group page
        window.location.href = `/group/${json.code ?? groupCode}?paid=1`
        return
      }

      if (json.authorizationUrl) {
        window.location.href = json.authorizationUrl
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsInitiating(false)
    }
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <Clock className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="text-[18px] font-semibold">Your slot has expired</h2>
        <p className="text-muted-foreground mt-2 max-w-xs text-[14px]">
          The group payment deadline passed. Your held slot has been released.
        </p>
        <a
          href={`/group/${groupCode}`}
          className="from-brand-600 mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to group
        </a>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
      {/* ── Left: payment ── */}
      <div className="space-y-5">
        {/* Group deadline countdown */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3',
            isUrgent
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-border bg-muted/40 text-muted-foreground'
          )}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <p className="text-[13px]">
            {isUrgent ? 'Hurry! ' : 'Group expires in '}
            <span className="font-bold tabular-nums">{mins}:{secs}</span>
            {!isUrgent && ' — pay before the deadline'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Payment provider */}
        <div className="border-border rounded-2xl border p-6">
          <h2 className="mb-1 text-[16px] font-semibold">Complete your payment</h2>
          <p className="text-muted-foreground mb-6 text-[13px]">
            {amount === 0
              ? 'This slot is free — click below to confirm.'
              : 'You will be redirected to Paystack to pay securely.'}
          </p>

          {amount > 0 && (
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
        <button
          onClick={handlePay}
          disabled={isInitiating || expired}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3.5',
            'text-[15px] font-semibold text-white transition-all',
            isInitiating || expired
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'from-brand-600 cursor-pointer bg-gradient-to-r to-violet-600 hover:opacity-90'
          )}
        >
          {isInitiating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </>
          ) : amount === 0 ? (
            <>
              <CheckCircle className="h-4 w-4" /> Confirm free slot
            </>
          ) : (
            <>Pay {formatPrice(amount, currency)} with Paystack</>
          )}
        </button>

        <p className="text-muted-foreground text-center text-[11.5px]">
          Paying only for your slot — each member pays independently.
        </p>
      </div>

      {/* ── Right: order summary ── */}
      <div className="lg:sticky lg:top-[80px] lg:self-start">
        <div className="border-border bg-surface overflow-hidden rounded-2xl border">
          {/* Event image */}
          {event.imageUrl && (
            <div className="relative h-[120px] w-full">
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover object-center"
                sizes="340px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div className="p-5">
            <p className="text-brand-400 mb-1 text-[10.5px] font-semibold tracking-widest uppercase">
              Group · {groupCode}
            </p>
            <h2 className="text-[15px] font-semibold leading-snug">{event.title}</h2>

            <div className="mt-3 space-y-1.5">
              <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {format(event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}
              </div>
              {event.venue && (
                <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {event.venue.name}, {event.venue.city}
                </div>
              )}
            </div>

            <div className="border-border/60 mt-4 border-t pt-4">
              {/* Slot line item */}
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Ticket className="text-muted-foreground h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{ticketName}</p>
                  {seatLabel && (
                    <p className="text-muted-foreground text-[11.5px]">{seatLabel}</p>
                  )}
                </div>
                <p className="text-brand-400 shrink-0 text-[14px] font-bold">
                  {amount === 0 ? 'Free' : formatPrice(amount, currency)}
                </p>
              </div>

              {/* Total */}
              <div className="mt-4 flex items-center justify-between text-[14px] font-bold">
                <span>Your total</span>
                <span>{amount === 0 ? 'Free' : formatPrice(amount, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
