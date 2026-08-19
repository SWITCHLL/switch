import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { CheckinScanner } from '@/features/checkin/components/checkin-scanner'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id }, select: { title: true } })
  return { title: event ? `Check-in · ${event.title}` : 'Check-in' }
}

export default async function ScanPage({ params }: PageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session) redirect('/login')

  // Must be the organizer of this event or an admin
  let event: { id: string; title: string } | null = null

  if (session.role === 'ADMIN') {
    event = await db.event.findUnique({ where: { id }, select: { id: true, title: true } })
  } else {
    const organizer = await db.organizer.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    if (organizer) {
      event = await db.event.findUnique({
        where: { id, organizerId: organizer.id },
        select: { id: true, title: true },
      })
    }
  }

  if (!event) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[13px] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to event
        </Link>
      </div>

      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Check-in Scanner</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Scan attendee QR codes to mark tickets as used.
        </p>
      </div>

      <CheckinScanner eventId={event.id} eventTitle={event.title} />
    </div>
  )
}
