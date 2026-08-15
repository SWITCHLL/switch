import type {
  Event,
  Organizer,
  Venue,
  Category,
  TicketType,
  EventSeat,
  SeatMap,
} from '@/app/generated/prisma/client'

// ─── Rich event type used in listings and detail pages ────────────────────────

export type EventWithRelations = Event & {
  organizer: Pick<Organizer, 'id' | 'name' | 'slug' | 'logoUrl'>
  venue: Pick<Venue, 'id' | 'name' | 'city' | 'state' | 'country'> | null
  category: Pick<Category, 'id' | 'name' | 'slug' | 'color'> | null
  ticketTypes: TicketType[]
  _count: {
    tickets: number
    eventSeats: number
  }
}

export type EventListItem = Pick<
  Event,
  | 'id'
  | 'title'
  | 'slug'
  | 'imageUrl'
  | 'startsAt'
  | 'endsAt'
  | 'status'
  | 'seatingType'
  | 'capacity'
> & {
  organizer: Pick<Organizer, 'name' | 'slug'>
  venue: Pick<Venue, 'name' | 'city' | 'state'> | null
  category: Pick<Category, 'name' | 'slug' | 'color'> | null
  ticketTypes: Pick<
    TicketType,
    'id' | 'name' | 'price' | 'currency' | 'quantity' | 'sold' | 'status'
  >[]
  _count: { tickets: number }
}

// ─── Seat map types ───────────────────────────────────────────────────────────

export type SeatData = {
  id: string
  label: string
  number: number | null
  type: string
  positionX: number | null
  positionY: number | null
  eventSeats: Pick<EventSeat, 'id' | 'status' | 'price'>[]
}

export type RowData = {
  id: string
  label: string
  position: number | null
  seats: SeatData[]
}

export type SectionData = {
  id: string
  name: string
  code: string
  type: string
  capacity: number | null
  rows: RowData[]
}

export type SeatMapData = SeatMap & {
  sections: SectionData[]
}

export type EventDetail = EventWithRelations & {
  seatMap: SeatMapData | null
}

// ─── Seat selection state (used across seat map UI) ───────────────────────────

export interface SelectedSeat {
  eventSeatId: string
  seatId: string
  seatLabel: string
  sectionName: string
  rowLabel: string
  ticketTypeId: string
  ticketTypeName: string
  price: number
  currency: string
}

// ─── Filter / query params ────────────────────────────────────────────────────

export interface EventFilters {
  category?: string
  city?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  free?: boolean
  page?: number
  limit?: number
}

export interface EventsPage {
  events: EventListItem[]
  total: number
  page: number
  totalPages: number
}
