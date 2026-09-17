/**
 * /scan/[eventId]?pin=XXX-XXX
 *
 * Public check-in scanner page for door staff.
 * No login required — authenticated via scan PIN.
 * If pin param is missing or wrong, shows a PIN entry form.
 */

import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { verifyScanPin } from '@/lib/scan-pin'
import { ScannerShell } from './scanner-shell'

interface PageProps {
  params: Promise<{ eventId: string }>
  searchParams: Promise<{ pin?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params
  const event = await db.event.findUnique({ where: { id: eventId }, select: { title: true } })
  return { title: event ? `Check-in · ${event.title}` : 'Check-in Scanner' }
}

export default async function PublicScanPage({ params, searchParams }: PageProps) {
  const { eventId } = await params
  const { pin } = await searchParams

  // Load event title for display
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  })

  // Verify the PIN if provided
  const pinValid = pin ? !!(await verifyScanPin(eventId, pin)) : false

  return (
    <ScannerShell
      eventId={eventId}
      eventTitle={event?.title ?? 'Event'}
      initialPin={pin ?? ''}
      initialPinValid={pinValid}
    />
  )
}
