import { getUpcomingEvents, getCategories } from '@/features/events'
import { HeroSection } from './hero-section'

export async function HeroSectionWrapper() {
  // Fetch up to 9 events for poster artwork — more = richer composition
  const [events, categories] = await Promise.all([
    getUpcomingEvents(9),
    getCategories(),
  ])
  return <HeroSection events={events} categories={categories} />
}
