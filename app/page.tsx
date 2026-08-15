import { Suspense } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeroSection } from '@/components/sections/hero-section'
import { UpcomingEventsSection } from '@/components/sections/upcoming-events-section'
import { BrowseByCategorySection } from '@/components/sections/browse-by-category-section'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader userEmail={session?.email} />
      <main className="flex-1">
        <Suspense>
          <HeroSection />
        </Suspense>
        <Suspense>
          <UpcomingEventsSection />
        </Suspense>
        <Suspense>
          <BrowseByCategorySection />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
