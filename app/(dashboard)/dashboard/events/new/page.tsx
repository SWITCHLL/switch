import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId } from '@/features/organizer/queries'
import { db } from '@/lib/db'
import { CreateEventForm } from '@/features/organizer/components/create-event-form'

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
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Create Event</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Fill in the details below. You can save as draft and publish later.
        </p>
      </div>
      <CreateEventForm categories={categories} />
    </div>
  )
}
