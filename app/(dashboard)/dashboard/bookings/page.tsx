import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { Users, AlertCircle, ArrowRight } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getMyGroupOrders, getGroupOrderById } from '@/features/group-booking/queries'
import { BookingCard } from '@/features/group-booking/components/booking-card'
import { BookingSlotsList } from '@/features/group-booking/components/booking-slots-list'

export const metadata: Metadata = {
  title: 'My Bookings',
  description: 'View and manage your group event bookings',
}

export default async function BookingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Get group orders where user is the initiator
  const bookings = await getMyGroupOrders(session.userId)

  // Fetch full details for each booking (with slots)
  const bookingDetails = await Promise.all(
    bookings.map(async (booking) => {
      const detail = await getGroupOrderById(booking.id)
      return detail
    })
  )

  const activeBookings = bookingDetails.filter(
    (b): b is NonNullable<typeof b> => b !== null && (b.status === 'PENDING' || b.status === 'COMPLETE')
  )
  const expiredBookings = bookingDetails.filter(
    (b): b is NonNullable<typeof b> => b !== null && (b.status === 'EXPIRED' || b.status === 'CANCELLED')
  )

  // Count statistics
  const bookingStats = {
    total: bookingDetails.filter((b): b is NonNullable<typeof b> => b !== null).length,
    active: activeBookings.length,
    pending: bookingDetails.filter((b): b is NonNullable<typeof b> => b !== null && b.status === 'PENDING').length,
    complete: bookingDetails.filter((b): b is NonNullable<typeof b> => b !== null && b.status === 'COMPLETE').length,
  }

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
            <Users className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">My Bookings</h1>
            <p className="text-muted-foreground text-sm">
              {bookingStats.total} {bookingStats.total === 1 ? 'booking' : 'bookings'} •{' '}
              {bookingStats.active} active
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick stats ── */}
      {bookingStats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400">Total Bookings</div>
            <div className="mt-1.5 text-2xl font-bold">{bookingStats.total}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400">Active</div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-400">{bookingStats.active}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400">Pending</div>
            <div className="mt-1.5 text-2xl font-bold text-amber-400">{bookingStats.pending}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400">Complete</div>
            <div className="mt-1.5 text-2xl font-bold text-brand-400">{bookingStats.complete}</div>
          </div>
        </div>
      )}

      {/* ── Active Bookings ── */}
      {activeBookings.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Active Bookings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeBookings.map((booking) => (
              <div key={booking.id} className="space-y-3">
                <BookingCard
                  id={booking.id}
                  code={booking.code}
                  status={booking.status}
                  expiresAt={booking.expiresAt}
                  event={booking.event}
                  totalSlots={booking.totalSlots}
                  paidSlots={booking.paidSlots}
                  requireFullPayment={booking.requireFullPayment}
                />
                <BookingSlotsList
                  slots={booking.slots}
                  totalSlots={booking.totalSlots}
                  totalAmount={booking.totalAmount}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Completed/Expired Bookings ── */}
      {expiredBookings.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Past Bookings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiredBookings.map((booking) => (
              <div key={booking.id} className="space-y-3">
                <BookingCard
                  id={booking.id}
                  code={booking.code}
                  status={booking.status}
                  expiresAt={booking.expiresAt}
                  event={booking.event}
                  totalSlots={booking.totalSlots}
                  paidSlots={booking.paidSlots}
                  requireFullPayment={booking.requireFullPayment}
                />
                <BookingSlotsList
                  slots={booking.slots}
                  totalSlots={booking.totalSlots}
                  totalAmount={booking.totalAmount}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {bookingStats.total === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <AlertCircle className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">No group bookings yet</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Create a group booking by selecting "Group" when purchasing tickets for an event.
          </p>
          <Link
            href="/events"
            className="from-brand-600 mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Browse Events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ── Info card ── */}
      <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-brand-300">How group bookings work</h3>
          <p className="text-xs text-zinc-400">
            Create a group booking to split ticket costs with friends. Share the group link, each member claims a slot
            and pays separately. No one person is on the hook for the whole bill.
          </p>
        </div>
      </div>
    </div>
  )
}
