import { Suspense } from 'react'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { HeroSectionWrapper } from '@/components/sections/hero-section-wrapper'
import { CategoriesSection } from '@/components/sections/categories-section'
import { EventsSection } from '@/components/sections/events-section'
import { OrganizerCta } from '@/components/sections/organizer-cta'
import { getUpcomingEvents } from '@/features/events'

// Revalidate every 2 minutes — matches the upstream query cache TTL.
export const revalidate = 120

export default async function HomePage() {
  // Fetch once at the page level — 9 covers the hero (9 posters) and
  // events section (7 cards). Both child components receive the data as props
  // so no duplicate DB queries fire per request.
  const events = await getUpcomingEvents(9)

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Header sits over the dark hero */}
      <Suspense>
        <HeaderWithSession />
      </Suspense>
      <main className="flex-1">
        {/* Dark cinematic hero with event artwork */}
        <Suspense>
          <HeroSectionWrapper events={events} />
        </Suspense>
        {/* Typographic category strip */}
        <Suspense>
          <CategoriesSection />
        </Suspense>
        {/* Editorial event grid */}
        <Suspense>
          <EventsSection events={events} />
        </Suspense>
        {/* Organizer CTA */}
        <OrganizerCta />
      </main>
      <SiteFooter />
    </div>
  )
}
