/**
 * Ticket ZIP file generator for bulk orders.
 *
 * Creates a ZIP archive containing all ticket PNG files,
 * uploads to Supabase storage, and returns download URL.
 */
import 'server-only'
import AdmZip from 'adm-zip'
import type { TicketData } from './ticket-image-generator'
import { generateTicketImage } from './ticket-image-generator'

// ─── Generate Ticket ZIP Archive ───────────────────────────────────────────────

/**
 * Creates a ZIP file containing PNG images for all tickets.
 * Returns the ZIP buffer and recommended filename.
 */
export async function generateTicketZip(params: {
  tickets: TicketData[]
  eventTitle: string
  reservationId: string
}): Promise<{
  zipBuffer: Buffer
  filename: string
  ticketCount: number
}> {
  const zip = new AdmZip()

  try {
    // Generate PNG for each ticket and add to ZIP
    for (const ticket of params.tickets) {
      const pngBuffer = await generateTicketImage(ticket)
      zip.addFile(`ticket-${ticket.ticketNumber}.png`, pngBuffer)
    }

    // Get ZIP buffer
    const zipBuffer = zip.toBuffer()

    // Create filename with sanitized event title
    const sanitizedTitle = params.eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)

    const filename = `tickets-${sanitizedTitle}-${params.reservationId.slice(0, 8)}.zip`

    console.log('[generateTicketZip] Created ZIP file', {
      filename,
      ticketCount: params.tickets.length,
      zipSize: `${(zipBuffer.length / 1024).toFixed(2)}KB`,
    })

    return {
      zipBuffer,
      filename,
      ticketCount: params.tickets.length,
    }
  } catch (error) {
    console.error('[generateTicketZip] Failed to generate ZIP:', error)
    throw new Error('Failed to generate ticket ZIP file')
  }
}

// ─── Upload ZIP to Supabase Storage ───────────────────────────────────────────

/**
 * Uploads ticket ZIP file to Supabase storage.
 * Returns the public download URL.
 *
 * The URL is temporary and will be valid for 1 week by default.
 */
export async function uploadTicketZipToStorage(params: {
  zipBuffer: Buffer
  filename: string
  userId: string
  reservationId: string
}): Promise<{
  downloadUrl: string
  expiresAt: Date
}> {
  try {
    const { createClient } = await import('@supabase/supabase-js')

    // Use service role key for storage operations
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create path: tickets/{userId}/{reservationId}/{filename}
    const storagePath = `tickets/${params.userId}/${params.reservationId}/${params.filename}`

    // Upload file
    const { data, error } = await supabase.storage
      .from('ticket-downloads')
      .upload(storagePath, params.zipBuffer, {
        contentType: 'application/zip',
        upsert: false,
      })

    if (error) {
      console.error('[uploadTicketZipToStorage] Supabase upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    if (!data) {
      throw new Error('No response from Supabase upload')
    }

    // Generate signed download URL (valid for 7 days)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('ticket-downloads')
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60) // 7 days in seconds

    if (signError || !signedUrl) {
      console.error('[uploadTicketZipToStorage] Signed URL error:', signError)
      throw new Error('Failed to generate download URL')
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    console.log('[uploadTicketZipToStorage] ZIP uploaded successfully', {
      path: storagePath,
      size: `${(params.zipBuffer.length / 1024).toFixed(2)}KB`,
      expiresAt,
    })

    return {
      downloadUrl: signedUrl.signedUrl,
      expiresAt,
    }
  } catch (error) {
    console.error('[uploadTicketZipToStorage] Failed:', error)
    throw error
  }
}

// ─── Generate Presigned Download URL ───────────────────────────────────────────

/**
 * Generates a temporary download URL for an already-uploaded ZIP file.
 * Useful for resending download links to users.
 */
export async function generatePresignedZipUrl(params: {
  storagePath: string
  expirationDays?: number
}): Promise<{
  url: string
  expiresAt: Date
}> {
  try {
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const days = params.expirationDays ?? 7

    const { data, error } = await supabase.storage
      .from('ticket-downloads')
      .createSignedUrl(params.storagePath, days * 24 * 60 * 60)

    if (error || !data) {
      throw new Error(`Failed to generate URL: ${error?.message}`)
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

    return {
      url: data.signedUrl,
      expiresAt,
    }
  } catch (error) {
    console.error('[generatePresignedZipUrl] Failed:', error)
    throw error
  }
}

// ─── Clean up old ZIP files ────────────────────────────────────────────────────

/**
 * Deletes a ZIP file from Supabase storage.
 * Used for cleanup or when regenerating downloads.
 */
export async function deleteTicketZipFromStorage(params: {
  storagePath: string
}): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase.storage
      .from('ticket-downloads')
      .remove([params.storagePath])

    if (error) {
      console.error('[deleteTicketZipFromStorage] Error:', error)
      throw error
    }

    console.log('[deleteTicketZipFromStorage] Deleted', params.storagePath)
  } catch (error) {
    console.error('[deleteTicketZipFromStorage] Failed:', error)
    // Don't throw — cleanup failures shouldn't break the main flow
  }
}
