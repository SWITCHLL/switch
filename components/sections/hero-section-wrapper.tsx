import type { EventListItem } from '@/features/events/types'
import { HeroShell } from './hero-shell'

interface HeroSectionWrapperProps {
  events: EventListItem[]
}

export function HeroSectionWrapper({ events }: HeroSectionWrapperProps) {
  return <HeroShell events={events} />
}
