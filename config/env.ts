/**
 * Environment Variable Validation
 *
 * Validates all environment variables at startup using Zod.
 * The app will throw a descriptive error if any required variable is missing or malformed.
 *
 * Import this file wherever you need validated env vars:
 *   import { env } from '@/config/env'
 */
import { z } from 'zod'

// ─── Server-side variables (never exposed to the browser) ────────────────────

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Auth.js
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
  WORKER_REDIS_URL: z.string().url('WORKER_REDIS_URL must be a valid URL').optional(),

  // Resend (email)
  RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY must start with re_').optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Supabase Storage
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_EVENTS_BUCKET: z.string().default('event-images'),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().startsWith('sk_').optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  /// Default platform fee percentage, e.g. "4" for 4%
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(4),

  // NIN encryption (KYC applications)
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  NIN_ENCRYPTION_KEY: z.string().length(64, 'NIN_ENCRYPTION_KEY must be 64 hex characters').optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
})

// ─── Client-side variables (prefixed with NEXT_PUBLIC_) ──────────────────────

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('SWITCH'),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().startsWith('pk_').optional(),
})

// ─── Validation ──────────────────────────────────────────────────────────────

function validateEnv() {
  // Only validate server vars on the server
  if (typeof window === 'undefined') {
    const parsed = serverSchema.safeParse(process.env)

    if (!parsed.success) {
      console.error('❌ Invalid environment variables:')
      console.error(parsed.error.flatten().fieldErrors)

      // During `next build`, Next.js pre-renders pages in a build worker that
      // may not have all runtime env vars present (e.g. on Vercel the build
      // step runs before secrets are injected). Throwing here would break the
      // build even for correctly configured deployments.
      //
      // NEXT_PHASE is set to 'phase-production-build' during `next build`.
      // At actual server startup (runtime) it is unset or 'phase-production-server'.
      // We only throw at runtime so misconfigured servers are caught on boot.
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
      if (!isBuildPhase) {
        throw new Error('Invalid environment variables. Check the console for details.')
      }
    }

    return parsed.data ?? {}
  }

  // On the client, only expose NEXT_PUBLIC_ vars
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  })

  return parsed.data ?? {}
}

export const env = validateEnv() as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>
