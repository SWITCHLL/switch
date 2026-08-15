import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getSession } from '@/lib/session'
import { getEvents, getCategories } from '@/features/events'
import { eventFiltersSchema } from '@/features/events'
import { EventsGrid } from '@/features/events/components/events-grid'
import { EventFiltersBar } from '@/features/events/components/event-filters-bar'
import { EventsGridSkeleton } from '@/features/events/components/events-grid-skeleton'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse upcoming events — concerts, conferences, festivals, and more.',
}

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function EventsPage({ searchParams }: PageProps) {
  const [session, rawParams] = await Promise.all([getSession(), searchParams])
  const filters = eventFiltersSchema.parse(rawParams)
  const categories = await getCategories()

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session?.email} />

      <main className="flex-1 pt-[60px]">
        {/* ── Page header ── */}
        <div className="border-border/60 border-b">
          <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14">
            <h1 className="text-[28px] font-semibold tracking-tight sm:text-[36px]">
              Upcoming Events
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Discover concerts, conferences, festivals, and more across Nigeria.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
          {/* ── Filters ── */}
          <EventFiltersBar categories={categories} activeFilters={filters} />

          {/* ── Grid ── */}
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
