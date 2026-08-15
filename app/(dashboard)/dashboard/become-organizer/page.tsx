import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { getOrganizerApplication } from '@/features/onboarding/queries'
import { KycForm } from '@/features/onboarding/components/kyc-form'
import { ApplicationStatus } from '@/features/onboarding/components/application-status'

export const metadata: Metadata = {
  title: 'Become an Organizer',
}

interface PageProps {
  searchParams: Promise<{ resubmit?: string }>
}

export default async function BecomeOrganizerPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/dashboard/become-organizer')

  // Already an organizer or admin — redirect to their events dashboard
  if (session.role === 'ORGANIZER' || session.role === 'ADMIN') {
    redirect('/dashboard/events')
  }

  const application = await getOrganizerApplication(session.userId)
  const { resubmit } = await searchParams

  // Show the form if:
  // - No application exists, OR
  // - Application was rejected and user clicked "Resubmit"
  const showForm = !application || (application.kycStatus === 'REJECTED' && resubmit === '1')

  return (
    <div className="py-4">
      {/* ── Page header ── */}
      <div className="mb-8 text-center">
        <h1 className="text-[24px] font-bold tracking-tight">Become an Organizer</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-[14px]">
          {showForm
            ? 'Complete your KYC verification to start hosting paid events on SWITCH.'
            : 'Track the status of your organizer application.'}
        </p>
      </div>

      {showForm ? <KycForm /> : <ApplicationStatus application={application} />}
    </div>
  )
}
