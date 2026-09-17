/**
 * POST /api/upload/event-images
 *
 * Accepts a multipart/form-data request with one or more files under the
 * "files" field. Validates each file (type, size), uploads them to the
 * Supabase "event-images" bucket, and returns public URLs.
 *
 * Auth: requires a valid session cookie — only organizers/admins may upload.
 *
 * Returns:
 *   { urls: string[] }           on success
 *   { error: string }            on failure
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabaseAdmin, EVENTS_BUCKET } from '@/lib/supabase'
import { detectMimeType, ALLOWED_IMAGE_TYPES } from '@/lib/file-validation'
import { randomBytes } from 'crypto'

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_FILES = 6

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (session.role !== 'ORGANIZER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only organizers can upload event images' }, { status: 403 })
  }

  // 2. Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const files = formData.getAll('files') as File[]
  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `You can upload at most ${MAX_FILES} images` },
      { status: 400 }
    )
  }

  // 3. Validate each file — size first (cheap), then magic bytes (reads buffer)
  const validatedFiles: { file: File; buffer: Buffer; mime: string }[] = []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the 8 MB size limit.` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detection = await detectMimeType(buffer, ALLOWED_IMAGE_TYPES)
    if ('error' in detection) {
      return NextResponse.json({ error: detection.error }, { status: 400 })
    }

    validatedFiles.push({ file, buffer, mime: detection.mime })
  }

  // 4. Upload to Supabase Storage
  const urls: string[] = []

  for (const { file, buffer, mime } of validatedFiles) {
    // Derive extension from detected MIME, not from user-supplied filename
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const ext = extMap[mime] ?? 'jpg'
    const token = randomBytes(8).toString('hex')
    const path = `events/${session.userId}/${Date.now()}-${token}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(EVENTS_BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload/event-images] Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload "${file.name}": ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(EVENTS_BUCKET).getPublicUrl(path)

    urls.push(publicUrlData.publicUrl)
  }

  return NextResponse.json({ urls })
}
