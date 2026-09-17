'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Search,
  Download,
  XCircle,
  MailIcon,
  Gift,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { cancelTicket, issueComplimentaryTicket, resendConfirmationEmail, exportReservationsCSV } from '../actions'
import type { TicketRow } from '../queries'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketType {
  id: string
  name: string
}

interface ReservationTableProps {
  eventId: string
  eventTitle: string
  tickets: TicketRow[]
  total: number
  page: number
  pageSize: number
  ticketTypes: TicketType[]
  initialSearch: string
  initialTicketTypeId: string
  initialStatus: string
  initialDateFrom: string
  initialDateTo: string
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-500',
    USED: 'bg-blue-500/10 text-blue-400',
    CANCELLED: 'bg-red-500/10 text-red-500',
    REFUNDED: 'bg-amber-500/10 text-amber-500',
    EXPIRED: 'bg-zinc-500/10 text-zinc-400',
  }
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase',
        map[status] ?? 'bg-zinc-500/10 text-zinc-400'
      )}
    >
      {status}
    </span>
  )
}

// ─── Force cancel confirm dialog ──────────────────────────────────────────────

interface ForceCancelDialogProps {
  ticketNumber: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  isPending: boolean
}

function ForceCancelDialog({ ticketNumber, onConfirm, onCancel, isPending }: ForceCancelDialogProps) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <h2 className="mb-2 text-[15px] font-semibold">Cancel Checked-In Ticket</h2>
        <p className="text-muted-foreground mb-4 text-[13px]">
          Ticket <span className="font-mono text-white">{ticketNumber}</span> has already been
          used for check-in. Are you sure you want to cancel it?
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-[12px] font-medium">Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate ticket, admin correction"
            className={inputCls}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[12.5px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Force Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Issue comp dialog ────────────────────────────────────────────────────────

interface IssueCompDialogProps {
  eventId: string
  ticketTypes: TicketType[]
  onClose: () => void
  isPending: boolean
  onSubmit: (data: { ticketTypeId: string; recipientEmail: string; recipientName: string }) => void
}

function IssueCompDialog({ ticketTypes, onClose, isPending, onSubmit }: IssueCompDialogProps) {
  const [form, setForm] = useState({
    ticketTypeId: ticketTypes[0]?.id ?? '',
    recipientEmail: '',
    recipientName: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-surface border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        <h2 className="mb-4 text-[15px] font-semibold">Issue Complimentary Ticket</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium">Ticket Type *</label>
            <select
              value={form.ticketTypeId}
              onChange={(e) => setForm({ ...form, ticketTypeId: e.target.value })}
              required
              className={inputCls}
            >
              {ticketTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">Recipient Email *</label>
            <input
              type="email"
              required
              value={form.recipientEmail}
              onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
              placeholder="attendee@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium">Recipient Name *</label>
            <input
              required
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder="Full name"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[12.5px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-brand-600 flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Issue Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReservationTable({
  eventId,
  eventTitle,
  tickets,
  total,
  page,
  pageSize,
  ticketTypes,
  initialSearch,
  initialTicketTypeId,
  initialStatus,
  initialDateFrom,
  initialDateTo,
}: ReservationTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local state for filters (controlled)
  const [search, setSearch] = useState(initialSearch)
  const [ticketTypeId, setTicketTypeId] = useState(initialTicketTypeId)
  const [status, setStatus] = useState(initialStatus)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)

  // Dialog state
  const [forceCancelTicket, setForceCancelTicket] = useState<TicketRow | null>(null)
  const [showIssueComp, setShowIssueComp] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Export loading state
  const [isExporting, setIsExporting] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Navigate with updated filters
  const navigate = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      // Reset to page 1 on filter change
      params.set('page', '1')

      const fields: Record<string, string> = {
        search,
        ticketTypeId,
        status,
        dateFrom,
        dateTo,
        ...overrides,
      }

      for (const [key, val] of Object.entries(fields)) {
        if (val) {
          params.set(key, val)
        } else {
          params.delete(key)
        }
      }

      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, search, ticketTypeId, status, dateFrom, dateTo]
  )

  // Debounced search
  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ search: val })
    }, 500)
  }

  function handleFilterChange(key: string, val: string) {
    if (key === 'ticketTypeId') setTicketTypeId(val)
    if (key === 'status') setStatus(val)
    if (key === 'dateFrom') setDateFrom(val)
    if (key === 'dateTo') setDateTo(val)
    navigate({ [key]: val })
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  // ── Cancel action ─────────────────────────────────────────────────────────

  function handleCancelClick(ticket: TicketRow) {
    setActionError(null)
    setActionSuccess(null)
    if (ticket.status === 'USED') {
      setForceCancelTicket(ticket)
    } else {
      startTransition(async () => {
        const result = await cancelTicket({ ticketId: ticket.id, eventId })
        if (result.success) {
          setActionSuccess('Ticket cancelled successfully.')
          router.refresh()
        } else {
          setActionError(result.error)
        }
      })
    }
  }

  function handleForceCancelConfirm(reason: string) {
    if (!forceCancelTicket) return
    startTransition(async () => {
      const result = await cancelTicket({
        ticketId: forceCancelTicket.id,
        eventId,
        reason,
        force: true,
      })
      setForceCancelTicket(null)
      if (result.success) {
        setActionSuccess('Ticket force-cancelled successfully.')
        router.refresh()
      } else {
        setActionError(result.error)
      }
    })
  }

  // ── Issue comp action ─────────────────────────────────────────────────────

  function handleIssueCompSubmit(data: {
    ticketTypeId: string
    recipientEmail: string
    recipientName: string
  }) {
    startTransition(async () => {
      const result = await issueComplimentaryTicket({
        eventId,
        ticketTypeId: data.ticketTypeId,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
      })
      setShowIssueComp(false)
      if (result.success) {
        setActionSuccess('Complimentary ticket issued successfully.')
        router.refresh()
      } else {
        setActionError(result.error)
      }
    })
  }

  // ── Resend email ──────────────────────────────────────────────────────────

  function handleResendEmail(ticket: TicketRow) {
    setActionError(null)
    setActionSuccess(null)
    startTransition(async () => {
      const result = await resendConfirmationEmail({ ticketId: ticket.id })
      if (result.success) {
        setActionSuccess('Confirmation email sent.')
      } else {
        setActionError(result.error)
      }
    })
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  async function handleExportCSV() {
    setActionError(null)
    setIsExporting(true)
    try {
      const result = await exportReservationsCSV(eventId)
      if (result.success) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-reservations.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        setActionError(result.error)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      {/* ── Dialogs ── */}
      {forceCancelTicket && (
        <ForceCancelDialog
          ticketNumber={forceCancelTicket.ticketNumber}
          onConfirm={handleForceCancelConfirm}
          onCancel={() => setForceCancelTicket(null)}
          isPending={isPending}
        />
      )}
      {showIssueComp && (
        <IssueCompDialog
          eventId={eventId}
          ticketTypes={ticketTypes}
          onClose={() => setShowIssueComp(false)}
          isPending={isPending}
          onSubmit={handleIssueCompSubmit}
        />
      )}

      <div className="border-border bg-surface rounded-2xl border">
        {/* ── Toolbar ── */}
        <div className="border-border flex flex-wrap items-center gap-3 border-b p-4">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search name, email, ticket #…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(inputCls, 'pl-8')}
            />
          </div>

          {/* Ticket type filter */}
          <select
            value={ticketTypeId}
            onChange={(e) => handleFilterChange('ticketTypeId', e.target.value)}
            className={cn(inputCls, 'w-auto')}
            aria-label="Filter by ticket type"
          >
            <option value="">All Ticket Types</option>
            {ticketTypes.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={cn(inputCls, 'w-auto')}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="USED">Used</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className={cn(inputCls, 'w-auto')}
            aria-label="Filter from date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className={cn(inputCls, 'w-auto')}
            aria-label="Filter to date"
          />

          {/* Actions */}
          <button
            type="button"
            onClick={() => setShowIssueComp(true)}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
          >
            <Gift className="h-3.5 w-3.5" />
            Issue Comp
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting || isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-muted"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </button>
        </div>

        {/* ── Feedback messages ── */}
        {actionError && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-500">
            {actionSuccess}
          </div>
        )}

        {/* ── Count summary ── */}
        <div className="border-border border-b px-4 py-2.5">
          <p className="text-muted-foreground text-[12px]">
            {total === 0 ? 'No tickets found' : `${total} ticket${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* ── Table ── */}
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-[14px]">No tickets match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-border border-b text-left">
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Ticket #
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Attendee
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Seat
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Issued
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-border hover:bg-muted/30 border-b transition-colors last:border-b-0"
                  >
                    {/* Ticket number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px]">{ticket.ticketNumber}</span>
                        {ticket.isComplimentary && (
                          <span
                            title="Complimentary"
                            className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400"
                          >
                            COMP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Attendee */}
                    <td className="px-4 py-3">
                      <p className="font-medium">{ticket.user.name ?? '—'}</p>
                      <p className="text-muted-foreground text-[11.5px]">{ticket.user.email}</p>
                    </td>

                    {/* Ticket type */}
                    <td className="px-4 py-3 text-[12.5px]">{ticket.ticketType.name}</td>

                    {/* Seat */}
                    <td className="text-muted-foreground px-4 py-3 text-[12.5px]">
                      {ticket.eventSeat?.seat.label ?? 'GA'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>

                    {/* Issued date */}
                    <td className="text-muted-foreground px-4 py-3 text-[12px]">
                      {new Date(ticket.issuedAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-[12.5px]">
                      {ticket.isComplimentary ? (
                        <span className="text-violet-400">Free (Comp)</span>
                      ) : ticket.order?.payment ? (
                        <span>
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: ticket.order.payment.currency,
                            minimumFractionDigits: 0,
                          }).format(ticket.order.payment.amount / 100)}
                        </span>
                      ) : ticket.ticketType.price === 0 ? (
                        <span className="text-emerald-500">Free</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Resend email */}
                        <button
                          type="button"
                          onClick={() => handleResendEmail(ticket)}
                          disabled={isPending || ticket.status === 'CANCELLED'}
                          title="Resend confirmation email"
                          aria-label={`Resend confirmation email for ${ticket.ticketNumber}`}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            ticket.status === 'CANCELLED'
                              ? 'cursor-not-allowed opacity-30'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <MailIcon className="h-4 w-4" />
                        </button>

                        {/* Cancel ticket */}
                        <button
                          type="button"
                          onClick={() => handleCancelClick(ticket)}
                          disabled={
                            isPending ||
                            ticket.status === 'CANCELLED' ||
                            ticket.status === 'REFUNDED'
                          }
                          title={
                            ticket.status === 'USED'
                              ? 'Cancel checked-in ticket (requires confirmation)'
                              : 'Cancel ticket'
                          }
                          aria-label={`Cancel ticket ${ticket.ticketNumber}`}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED'
                              ? 'cursor-not-allowed opacity-30'
                              : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                          )}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="border-border flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-[12px]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] font-medium">{page}</span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const inputCls = cn(
  'rounded-lg border border-border bg-background px-3 py-2',
  'text-[13px] text-foreground placeholder:text-muted-foreground',
  'outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30'
)
