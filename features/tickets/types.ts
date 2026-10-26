// Ticket feature types

import type { TicketStatus } from '@/app/generated/prisma/client'

export interface TicketType {
  id: string
  name: string
  price: number
  currency: string
}

export interface Seat {
  id: string
  label: string
  number: number | null
}

export interface EventSeatData {
  id: string
  seat: Seat
}

export interface Venue {
  id: string
  name: string
  city: string
}

export interface EventData {
  id: string
  title: string
  slug: string
  imageUrl: string | null
  startsAt: Date
  endsAt: Date | null
  status: string
  venue: Venue | null
  venueName: string | null
  venueCity: string | null
  venueAddress: string | null
}

export interface TimeSlotData {
  id: string
  label: string
  startsAt: Date
  endsAt: Date
}

export interface TicketWithDetails {
  id: string
  ticketNumber: string
  qrCode: string
  status: TicketStatus
  issuedAt: Date
  createdAt: Date
  updatedAt: Date
  eventId: string
  ticketTypeId: string
  userId: string
  eventSeatId: string | null
  ticketType: TicketType
  event: EventData
  eventSeat: EventSeatData | null
  timeSlotTickets: Array<{ timeSlot: TimeSlotData }>
}

export interface TicketListFilters {
  status?: string
  dateFrom?: Date
  dateTo?: Date
}
