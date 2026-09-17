import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Users, ChevronLeft, Calendar, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getExpiredGroupOrdersWithPaidSlots } from '@/features/admin/queries'
import { GroupSlotRefundActions } from '@/features/admin/components/group-slot-refund-actions'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Expired Group Orders · Admin' }

export default async function AdminGroupsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const orders = await getExpiredGroupOrdersWithPaidSlots()

  const totalExposure = orders.reduce(
    (sum, order) =>
      sum +
      order.slots.reduce(
        (s, slot) =>
          s + (slot.payment?.status !== 'REFUNDED' ? (slot.payment?.amount ?? 0) : 0),
        0
      ),
    0
  )

  const pendingCount = orders.reduce(
    (sum, order) =>
      sum + order.slots.filter((s) => s.payment?.status !== 'REFUNDED').length,
    0
  )

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to admin"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Expired Group Orders</h1>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            All-or-nothing groups that expired with paid slots — issue refunds for each member.
          </p>
        </div>
      </div>

      {/* ── Exposure summary ── */}
      {pendingCount > 0 && (
        <div className="border-border bg-surface flex items-start gap-3 rounded-xl border px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-[13px] font-semibold">
              {pendingCount} slot{pendingCount !== 1 ? 's' : ''} pending refund
            </p>
            <p className="text-muted-foreground text-[12px]">
              Total exposure:{' '}
              <span className="font-semibold text-red-400">{formatPrice(totalExposure)}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {orders.length === 0 && (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <CheckCircle2 className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="text-[16px] font-semibold">All clear</p>
          <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
            No expired group orders with outstanding paid slots.
          </p>
        </div>
      )}

      {/* ── Order list ── */}
      <div className="space-y-6">
        {orders.map((order) => {
          const paidCount = order.slots.length
          const refundedCount = order.slots.filter(
            (s) => s.payment?.status === 'REFUNDED'
          ).length
          const remainingAmount = order.slots.reduce(
            (sum, s) =>
              sum + (s.payment?.status !== 'REFUNDED' ? (s.payment?.amount ?? 0) : 0),
            0
          )

          return (
            <div key={order.id} className="border-border bg-surface overflow-hidden rounded-2xl border">
              {/* ── Order header ── */}
              <div className="border-border/60 flex items-start gap-4 border-b px-5 py-4">
                {/* Event thumbnail */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  {order.event.imageUrl ? (
                    <Image
                      src={order.event.imageUrl}
                      alt={order.event.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="from-brand-900/50 h-full w-full bg-gradient-to-br to-violet-900/30" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/events/${order.event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 text-[14px] font-semibold transition-colors"
                    >
                      {order.event.title}
                    </Link>
                    <span className="bg-red-500/10 text-red-400 rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
                      EXPIRED
                    </span>
                    {order.requireFullPayment && (
                      <span className="bg-amber-500/10 text-amber-400 rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
                        All-or-nothing
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground flex items-center gap-1 text-[12px]">
                      <Calendar className="h-3 w-3" />
                      {format(order.event.startsAt, 'MMM d, yyyy')}
                    </span>
                    <span className="text-muted-foreground font-mono text-[12px]">
                      {order.code}
                    </span>
                  </div>

                  <p className="text-muted-foreground mt-0.5 text-[12px]">
                    Initiated by{' '}
                    <span className="text-foreground font-medium">
                      {order.initiator.name ?? order.initiator.email}
                    </span>
                    {' · '}expired {format(order.expiresAt, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>

                {/* Progress */}
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold">
                    {refundedCount}/{paidCount} refunded
                  </p>
                  {remainingAmount > 0 && (
                    <p className="mt-0.5 text-[12px] font-semibold text-red-400">
                      {formatPrice(remainingAmount)} owed
                    </p>
                  )}
                  {refundedCount === paidCount && (
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[12px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </p>
                  )}
                </div>
              </div>

              {/* ── Slot rows ── */}
              <div className="divide-border/50 divide-y">
                {order.slots.map((slot) => {
                  const seatLabel = slot.eventSeat?.seat
                    ? `Row ${slot.eventSeat.seat.row.label} · Seat ${slot.eventSeat.seat.label}`
                    : null
                  const ticketName =
                    slot.label ?? seatLabel ?? slot.ticketType?.name ?? 'Ticket'
                  const isRefunded = slot.payment?.status === 'REFUNDED'

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        'flex flex-wrap items-center gap-4 px-5 py-3.5',
                        isRefunded && 'opacity-50'
                      )}
                    >
                      {/* Claimer info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {slot.claimer?.name ?? slot.claimer?.email ?? 'Unknown member'}
                        </p>
                        <p className="text-muted-foreground text-[12px]">
                          {slot.claimer?.email}
                        </p>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                          <span>{ticketName}</span>
                          {slot.ticket && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="font-mono">{slot.ticket.ticketNumber}</span>
                            </>
                          )}
                          {slot.claimedAt && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span>paid {format(slot.claimedAt, 'MMM d, h:mm a')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-bold">
                          {formatPrice(slot.payment?.amount ?? slot.price, slot.currency)}
                        </p>
                        {slot.payment?.paystackReference && (
                          <p className="text-muted-foreground font-mono text-[10.5px]">
                            {slot.payment.paystackReference}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0">
                        <GroupSlotRefundActions
                          slotId={slot.id}
                          paymentStatus={slot.payment?.status ?? 'UNKNOWN'}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
