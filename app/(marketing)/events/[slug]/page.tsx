import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, Tag, ChevronLeft, Share2 } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { getEventBySlug } from '@/features/events'
import { formatPrice, getMinPrice, isSoldOut } from '@/features/events'
import { TicketSelector } from '@/features/events/components/ticket-selector'
import { TicketSelectorSkeleton } from '@/features/events/components/ticket-selector-skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Event Not Found' }

  return {
    title: event.title,
    description: event.description ?? undefined,
    openGraph: {
      title: event.title,
      description: event.description ?? undefined,
      images: event.imageUrl ? [{ url: event.imageUrl }] : [],
    },
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params
  const [session, event] = await Promise.all([getSession(), getEventBySlug(slug)])

  if (!event) notFound()

  const minPrice = getMinPrice(event)
  const soldOut = isSoldOut(event)
  const hasImage = Boolean(event.imageUrl)

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session?.email} />

      <main className="flex-1 pt-[60px]">
        {/* ── Hero banner ── */}
        <div
          className={cn(
            'relative w-full overflow-hidden',
            hasImage ? 'h-[320px] sm:h-[420px]' : 'h-[180px] sm:h-[220px]'
          )}
        >
          {hasImage ? (
            <>
              <Image
                src={event.imageUrl!}
                alt={event.title}
                fill
                priority
                className="object-cover object-center"
                sizes="100vw"
              />
              <div className="from-background via-background/40 absolute inset-0 bg-gradient-to-t to-transparent" />
            </>
          ) : (
            <div className="from-brand-950 via-background to-background absolute inset-0 bg-gradient-to-br" />
          )}

          {/* Category badge */}
          {event.category && (
            <div className="absolute top-4 left-4 sm:top-6 sm:left-8">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold text-white backdrop-blur-sm"
                style={{ backgroundColor: event.category.color ?? 'rgba(99,102,241,0.75)' }}
              >
                <Tag className="h-3 w-3" />
                {event.category.name}
              </span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          {/* Back link */}
          <Link
            href="/events"
            className="text-muted-foreground hover:text-foreground -mt-2 mb-6 inline-flex items-center gap-1.5 text-[13px] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All events
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            {/* ── Left: event details ── */}
            <div>
              {/* Status pill */}
              {event.status !== 'PUBLISHED' && (
                <span className="mb-3 inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                  {event.status.replace('_', ' ')}
                </span>
              )}

              <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-[34px]">
                {event.title}
              </h1>

              {/* Meta */}
              <div className="mt-5 flex flex-wrap gap-4">
                <MetaItem icon={Calendar}>{format(event.startsAt, 'EEE, MMM d, yyyy')}</MetaItem>
                <MetaItem icon={Clock}>
                  {format(event.startsAt, 'h:mm a')}
                  {event.endsAt && ` – ${format(event.endsAt, 'h:mm a')}`}
                </MetaItem>
                {event.venue && (
                  <MetaItem icon={MapPin}>
                    {event.venue.name}, {event.venue.city}
                    {event.venue.state ? `, ${event.venue.state}` : ''}
                  </MetaItem>
                )}
                <MetaItem icon={Users}>{event._count.tickets.toLocaleString()} going</MetaItem>
              </div>

              {/* Organizer */}
              <div className="border-border/60 mt-6 flex items-center gap-3 border-t pt-6">
                {event.organizer.logoUrl ? (
                  <Image
                    src={event.organizer.logoUrl}
                    alt={event.organizer.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-brand-600/20 text-brand-400 flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold">
                    {event.organizer.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-[11px]">Organised by</p>
                  <p className="text-[14px] font-medium">{event.organizer.name}</p>
                </div>
                <button
                  className="border-border hover:bg-muted ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                  aria-label="Share event"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>

              {/* Description */}
              {event.description && (
                <div className="border-border/60 mt-6 border-t pt-6">
                  <h2 className="mb-3 text-[15px] font-semibold">About this event</h2>
                  <div className="text-muted-foreground prose prose-sm max-w-none text-[14.5px] leading-[1.75]">
                    {event.description.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Venue details */}
              {event.venue && (
                <div className="border-border/60 mt-6 border-t pt-6">
                  <h2 className="mb-3 text-[15px] font-semibold">Venue</h2>
                  <div className="bg-muted/40 border-border rounded-xl border p-4">
                    <p className="font-medium">{event.venue.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                      {event.venue.city}
                      {event.venue.state ? `, ${event.venue.state}` : ''}
                      {event.venue.country ? `, ${event.venue.country}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: ticket selector (sticky) ── */}
            <div className="lg:sticky lg:top-[80px] lg:self-start">
              <Suspense fallback={<TicketSelectorSkeleton />}>
                <TicketSelector
                  event={event}
                  minPrice={minPrice}
                  soldOut={soldOut}
                  isLoggedIn={Boolean(session)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-[13.5px]">
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
