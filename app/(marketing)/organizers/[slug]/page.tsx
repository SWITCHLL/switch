import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Image from 'next/image'
import { Building2, Globe, CalendarDays } from 'lucide-react'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { SiteFooter } from '@/components/layout/site-footer'
import { EventCard } from '@/features/events/components/event-card'
import { getOrganizerProfile } from '@/features/organizer/public-queries'
import { siteConfig } from '@/config/site'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const organizer = await getOrganizerProfile(slug)
  if (!organizer) return { title: 'Organiser Not Found' }

  return {
    title: `${organizer.name} | SWITCH`,
    description: organizer.bio ?? `Events by ${organizer.name} on SWITCH`,
    openGraph: {
      title: organizer.name,
      description: organizer.bio ?? `Events by ${organizer.name}`,
      images: organizer.logoUrl ? [{ url: organizer.logoUrl, width: 400, height: 400 }] : [],
      type: 'profile',
    },
    alternates: { canonical: `${siteConfig.url}/organizers/${slug}` },
  }
}

export default async function OrganizerProfilePage({ params }: PageProps) {
  const { slug } = await params
  const organizer = await getOrganizerProfile(slug)

  if (!organizer) notFound()

  const upcomingEvents = organizer.events.filter(
    (e) => e.status === 'PUBLISHED' && new Date(e.startsAt) >= new Date()
  )
  const pastEvents = organizer.events.filter(
    (e) =>
      e.status === 'COMPLETED' ||
      (e.status === 'PUBLISHED' && new Date(e.startsAt) < new Date())
  )

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1 pt-[60px]">
        {/* ── Profile hero ───────────────────────────────────────────── */}
        <section className="border-b border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-10">

              {/* Avatar */}
              <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border sm:h-32 sm:w-32">
                {organizer.logoUrl ? (
                  <Image
                    src={organizer.logoUrl}
                    alt={organizer.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                  Organiser
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {organizer.name}
                </h1>

                {organizer.bio && (
                  <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    {organizer.bio}
                  </p>
                )}

                {/* Meta pills */}
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {organizer.events.length} event{organizer.events.length !== 1 ? 's' : ''}
                  </div>

                  {organizer.websiteUrl && (
                    <a
                      href={organizer.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      {organizer.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Events ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20">
          {organizer.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
                <Building2 className="h-7 w-7 text-muted-foreground/50" aria-hidden />
              </div>
              <p className="text-[16px] font-semibold text-foreground">No events yet</p>
              <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
                Check back soon for upcoming events from {organizer.name}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-16">
              {/* Upcoming */}
              {upcomingEvents.length > 0 && (
                <section>
                  <h2 className="mb-7 text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                    Upcoming Events
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* Past */}
              {pastEvents.length > 0 && (
                <section>
                  <h2 className="mb-7 text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                    Past Events
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {pastEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
