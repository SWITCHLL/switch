import { z } from 'zod'

export const enrolInSessionSchema = z.object({
  ticketId: z.string().min(1),
  sessionIds: z.array(z.string().min(1)).min(1).max(50),
})

export type EnrolInSessionInput = z.infer<typeof enrolInSessionSchema>
