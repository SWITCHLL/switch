import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Banknote, ChevronLeft, Building2 } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getAdminPayoutRequests } from '@/features/admin/queries'
import { PayoutReviewActions } from '@/features/admin/components/payout-review-actions'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Payout Requests · Admin' }

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
] as const

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500',
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminPayoutsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const { status = 'PENDING' } = await searchParams
  const activeStatus = STATUS_TABS.find((t) => t.value === status)?.value ?? 'PENDING'

  const requests = await getAdminPayoutRequests(
    activeStatus as Parameters<typeof getAdminPayoutRequests>[0]
  )

  // Totals for the active filter
  const totalNet = requests.reduce((s, r) => s + r.netAmount, 0)
  const totalGross = requests.reduce((s, r) => s + r.grossAmount, 0)

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
          <h1 className="text-[22px] font-semibold tracking-tight">Payout Requests</h1>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            Approve requests to initiate Paystack transfers.
          </p>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="border-border flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/payouts?status=${tab.value}`}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 text-[13px] font-semibold transition-colors',
              activeStatus === tab.value
                ? 'border-brand-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Summary strip ── */}
      {requests.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="border-border bg-surface rounded-xl border px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
              Total ({requests.length})
            </p>
            <p className="mt-0.5 text-[18px] font-bold">{formatPrice(totalNet)}</p>
            <p className="text-muted-foreground text-[11.5px]">net to pay out</p>
          </div>
          <div className="border-border bg-surface rounded-xl border px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
              Gross collected
            </p>
            <p className="mt-0.5 text-[18px] font-bold">{formatPrice(totalGross)}</p>
            <p className="text-muted-foreground text-[11.5px]">before fees</p>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {requests.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
          <Banknote className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-[15px] font-semibold">No payout requests</p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Nothing in the {activeStatus.toLowerCase()} queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border-border bg-surface rounded-2xl border p-5">
              {/* Top row */}
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold">{req.organizer.name}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        STATUS_BADGE[req.status] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                    {req.organizer.user.email}
                  </p>
                  <p className="text-muted-foreground text-[11.5px]">
                    Requested {format(req.createdAt, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <PayoutReviewActions
                  payoutRequestId={req.id}
                  currentStatus={req.status}
                />
              </div>

              {/* Details */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Event">
                  <Link
                    href={`/events/${req.event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 truncate transition-colors"
                  >
                    {req.event.title}
                  </Link>
                  <p className="text-muted-foreground text-[11.5px]">
                    {format(req.event.startsAt, 'MMM d, yyyy')}
                  </p>
                </Detail>
                <Detail label="Amounts">
                  <p className="text-[13px] font-semibold">{formatPrice(req.netAmount)} net</p>
                  <p className="text-muted-foreground text-[11.5px]">
                    {formatPrice(req.grossAmount)} gross · {formatPrice(req.totalFees)} fees
                  </p>
                </Detail>
                <Detail label="Bank Account">
                  {req.organizer.bankAccountNumber ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="text-[12.5px] font-medium">
                          {req.organizer.bankAccountName}
                        </p>
                        <p className="text-muted-foreground text-[11.5px]">
                          {req.organizer.bankAccountNumber} · {req.organizer.bankCode}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-red-500">No bank account</p>
                  )}
                </Detail>
                {req.paystackTransferCode && (
                  <Detail label="Transfer Code">
                    <p className="font-mono text-[12px]">{req.paystackTransferCode}</p>
                  </Detail>
                )}
              </div>

              {req.reviewNote && (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
                  <p className="text-muted-foreground mb-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    Review note
                  </p>
                  <p className="text-[12.5px]">{req.reviewNote}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail cell ──────────────────────────────────────────────────────────────

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="text-[13px]">{children}</div>
    </div>
  )
}
