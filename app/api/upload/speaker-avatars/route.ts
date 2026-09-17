/**
 * POST /api/upload/speaker-avatars
 *
 * Accepts a single image file under the "file" field.
 * Validates file type and size, uploads to Supabase "event-images" bucket
 * under the speakers/ prefix, and returns the public URL.
 *
 * Auth: requires ORGANIZER or ADMIN role.
 *
 * Returns:
 *   { url: string }    on success
 *   { error: string }  on failure
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin, EVENTS_BUCKET } from '@/lib/supabase'
import { detectMimeType, ALLOWED_IMAGE_TYPES } from '@/lib/file-validation'
import { randomBytes } from 'crypto'

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only organizers can upload images' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 4 MB size limit.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate MIME type via magic bytes — not the client-supplied file.type
  const detection = await detectMimeType(buffer, ALLOWED_IMAGE_TYPES)
  if ('error' in detection) {
    return NextResponse.json({ error: detection.error }, { status: 400 })
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extMap[detection.mime] ?? 'jpg'
  const token = randomBytes(8).toString('hex')
  const path = `speakers/${session.userId}/${Date.now()}-${token}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(EVENTS_BUCKET)
    .upload(path, buffer, { contentType: detection.mime, upsert: false })

  if (uploadError) {
    console.error('[upload/speaker-avatars] Supabase error:', uploadError)
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(EVENTS_BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrlData.publicUrl })
}
