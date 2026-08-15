import { z } from 'zod'

// ─── Step 1: Organizer profile ────────────────────────────────────────────────

export const organizerProfileSchema = z.object({
  organizerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').optional(),
})

// ─── Step 2: Identity verification ───────────────────────────────────────────

export const identitySchema = z.object({
  nin: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits'),
  bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
  idType: z.enum(['NATIONAL_ID', 'DRIVERS_LICENSE', 'INTL_PASSPORT', 'VOTERS_CARD'], {
    errorMap: () => ({ message: 'Please select a valid ID type' }),
  }),
  idDocUrl: z.string().min(1, 'Please upload your ID document').url('Invalid document URL'),
})

// ─── Step 3: Social handles (all optional) ───────────────────────────────────

const optionalUrl = z
  .string()
  .url('Please enter a valid URL (include https://)')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v))

export const socialsSchema = z.object({
  instagramUrl: optionalUrl,
  twitterUrl: optionalUrl,
  facebookUrl: optionalUrl,
  websiteUrl: optionalUrl,
})

// ─── Full submission schema ───────────────────────────────────────────────────

export const submitApplicationSchema = organizerProfileSchema
  .merge(identitySchema)
  .merge(socialsSchema)

export type OrganizationProfileInput = z.infer<typeof organizerProfileSchema>
export type IdentityInput = z.infer<typeof identitySchema>
export type SocialsInput = z.infer<typeof socialsSchema>
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>
