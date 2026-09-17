import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { Ticket, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getUserTickets } from '@/features/organizer/queries'
import { TicketCard } from '@/features/tickets/components/ticket-card'
import { TicketsFilter } from '@/features/tickets/components/tickets-filter'

export const metadata: Metadata = {
  title: 'My Tickets',
  description: 'View and manage your event tickets',
}

interface TicketsPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : undefined

  // Fetch tickets with optional status filter
  const tickets = await getUserTickets(session.userId, {
    status: statusFilter,
  })

  const hasActiveFilters = Boolean(statusFilter)

  // Count tickets by status
  const ticketStats = {
    total: tickets.length,
    active: tickets.filter((t) => t.status === 'ACTIVE').length,
    used: tickets.filter((t) => t.status === 'USED').length,
    refunded: tickets.filter((t) => t.status === 'REFUNDED').length,
  }

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
            <Ticket className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Tickets</h1>
            <p className="text-muted-foreground text-sm">
              {ticketStats.total} {ticketStats.total === 1 ? 'ticket' : 'tickets'} •{' '}
              {ticketStats.active} active
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Total Tickets</div>
          <div className="mt-1.5 text-2xl font-bold">{ticketStats.total}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Valid</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-400">{ticketStats.active}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Used</div>
          <div className="mt-1.5 text-2xl font-bold text-zinc-400">{ticketStats.used}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs text-zinc-400">Refunded</div>
          <div className="mt-1.5 text-2xl font-bold text-amber-400">{ticketStats.refunded}</div>
        </div>
      </div>

      {/* ── Filter ── */}
      <TicketsFilter hasActiveFilters={hasActiveFilters} />

      {/* ── Tickets grid ── */}
      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <AlertCircle className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">
            {hasActiveFilters ? 'No tickets match your filter' : 'No tickets yet'}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {hasActiveFilters
              ? 'Try adjusting your filters to find what you are looking for.'
              : 'Purchase tickets to events and they will appear here.'}
          </p>
        </div>
      )}
    </div>
  )
}
