import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { db } from '@/lib/db'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { RequestPayoutButton } from '@/features/payments/components/request-payout-button'
import { BankAccountForm } from '@/features/payments/components/bank-account-form'

export const metadata: Metadata = { title: 'Payouts' }

const PAYOUT_HOLD_HOURS = 48

export default async function PayoutsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  // Fetch full organizer with bank details
  const fullOrganizer = await db.organizer.findUnique({
    where: { id: organizer.id },
    select: {
      id: true,
      bankCode: true,
      bankAccountNumber: true,
      bankAccountName: true,
      feePercent: true,
    },
  })

  // Events that have ended — grouped with payment totals
  const now = new Date()
  const events = await db.event.findMany({
    where: { organizerId: organizer.id },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      payments: {
        where: { status: 'SUCCESS' },
        select: { amount: true, netAmount: true, platformFeeAmount: true },
      },
      payoutRequests: {
        select: { id: true, status: true, netAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { startsAt: 'desc' },
  })

  // Revenue summary
  const totalFees = events.flatMap((e) => e.payments).reduce((s, p) => s + p.platformFeeAmount, 0)
  const totalNet = events.flatMap((e) => e.payments).reduce((s, p) => s + p.netAmount, 0)

  const paidOut = await db.payoutRequest.aggregate({
    where: { organizerId: organizer.id, status: 'COMPLETED' },
    _sum: { netAmount: true },
  })
  const totalPaidOut = paidOut._sum.netAmount ?? 0
  const pendingBalance = totalNet - totalPaidOut

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Request payouts 48 hours after your event ends.
        </p>
      </div>

      {/* ── Summary ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Earned',
            value: formatPrice(totalNet),
            sub: `${formatPrice(totalFees)} in fees deducted`,
          },
          { label: 'Paid Out', value: formatPrice(totalPaidOut), sub: 'Successfully transferred' },
          { label: 'Pending Balance', value: formatPrice(pendingBalance), sub: 'Awaiting payout' },
        ].map((s) => (
          <div key={s.label} className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-[22px] font-bold">{s.value}</p>
            <p className="text-muted-foreground mt-0.5 text-[11.5px]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bank account ── */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="mb-4 text-[14px] font-semibold">Bank Account</h2>
        {fullOrganizer?.bankAccountNumber ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13.5px] font-medium">{fullOrganizer.bankAccountName}</p>
              <p className="text-muted-foreground text-[12.5px]">
                {fullOrganizer.bankAccountNumber} · Bank code {fullOrganizer.bankCode}
              </p>
            </div>
            <BankAccountForm currentBank={fullOrganizer} />
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-4 text-[13px]">
              Add your bank account to receive payouts.
            </p>
            <BankAccountForm currentBank={null} />
          </div>
        )}
        {fullOrganizer?.feePercent !== null && fullOrganizer?.feePercent !== undefined && (
          <p className="text-muted-foreground mt-3 text-[11.5px]">
            Your custom platform fee rate:{' '}
            <span className="font-semibold text-emerald-500">{fullOrganizer.feePercent}%</span>
          </p>
        )}
      </div>

      {/* ── Events ── */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="mb-4 text-[14px] font-semibold">Events</h2>

        {events.length === 0 && <p className="text-muted-foreground text-[13px]">No events yet.</p>}

        <div className="space-y-3">
          {events.map((event) => {
            const gross = event.payments.reduce((s, p) => s + p.amount, 0)
            const net = event.payments.reduce((s, p) => s + p.netAmount, 0)
            const payoutReq = event.payoutRequests[0]
            const endsAt = event.endsAt ?? event.startsAt
            const payoutEligibleAt = new Date(endsAt.getTime() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000)
            const canRequestPayout =
              now >= payoutEligibleAt &&
              !payoutReq &&
              gross > 0 &&
              !!fullOrganizer?.bankAccountNumber

            const hoursLeft = Math.max(
              0,
              Math.ceil((payoutEligibleAt.getTime() - now.getTime()) / (60 * 60 * 1000))
            )

            return (
              <div
                key={event.id}
                className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{event.title}</p>
                  <p className="text-muted-foreground text-[12px]">
                    {format(event.startsAt, 'MMM d, yyyy')}
                    {event.endsAt ? ` – ${format(event.endsAt, 'MMM d, yyyy')}` : ''}
                  </p>
                </div>

                <div className="text-right text-[12.5px]">
                  <p className="font-semibold">{formatPrice(net)}</p>
                  <p className="text-muted-foreground">
                    {event.payments.length} ticket{event.payments.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="shrink-0">
                  {payoutReq ? (
                    <PayoutStatusBadge status={payoutReq.status} />
                  ) : gross === 0 ? (
                    <span className="text-muted-foreground text-[12px]">No sales</span>
                  ) : now < payoutEligibleAt ? (
                    <span className="text-muted-foreground text-[12px]">
                      <Clock className="mr-1 inline h-3.5 w-3.5" />
                      {hoursLeft}h left
                    </span>
                  ) : canRequestPayout ? (
                    <RequestPayoutButton eventId={event.id} />
                  ) : !fullOrganizer?.bankAccountNumber ? (
                    <span className="text-muted-foreground text-[12px]">Add bank account</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PayoutStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    PENDING: { label: 'Under Review', cls: 'bg-amber-500/10 text-amber-500', icon: Clock },
    APPROVED: { label: 'Approved', cls: 'bg-blue-500/10 text-blue-400', icon: CheckCircle2 },
    PROCESSING: { label: 'Processing', cls: 'bg-blue-500/10 text-blue-400', icon: Clock },
    COMPLETED: { label: 'Paid Out', cls: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
    REJECTED: { label: 'Rejected', cls: 'bg-red-500/10 text-red-500', icon: XCircle },
  }
  const cfg = map[status] ?? {
    label: status,
    cls: 'bg-muted text-muted-foreground',
    icon: AlertCircle,
  }
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        cfg.cls
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}
