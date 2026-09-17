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

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('SUPABASE_URL is not set')
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

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Extract the storage path from a full Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/event-images/events/uid/file.jpg"
 * → "events/uid/file.jpg"
 *
 * Returns null if the URL doesn't belong to this bucket.
 */
export function storagePathFromUrl(url: string): string | null {
  try {
    const marker = `/object/public/${EVENTS_BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  } catch {
    return null
  }
}

/**
 * Delete one or more files from Supabase Storage by their public URLs.
 * Failures are logged but never thrown — storage cleanup is best-effort.
 */
export async function deleteStorageFiles(urls: string[]): Promise<void> {
  const paths = urls.map(storagePathFromUrl).filter((p): p is string => p !== null)
  if (paths.length === 0) return

  const { error } = await supabaseAdmin.storage.from(EVENTS_BUCKET).remove(paths)
  if (error) {
    console.error('[storage] Failed to delete files:', paths, error.message)
  }
}
