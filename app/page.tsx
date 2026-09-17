import { Suspense } from 'react'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { HeroSectionWrapper } from '@/components/sections/hero-section-wrapper'
import { CategoriesSection } from '@/components/sections/categories-section'
import { EventsSection } from '@/components/sections/events-section'
import { OrganizerCta } from '@/components/sections/organizer-cta'

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Header sits over the dark hero */}
      <Suspense>
        <HeaderWithSession />
      </Suspense>
      <main className="flex-1">
        {/* Dark cinematic hero with event artwork */}
        <Suspense>
          <HeroSectionWrapper />
        </Suspense>
        {/* Typographic category strip */}
        <Suspense>
          <CategoriesSection />
        </Suspense>
        {/* Editorial event grid */}
        <Suspense>
          <EventsSection />
        </Suspense>
        {/* Organizer CTA */}
        <OrganizerCta />
      </main>
      <SiteFooter />
    </div>
  )
}
