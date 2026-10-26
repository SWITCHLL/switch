import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { PaymentConfirmationPoller } from '@/features/checkout/components/payment-confirmation-poller'

export const metadata: Metadata = { title: 'Booking Confirmed' }

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reservation?: string; type?: string }>
}

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { reservation: reservationId, type } = await searchParams

  const session = await getSession()
  if (!session) redirect('/login')
  if (!reservationId) redirect(`/events/${slug}`)

  const isGA    = type === 'ga'
  const isShows = type === 'shows'
  const orderType = isGA ? 'ga' : isShows ? 'shows' : 'reserved'

  // Load reservation — accept ACTIVE (webhook not yet fired) and COMPLETED
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId, userId: session.userId },
    select: {
      status: true,
      eventId: true,
      createdAt: true,
      expiresAt: true,
      event: {
        select: {
          title: true,
          slug: true,
          imageUrl: true,
          startsAt: true,
          endsAt: true,
          venue: { select: { name: true, city: true, state: true } },
        },
      },
      eventSeats: {
        select: {
          id: true,
          price: true,
          tickets: { select: { id: true, ticketNumber: true } },
          seat: { select: { label: true } },
          ticketType: { select: { name: true, currency: true } },
        },
      },
    },
  })

  // No reservation, wrong owner, or explicitly cancelled → back to event
  if (!reservation) redirect(`/events/${slug}`)
  if (reservation.status === 'CANCELLED') redirect(`/events/${slug}`)

  const isPending = reservation.status !== 'COMPLETED'

  // ── Build initialData for the fast path (reservation already COMPLETED) ───
  // When still pending we pass nothing — the poller fetches it via the API.

  type InitialData = React.ComponentProps<typeof PaymentConfirmationPoller>['initialData']
  let initialData: InitialData | undefined

  if (!isPending) {
    const event = {
      title:    reservation.event.title,
      slug:     reservation.event.slug,
      imageUrl: reservation.event.imageUrl,
      startsAt: reservation.event.startsAt.toISOString(),
      endsAt:   reservation.event.endsAt?.toISOString() ?? null,
      venue:    reservation.event.venue ?? null,
    }

    if (isShows) {
      // Fetch show tickets via raw SQL (time_slot_tickets not in generated client)
      interface ShowRow {
        ticketId:       string
        ticketNumber:   string
        ticketTypeId:   string
        ticketTypeName: string
        price:          number
        currency:       string
        slotLabel:      string
      }
      const rows: ShowRow[] = await db.$queryRaw`
        SELECT
          t."id"          AS "ticketId",
          t."ticketNumber",
          tt."id"         AS "ticketTypeId",
          tt."name"       AS "ticketTypeName",
          tt."price",
          tt."currency",
          ts."label"      AS "slotLabel"
        FROM "tickets" t
        JOIN "ticket_types" tt ON tt."id" = t."ticketTypeId"
        INNER JOIN "time_slot_tickets" tst ON tst."ticketId" = t."id"
        LEFT JOIN "time_slots" ts ON ts."id" = tst."timeSlotId"
        WHERE t."eventId"  = ${reservation.eventId}
          AND t."userId"   = ${session.userId}
          AND t."issuedAt" >= ${new Date(reservation.createdAt.getTime() - 60000)}
          AND t."status"   = 'ACTIVE'
        ORDER BY COALESCE(ts."startsAt", t."issuedAt"), tt."name"
      `

      const groupMap: Record<
        string,
        { ticketTypeId: string; name: string; price: number; currency: string; tickets: { id: string; ticketNumber: string }[] }
      > = {}
      for (const row of rows) {
        const key         = `${row.slotLabel ?? ''}::${row.ticketTypeId}`
        const displayName = row.slotLabel
          ? `${row.slotLabel} — ${row.ticketTypeName}`
          : row.ticketTypeName
        if (!groupMap[key]) {
          groupMap[key] = {
            ticketTypeId: row.ticketTypeId,
            name:         displayName,
            price:        row.price,
            currency:     row.currency,
            tickets:      [],
          }
        }
        groupMap[key]!.tickets.push({ id: row.ticketId, ticketNumber: row.ticketNumber })
      }

      initialData = {
        event,
        gaTicketGroups:   Object.values(groupMap),
        reservedTickets:  [],
        totalTicketCount: rows.length,
        totalPaid:        rows.reduce((s, r) => s + r.price, 0),
        currency:         rows[0]?.currency ?? 'NGN',
      }
    } else if (isGA) {
      const gaTickets = await db.ticket.findMany({
        where: {
          eventId:  reservation.eventId,
          userId:   session.userId,
          issuedAt: { gte: reservation.createdAt },
        },
        select: {
          id:           true,
          ticketNumber: true,
          ticketType:   { select: { id: true, name: true, price: true, currency: true } },
        },
        orderBy: { issuedAt: 'asc' },
      })

      const groupMap: Record<
        string,
        { ticketTypeId: string; name: string; price: number; currency: string; tickets: { id: string; ticketNumber: string }[] }
      > = {}
      for (const t of gaTickets) {
        const key = t.ticketType.id
        if (!groupMap[key]) {
          groupMap[key] = {
            ticketTypeId: key,
            name:         t.ticketType.name,
            price:        t.ticketType.price,
            currency:     t.ticketType.currency,
            tickets:      [],
          }
        }
        groupMap[key]!.tickets.push({ id: t.id, ticketNumber: t.ticketNumber })
      }

      initialData = {
        event,
        gaTicketGroups:   Object.values(groupMap),
        reservedTickets:  [],
        totalTicketCount: gaTickets.length,
        totalPaid:        gaTickets.reduce((s, t) => s + t.ticketType.price, 0),
        currency:         gaTickets[0]?.ticketType.currency ?? 'NGN',
      }
    } else {
      const reservedTickets = reservation.eventSeats.map((es) => ({
        id:             es.tickets[0]?.id ?? es.id,
        ticketNumber:   es.tickets[0]?.ticketNumber ?? '—',
        ticketTypeName: es.ticketType?.name ?? 'Ticket',
        seatLabel:      es.seat?.label ?? null,
        price:          es.price,
        currency:       es.ticketType?.currency ?? 'NGN',
      }))

      initialData = {
        event,
        reservedTickets,
        gaTicketGroups:   [],
        totalTicketCount: reservedTickets.length,
        totalPaid:        reservedTickets.reduce((s, t) => s + t.price, 0),
        currency:         reservedTickets[0]?.currency ?? 'NGN',
      }
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session.email} />

      <main className="flex-1 pt-[60px]">
        <PaymentConfirmationPoller
          reservationId={reservationId}
          eventSlug={slug}
          orderType={orderType}
          initiallyConfirmed={!isPending}
          initialData={initialData}
        />
      </main>

      <SiteFooter />
    </div>
  )
}
