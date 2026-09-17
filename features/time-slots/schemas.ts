import { z } from 'zod'

// ─── Attendee: reserve one or more shows in a single checkout ─────────────────

export const slotSelectionSchema = z.object({
  timeSlotId:  z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity:    z.number().int().min(1).max(20),
})

export const reserveTimeSlotsSchema = z.object({
  eventId:    z.string().min(1),
  selections: z.array(slotSelectionSchema).min(1).max(10),
})

export type SlotSelection         = z.infer<typeof slotSelectionSchema>
export type ReserveTimeSlotsInput = z.infer<typeof reserveTimeSlotsSchema>

// ─── Organizer: upsert a time slot ───────────────────────────────────────────

export const capacityEntrySchema = z.object({
  ticketTypeId: z.string().min(1),
  capacity:     z.number().int().min(1),
})

export const upsertTimeSlotSchema = z.object({
  eventId:    z.string().min(1),
  timeSlotId: z.string().optional(), // present when updating
  label:      z.string().min(1).max(120),
  startsAt:   z.string().datetime(),
  endsAt:     z.string().datetime(),
  /** Per-ticket-type capacity entries */
  capacities: z.array(capacityEntrySchema).min(1),
})

export type UpsertTimeSlotInput = z.infer<typeof upsertTimeSlotSchema>
