import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { getEvents, getCategories } from '@/features/events'
import { eventFiltersSchema } from '@/features/events'
import { EventsGrid } from '@/features/events/components/events-grid'
import { EventFiltersBar } from '@/features/events/components/event-filters-bar'
import { EventsGridSkeleton } from '@/features/events/components/events-grid-skeleton'
import { EventsHero } from '@/features/events/components/events-hero'
import { siteConfig } from '@/config/site'

// Revalidate every 60 seconds — matches the getEvents cache TTL.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Discover Events — SWITCH',
  description:
    'Find concerts, comedy, culture, nightlife, and everything happening around you. Browse upcoming events on SWITCH.',
  openGraph: {
    title: 'Discover Events — SWITCH',
    description:
      'Find concerts, comedy, culture, nightlife, and everything happening around you.',
    url: `${siteConfig.url}/events`,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Events — SWITCH',
    description:
      'Find concerts, comedy, culture, nightlife, and everything happening around you.',
    site: siteConfig.twitterHandle,
  },
  alternates: {
    canonical: `${siteConfig.url}/events`,
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function EventsPage({ searchParams }: PageProps) {
  const [rawParams, categories, allEvents] = await Promise.all([
    searchParams,
    getCategories(),
    getEvents({}),
  ])
  const filters = eventFiltersSchema.parse(rawParams)

  return (
    <div className="relative flex min-h-screen flex-col">
      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1">
        {/* ── Hero ── */}
        <EventsHero />

        {/* ── Filters ── */}
        <div className="border-border/40 border-b pb-4 sm:pb-6">
          <div className="mx-auto max-w-[1120px] px-5 pt-2 sm:px-8">
            <EventFiltersBar categories={categories} activeFilters={filters} totalEvents={allEvents.total} />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="py-8 sm:py-14">
          <Suspense fallback={<EventsGridSkeleton />}>
            <EventsGridLoader filters={filters} />
          </Suspense>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

// Separate async component so the grid streams independently
async function EventsGridLoader({
  filters,
}: {
  filters: ReturnType<typeof eventFiltersSchema.parse>
}) {
  const data = await getEvents(filters)
  return <EventsGrid data={data} filters={filters} />
}
