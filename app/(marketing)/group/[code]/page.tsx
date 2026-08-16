import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Calendar, MapPin, Users } from 'lucide-react'
import { format } from 'date-fns'
import { getGroupOrderByCode } from '@/features/group-booking/queries'
import { getSession } from '@/lib/session'
import { formatPrice } from '@/features/events/utils'
import { GroupJoinClient } from './group-join-client'

interface Params {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params
  const order = await getGroupOrderByCode(code)
  if (!order) return { title: 'Group Booking — SWITCH' }
  return {
    title: `Join ${order.initiator.name ?? 'a group'}'s booking for ${order.event.title} — SWITCH`,
    description: `${order.paidSlots} of ${order.totalSlots} slots filled. Claim yours before it expires.`,
  }
}

export default async function GroupJoinPage({ params }: Params) {
  const { code } = await params
  const [order, session] = await Promise.all([getGroupOrderByCode(code), getSession()])

  if (!order) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'
  const joinUrl = `${appUrl}/group/${code}`

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      {/* Event banner */}
      <div className="border-border bg-surface relative overflow-hidden rounded-2xl border">
        {order.event.imageUrl && (
          <div className="relative h-[160px] w-full overflow-hidden">
            <Image
              src={order.event.imageUrl}
              alt={order.event.title}
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-5">
          <p className="text-brand-400 mb-1 text-[11px] font-semibold tracking-widest uppercase">
            Group Booking · {code}
          </p>
          <h1 className="text-[20px] leading-snug font-bold">{order.event.title}</h1>

          <div className="mt-3 flex flex-col gap-1.5">
            <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{format(order.event.startsAt, 'EEE, MMM d, yyyy · h:mm a')}</span>
            </div>
            {order.event.venue && (
              <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {order.event.venue.name}, {order.event.venue.city}
                </span>
              </div>
            )}
            <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                Organised by{' '}
                <strong className="text-foreground">{order.initiator.name ?? 'someone'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Total slots', value: order.totalSlots },
          { label: 'Paid', value: order.paidSlots },
          { label: 'Open', value: order.openSlots },
        ].map(({ label, value }) => (
          <div key={label} className="border-border bg-surface rounded-xl border p-3.5 text-center">
            <p className="text-[22px] font-bold">{value}</p>
            <p className="text-muted-foreground mt-0.5 text-[11.5px] font-medium">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground mt-2 text-right text-[12px]">
        Group total: <strong className="text-foreground">{formatPrice(order.totalAmount)}</strong>
      </p>

      {/* Interactive client section: countdown, slot list, claim button */}
      <div className="mt-6">
        <GroupJoinClient order={order} currentUserId={session?.userId ?? null} joinUrl={joinUrl} />
      </div>
    </main>
  )
}
