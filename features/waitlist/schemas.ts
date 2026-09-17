import { z } from 'zod'

export const joinWaitlistSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
})

export const leaveWaitlistSchema = z.object({
  waitlistEntryId: z.string().min(1),
})

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>
export type LeaveWaitlistInput = z.infer<typeof leaveWaitlistSchema>
