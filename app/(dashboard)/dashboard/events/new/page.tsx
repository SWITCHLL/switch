import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { db } from '@/lib/db'
import { CreateEventWizard } from '@/features/organizer/components/create-event-wizard'

export const metadata: Metadata = { title: 'Create Event' }

export default async function NewEventPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer || organizer.status !== 'ACTIVE') redirect('/dashboard')

  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 md:px-0">
      <CreateEventWizard categories={categories} />
    </div>
  )
}
