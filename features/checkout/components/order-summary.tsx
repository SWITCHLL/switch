'use client'

import { Ticket } from 'lucide-react'
import { formatPrice } from '@/features/events/utils'
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

interface OrderSummaryProps {
  event: {
    id: string
    title: string
    seatingType: string
    ticketTypes: Pick<TicketType, 'id' | 'name' | 'price' | 'currency'>[]
  }
  checkoutSeats: CheckoutSeat[]
  subtotal: number
  appliedPromo?: PromoValidation | null
}

export function OrderSummary({ event, checkoutSeats, subtotal, appliedPromo }: OrderSummaryProps) {
  // Group reserved seats by ticket type
  const grouped = checkoutSeats.reduce<
    Record<string, { name: string; currency: string; price: number; seats: CheckoutSeat[] }>
  >((acc, s) => {
    const key = s.ticketType?.id ?? 'unknown'
    if (!acc[key]) {
      acc[key] = {
        name: s.ticketType?.name ?? 'Ticket',
        currency: s.ticketType?.currency ?? 'NGN',
        price: s.price,
        seats: [],
      }
    }
    acc[key]!.seats.push(s)
    return acc
  }, {})

  const effectiveTotal = appliedPromo ? appliedPromo.finalTotal : subtotal

  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="text-brand-500 h-4 w-4" />
        <h2 className="text-[15px] font-semibold">Order Summary</h2>
      </div>

      {/* Seat line items */}
      <div className="space-y-3">
        {Object.values(grouped).map((group) => (
          <div key={group.name}>
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="font-medium">{group.name}</span>
              <span className="text-muted-foreground text-[12px]">× {group.seats.length}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {group.seats.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">
                    {s.section.name} · Row {s.row.label} · {s.seat.label}
                  </span>
                  <span className="font-medium">{formatPrice(s.price, group.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-border/60 mt-5 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{subtotal === 0 ? 'Free' : formatPrice(subtotal)}</span>
        </div>

        {appliedPromo && appliedPromo.discountAmount > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-emerald-500">
              Promo ({appliedPromo.code})
              {appliedPromo.discountType === 'PERCENTAGE' ? ` −${appliedPromo.discountValue}%` : ''}
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
