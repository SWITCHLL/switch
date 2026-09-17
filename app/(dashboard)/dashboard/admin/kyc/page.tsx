import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ExternalLink, FileText, ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getKycApplications } from '@/features/admin/queries'
import { KycReviewActions } from '@/features/admin/components/kyc-review-actions'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'KYC Applications · Admin' }

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
] as const

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-500',
  REJECTED: 'bg-red-500/10 text-red-500',
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminKycPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')

  const { status = 'PENDING' } = await searchParams
  const activeStatus = STATUS_TABS.find((t) => t.value === status)?.value ?? 'PENDING'

  const applications = await getKycApplications(
    activeStatus as Parameters<typeof getKycApplications>[0]
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
          <h1 className="text-[22px] font-semibold tracking-tight">KYC Applications</h1>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            Review and approve organizer applications.
          </p>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="border-border flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/kyc?status=${tab.value}`}
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

      {/* ── List ── */}
      {applications.length === 0 ? (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
          <FileText className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-[15px] font-semibold">No applications</p>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Nothing in the {activeStatus.toLowerCase().replace('_', ' ')} queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="border-border bg-surface rounded-2xl border p-5"
            >
              {/* Top row */}
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold">{app.organizerName}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        STATUS_BADGE[app.kycStatus] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {app.kycStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                    {app.user.email}
                    {app.user.name ? ` · ${app.user.name}` : ''}
                  </p>
                  <p className="text-muted-foreground text-[11.5px]">
                    Submitted {format(app.createdAt, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <KycReviewActions
                  applicationId={app.id}
                  currentStatus={app.kycStatus}
                />
              </div>

              {/* Details grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="ID Type" value={app.idType} />
                <Detail
                  label="ID Document"
                  value={
                    <a
                      href={app.idDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 transition-colors"
                    >
                      View document <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
                {app.instagramUrl && (
                  <Detail
                    label="Instagram"
                    value={
                      <a
                        href={app.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 truncate transition-colors"
                      >
                        {app.instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\/?/, '@')}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    }
                  />
                )}
                {app.twitterUrl && (
                  <Detail
                    label="Twitter / X"
                    value={
                      <a
                        href={app.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 truncate transition-colors"
                      >
                        {app.twitterUrl.replace(/https?:\/\/(www\.)?(twitter|x)\.com\/?/, '@')}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    }
                  />
                )}
                {app.websiteUrl && (
                  <Detail
                    label="Website"
                    value={
                      <a
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 truncate transition-colors"
                      >
                        {app.websiteUrl.replace(/https?:\/\/(www\.)?/, '')}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    }
                  />
                )}
              </div>

              {app.bio && (
                <div className="mt-3">
                  <p className="text-muted-foreground mb-1 text-[11.5px] font-medium uppercase tracking-wide">
                    Bio
                  </p>
                  <p className="text-[13px] leading-relaxed">{app.bio}</p>
                </div>
              )}

              {/* Review note */}
              {app.reviewNote && (
                <div className="mt-3 rounded-xl bg-amber-500/5 border border-amber-500/20 px-3.5 py-2.5">
                  <p className="text-muted-foreground mb-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    Review note
                  </p>
                  <p className="text-[12.5px]">{app.reviewNote}</p>
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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground mb-0.5 text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="text-[13px]">{value}</div>
    </div>
  )
}
