/**
 * Supabase Client Singletons
 *
 * - `supabaseAdmin`  — server-only, uses SERVICE_ROLE key (full storage access)
 * - `createSupabaseBrowserClient` — factory for anonymous client-side usage
 *
 * The admin client is used by API routes to upload/delete files in Storage.
 * Never expose the service role key to the browser.
 */

// ─── Server-side admin client ─────────────────────────────────────────────────

import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

// Singleton — safe to reuse across requests in serverless
const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: ReturnType<typeof createClient>
}

export const supabaseAdmin =
  globalForSupabase.supabaseAdmin ??
  createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabaseAdmin = supabaseAdmin
}

export const EVENTS_BUCKET = process.env.SUPABASE_EVENTS_BUCKET ?? 'event-images'
