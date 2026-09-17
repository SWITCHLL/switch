import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { RotateCcw, ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getAdminRefundRequests } from '@/features/admin/queries'
import { RefundReviewActions } from '@/features/admin/components/refund-review-actions'
import { formatPrice } from '@/features/events/utils'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Refund Requests · Admin' }

const STATUS_TABS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
] as const

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-500/10 text-amber-500',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500',
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminRefundsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const { status = 'OPEN' } = await searchParams
  const activeStatus = STATUS_TABS.find((t) => t.value === status)?.value ?? 'OPEN'

  const requests = await getAdminRefundRequests(
    activeStatus as Parameters<typeof getAdminRefundRequests>[0]
  )

  const totalRefundable = requests
    .filter((r) => r.status === 'OPEN' || r.status === 'UNDER_REVIEW')
    .reduce((s, r) => s + r.payment.amount, 0)

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
          <h1 className="text-[22px] font-semibold tracking-tight">Refund Requests</h1>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            Review customer complaints and process Paystack refunds.
          </p>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="border-border flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/refunds?status=${tab.value}`}
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

      {/* ── Exposure summary ── */}
      {totalRefundable > 0 && (
        <div className="border-border bg-surface rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Total refund exposure ({requests.filter((r) => r.status === 'OPEN' || r.status === 'UNDER_REVIEW').length} requests)
          </p>
          <p className="mt-0.5 text-[18px] font-bold text-red-400">{formatPrice(totalRefundable)}</p>
        </div>
      )}

      {/* ── List ── */}
      {requests.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
          <RotateCcw className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-[15px] font-semibold">No refund requests</p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Nothing in the {activeStatus.toLowerCase().replace('_', ' ')} queue.
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
                    <p className="text-[15px] font-semibold">
                      {req.user.name ?? req.user.email}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        STATUS_BADGE[req.status] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[12.5px]">{req.user.email}</p>
                  <p className="text-muted-foreground text-[11.5px]">
                    Submitted {format(req.createdAt, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <RefundReviewActions
                  refundRequestId={req.id}
                  currentStatus={req.status}
                />
              </div>

              {/* Details */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Event">
                  <Link
                    href={`/events/${req.event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 truncate transition-colors"
                  >
                    {req.event.title}
                  </Link>
                </Detail>
                <Detail label="Payment amount">
                  <p className="text-[13px] font-semibold text-red-400">
                    {formatPrice(req.payment.amount)}
                  </p>
                  {req.payment.paystackReference && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      {req.payment.paystackReference}
                    </p>
                  )}
                </Detail>
                {req.paystackRefundId && (
                  <Detail label="Paystack refund ID">
                    <p className="font-mono text-[12px]">{req.paystackRefundId}</p>
                  </Detail>
                )}
              </div>

              {/* Reason */}
              <div className="mt-3">
                <p className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
                  Customer reason
                </p>
                <p className="text-[13px] leading-relaxed">{req.reason}</p>
              </div>

              {/* Review note */}
              {req.reviewNote && (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
                  <p className="text-muted-foreground mb-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    Admin note
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
