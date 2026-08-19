import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { GroupSlotCheckoutClient } from './group-slot-checkout-client'

export const metadata: Metadata = { title: 'Complete Payment — Group Booking' }

interface PageProps {
  searchParams: Promise<{
    slotId?: string
    code?: string
  }>
}

export default async function GroupSlotCheckoutPage({ searchParams }: PageProps) {
  const { slotId, code } = await searchParams

  const session = await getSession()
  if (!session) {
    redirect(`/login?next=/checkout/group-slot?slotId=${slotId ?? ''}&code=${code ?? ''}`)
  }

  if (!slotId) redirect(code ? `/group/${code}` : '/dashboard/tickets')

  // Load the slot with enough context to render the page
  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    include: {
      groupOrder: {
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          requireFullPayment: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              imageUrl: true,
              startsAt: true,
              venue: { select: { name: true, city: true } },
            },
          },
        },
      },
      eventSeat: {
        select: {
          seat: {
            select: {
              label: true,
              row: { select: { label: true } },
            },
          },
          ticketType: { select: { name: true } },
        },
      },
      ticketType: { select: { name: true } },
    },
  })

  if (!slot) notFound()

  // Security: only the claimer can access this page
  if (slot.claimedBy !== session.userId) {
    redirect(`/group/${slot.groupOrder.code}`)
  }

  // If slot is already paid, redirect to the join page
  if (slot.status === 'PAID') {
    redirect(`/group/${slot.groupOrder.code}?paid=1`)
  }

  // If group has expired/cancelled/completed unexpectedly, redirect back
  if (slot.groupOrder.status !== 'PENDING') {
    redirect(`/group/${slot.groupOrder.code}`)
  }

  // If slot is no longer held (e.g. released), redirect back
  if (slot.status !== 'HELD') {
    redirect(`/group/${slot.groupOrder.code}`)
  }

  const ticketName =
    slot.label ??
    slot.eventSeat?.ticketType?.name ??
    slot.ticketType?.name ??
    'Ticket'

  const seatLabel = slot.eventSeat?.seat
    ? `Row ${slot.eventSeat.seat.row.label} · Seat ${slot.eventSeat.seat.label}`
    : null

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session.email} />

      <main className="flex-1 pt-[60px]">
        {/* Top bar */}
        <div className="border-border/60 border-b">
          <div className="mx-auto flex max-w-[720px] items-center gap-4 px-5 py-3.5 sm:px-8">
            <Link
              href={`/group/${slot.groupOrder.code}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[13px] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to group
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-[720px] px-5 py-8 sm:px-8 sm:py-10">
          <GroupSlotCheckoutClient
            slotId={slotId}
            groupCode={slot.groupOrder.code}
            expiresAt={slot.groupOrder.expiresAt}
            event={slot.groupOrder.event}
            ticketName={ticketName}
            seatLabel={seatLabel}
            amount={slot.price}
            currency={slot.currency}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
