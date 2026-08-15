import { z } from 'zod'

// ─── Query / filter schema ────────────────────────────────────────────────────

export const eventFiltersSchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  search: z.string().max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  free: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export type EventFiltersInput = z.input<typeof eventFiltersSchema>
export type EventFiltersParsed = z.output<typeof eventFiltersSchema>
