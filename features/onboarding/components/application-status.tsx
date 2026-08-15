import Link from 'next/link'
import { Clock, CheckCircle2, XCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { KycStatus } from '@/app/generated/prisma/client'

interface ApplicationStatusProps {
  application: {
    id: string
    organizerName: string
    kycStatus: KycStatus
    reviewNote: string | null
    createdAt: Date
    updatedAt: Date
  }
}

const STATUS_CONFIG: Record<
  KycStatus,
  { label: string; icon: React.ElementType; colorCls: string; bgCls: string; borderCls: string }
> = {
  PENDING: {
    label: 'Pending Review',
    icon: Clock,
    colorCls: 'text-amber-400',
    bgCls: 'bg-amber-500/10',
    borderCls: 'border-amber-500/20',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    icon: Search,
    colorCls: 'text-blue-400',
    bgCls: 'bg-blue-500/10',
    borderCls: 'border-blue-500/20',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    colorCls: 'text-emerald-400',
    bgCls: 'bg-emerald-500/10',
    borderCls: 'border-emerald-500/20',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    colorCls: 'text-red-400',
    bgCls: 'bg-red-500/10',
    borderCls: 'border-red-500/20',
  },
}

export function ApplicationStatus({ application }: ApplicationStatusProps) {
  const config = STATUS_CONFIG[application.kycStatus]
  const Icon = config.icon

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      {/* Status card */}
      <div className={cn('rounded-2xl border p-6', config.bgCls, config.borderCls)}>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              config.bgCls
            )}
          >
            <Icon className={cn('h-5 w-5', config.colorCls)} />
          </div>
          <div className="flex-1">
            <p className={cn('text-[15px] font-semibold', config.colorCls)}>{config.label}</p>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              {application.kycStatus === 'PENDING' &&
                'Your application is in the queue. We review applications within 1–3 business days.'}
              {application.kycStatus === 'UNDER_REVIEW' &&
                'Our compliance team is currently reviewing your documents.'}
              {application.kycStatus === 'APPROVED' &&
                'Your organizer account is active. You can now create and publish paid events.'}
              {application.kycStatus === 'REJECTED' &&
                'Your application was not approved. See the details below and resubmit.'}
            </p>
          </div>
        </div>

        {/* Review note (rejection reason) */}
        {application.reviewNote && (
          <div className="border-border/50 mt-4 rounded-xl border bg-black/20 px-4 py-3">
            <p className="text-muted-foreground text-[12px] font-medium tracking-wider uppercase">
              Reviewer note
            </p>
            <p className="mt-1 text-[13.5px]">{application.reviewNote}</p>
          </div>
        )}
      </div>

      {/* Application details */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h3 className="mb-4 text-[14px] font-semibold">Application Details</h3>
        <dl className="space-y-3">
          <Row label="Organizer Name" value={application.organizerName} />
          <Row
            label="Submitted"
            value={format(new Date(application.createdAt), 'MMM d, yyyy · h:mm a')}
          />
          <Row
            label="Last updated"
            value={format(new Date(application.updatedAt), 'MMM d, yyyy · h:mm a')}
          />
        </dl>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="border-border hover:bg-muted/50 flex-1 rounded-xl border py-2.5 text-center text-[13.5px] font-medium transition-colors"
        >
          Back to Dashboard
        </Link>

        {application.kycStatus === 'REJECTED' && (
          <Link
            href="/dashboard/become-organizer?resubmit=1"
            className="from-brand-600 flex-1 rounded-xl bg-gradient-to-r to-violet-600 py-2.5 text-center text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Resubmit Application
          </Link>
        )}

        {application.kycStatus === 'APPROVED' && (
          <Link
            href="/dashboard/events/new"
            className="from-brand-600 flex-1 rounded-xl bg-gradient-to-r to-violet-600 py-2.5 text-center text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Create Your First Event
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-[13px]">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  )
}
