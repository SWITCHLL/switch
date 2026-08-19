// Public API for the events feature module
export type {
  EventListItem,
  EventDetail,
  EventWithRelations,
  EventFilters,
  EventsPage,
} from './types'

export {
  getEvents,
  getEventBySlug,
  getCategories,
  getUpcomingEvents,
  getEventsByCategory,
  getRelatedEvents,
} from './queries'

export { eventFiltersSchema } from './schemas'
export type { EventFiltersInput, EventFiltersParsed } from './schemas'

export { getMinPrice, isSoldOut, hasFreeTickets, formatPrice } from './utils'
