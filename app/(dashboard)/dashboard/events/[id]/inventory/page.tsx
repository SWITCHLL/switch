import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId, getEventInventory } from '@/features/organizer/queries'
import { InventoryDashboard } from '@/features/organizer/components/inventory-dashboard'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    select: { title: true },
  })
  return { title: event ? `Inventory — ${event.title}` : 'Inventory' }
}

export default async function InventoryPage({ params }: PageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  // Load event for title / ownership check
  const event = await db.event.findUnique({
    where: { id, organizerId: organizer.id },
    select: { id: true, title: true },
  })
  if (!event) notFound()

  const inventory = await getEventInventory(id, organizer.id)
  if (!inventory) notFound()

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      {/* ── Back ── */}
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to event
      </Link>

      {/* ── Header ── */}
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1 text-[13px]">{event.title}</p>
      </div>

      {/* ── Dashboard ── */}
      <InventoryDashboard inventory={inventory} eventTitle={event.title} />
    </div>
  )
}
