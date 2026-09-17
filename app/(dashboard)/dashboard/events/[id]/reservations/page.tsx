import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getOrganizerByUserId, getEventReservations } from '@/features/organizer/queries'
import { ReservationTable } from '@/features/organizer/components/reservation-table'
import { db } from '@/lib/db'
import { TicketStatus } from '@/app/generated/prisma/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: 'Reservations' }
}

export default async function ReservationsPage({ params, searchParams }: PageProps) {
  const [{ id }, rawSearch] = await Promise.all([params, searchParams])

  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') redirect('/dashboard')

  const organizer = await getOrganizerByUserId(session.userId)
  if (!organizer) redirect('/dashboard')

  // Parse search params
  const search = rawSearch.search ?? ''
  const ticketTypeId = rawSearch.ticketTypeId ?? ''
  const statusParam = rawSearch.status ?? ''
  const page = Math.max(1, parseInt(rawSearch.page ?? '1', 10))
  const dateFrom = rawSearch.dateFrom ? new Date(rawSearch.dateFrom) : undefined
  const dateTo = rawSearch.dateTo ? new Date(rawSearch.dateTo) : undefined

  const validStatuses: TicketStatus[] = ['ACTIVE', 'USED', 'CANCELLED', 'REFUNDED', 'EXPIRED']
  const status =
    statusParam && validStatuses.includes(statusParam as TicketStatus)
      ? (statusParam as TicketStatus)
      : undefined

  // Load ticket types for filter dropdown
  const event = await db.event.findUnique({
    where: { id, organizerId: organizer.id },
    select: {
      id: true,
      title: true,
      slug: true,
      ticketTypes: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
    },
  })
  if (!event) notFound()

  const PAGE_SIZE = 25
  const { tickets, total } = await getEventReservations(
    id,
    organizer.id,
    {
      search: search || undefined,
      ticketTypeId: ticketTypeId || undefined,
      status,
      dateFrom,
      dateTo,
    },
    { page, pageSize: PAGE_SIZE }
  )

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
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
        <h1 className="text-[20px] font-semibold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground mt-1 text-[13px]">{event.title}</p>
      </div>

      {/* ── Table ── */}
      <ReservationTable
        eventId={id}
        eventTitle={event.title}
        tickets={tickets}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        ticketTypes={event.ticketTypes}
        initialSearch={search}
        initialTicketTypeId={ticketTypeId}
        initialStatus={statusParam}
        initialDateFrom={rawSearch.dateFrom ?? ''}
        initialDateTo={rawSearch.dateTo ?? ''}
      />
    </div>
  )
}
