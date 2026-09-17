import 'server-only'
import { db } from '@/lib/db'

// ─── Types for the visual seat map editor ─────────────────────────────────────

export interface EditorSeat {
  id: string // Seat.id
  eventSeatId: string // EventSeat.id
  label: string
  number: number | null
  seatType: string // STANDARD | VIP | VVIP | ACCESSIBLE | COMPANION | PREMIUM
  status: string // AVAILABLE | HELD | SOLD | BLOCKED | RESERVED
  price: number
  positionX: number | null
  positionY: number | null
}

export interface EditorRow {
  id: string
  label: string
  position: number | null
  seats: EditorSeat[]
}

export interface EditorSection {
  id: string
  name: string
  code: string
  type: string // RESERVED | GENERAL_ADMISSION
  capacity: number | null
  ticketTypeId: string | null
  ticketTypeName: string | null
  price: number | null
  // Visual canvas position for the section block
  positionX: number | null
  positionY: number | null
  width: number | null
  height: number | null
  rows: EditorRow[]
  // Aggregate counts
  totalSeats: number
  availableSeats: number
  soldSeats: number
  heldSeats: number
  blockedSeats: number
}

export interface SeatMapEditorData {
  eventId: string
  eventTitle: string
  seatingType: string
  seatMapId: string
  canvasWidth: number
  canvasHeight: number
  sections: EditorSection[]
  // For seat type stats
  seatTypeCounts: Record<string, number>
}

export async function getEventSeatMapForEditor(
  eventId: string,
  organizerId: string
): Promise<SeatMapEditorData | null> {
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId },
    select: {
      id: true,
      title: true,
      seatingType: true,
      seatMapId: true,
      seatMap: {
        select: {
          id: true,
          width: true,
          height: true,
          sections: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              capacity: true,
              positionX: true,
              positionY: true,
              width: true,
              height: true,
              rows: {
                select: {
                  id: true,
                  label: true,
                  position: true,
                  seats: {
                    select: {
                      id: true,
                      label: true,
                      number: true,
                      type: true,
                      positionX: true,
                      positionY: true,
                    },
                    orderBy: { number: 'asc' },
                  },
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!event?.seatMap) return null

  // Load EventSeats for status + pricing
  const eventSeats = await db.eventSeat.findMany({
    where: { eventId },
    select: {
      id: true,
      seatId: true,
      ticketTypeId: true,
      price: true,
      status: true,
    },
  })

  // Build maps for fast lookup
  const esBySeatId = new Map(eventSeats.map((es) => [es.seatId, es]))

  // Load ticket type names
  const ticketTypes = await db.ticketType.findMany({
    where: { eventId },
    select: { id: true, name: true, price: true },
  })
  const ttMap = new Map(ticketTypes.map((tt) => [tt.id, tt]))

  // Build section tick-type inference: use first event seat in section
  const seatTypeCounts: Record<string, number> = {}

  const sections: EditorSection[] = event.seatMap.sections.map((sec) => {
    // Collect all seats in this section from all rows
    let totalSeats = 0
    let availableSeats = 0
    let soldSeats = 0
    let heldSeats = 0
    let blockedSeats = 0
    let sectionTicketTypeId: string | null = null
    let sectionPrice: number | null = null

    const rows: EditorRow[] = sec.rows.map((row) => {
      const seats: EditorSeat[] = []

      for (const seat of row.seats) {
        const es = esBySeatId.get(seat.id)
        if (!es) continue // seat has no EventSeat record — skip

        totalSeats++
        const status = es.status as string
        if (status === 'AVAILABLE') availableSeats++
        else if (status === 'SOLD' || status === 'RESERVED') soldSeats++
        else if (status === 'HELD') heldSeats++
        else if (status === 'BLOCKED') blockedSeats++

        // Infer section ticket type from first non-null
        if (!sectionTicketTypeId && es.ticketTypeId) {
          sectionTicketTypeId = es.ticketTypeId
          sectionPrice = es.price
        }

        // Tally seat types
        const sType = String(seat.type ?? 'STANDARD')
        seatTypeCounts[sType] = (seatTypeCounts[sType] ?? 0) + 1

        seats.push({
          id: seat.id,
          eventSeatId: es.id,
          label: seat.label,
          number: seat.number,
          seatType: sType,
          status,
          price: es.price,
          positionX: seat.positionX,
          positionY: seat.positionY,
        })
      }

      return {
        id: row.id,
        label: row.label,
        position: row.position,
        seats,
      }
    })

    const tt = sectionTicketTypeId ? ttMap.get(sectionTicketTypeId) : null

    return {
      id: sec.id,
      name: sec.name,
      code: sec.code,
      type: sec.type,
      capacity: sec.capacity,
      ticketTypeId: sectionTicketTypeId,
      ticketTypeName: tt?.name ?? null,
      price: sectionPrice,
      positionX: sec.positionX,
      positionY: sec.positionY,
      width: sec.width,
      height: sec.height,
      rows,
      totalSeats,
      availableSeats,
      soldSeats,
      heldSeats,
      blockedSeats,
    }
  })

  return {
    eventId,
    eventTitle: event.title,
    seatingType: event.seatingType,
    seatMapId: event.seatMap.id,
    canvasWidth: event.seatMap.width ?? 1200,
    canvasHeight: event.seatMap.height ?? 800,
    sections,
    seatTypeCounts,
  }
}
