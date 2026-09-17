/**
 * POST /api/cron/event-cleanup
 *
 * Called by a scheduler (Vercel Cron, upstash-qstash, etc.) on a regular
 * cadence (e.g. every hour). Protected by a shared CRON_SECRET header.
 *
 * What it does:
 *  1. Marks PUBLISHED events whose end time has passed → COMPLETED
 *  2. Marks tickets for those events ACTIVE → EXPIRED
 *  3. Hard-deletes events (and their EventImage rows) that have been
 *     COMPLETED for ≥ 6 days, along with their image CDN files.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EventStatus, TicketStatus } from '@/app/generated/prisma/client'

// Allow Vercel Cron to call without timing out
export const maxDuration = 60

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

// Vercel Cron fires GET; manual/programmatic callers use POST
export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const deleteBefore = new Date(now.getTime() - SIX_DAYS_MS)

  let completedCount = 0
  let expiredTicketsCount = 0
  let deletedCount = 0

  // ── Step 1: Mark PUBLISHED events as COMPLETED ─────────────────────────────
  // An event is considered over when its endsAt has passed, or if no endsAt is
  // set, when startsAt has passed (i.e. single-day/instantaneous events).
  const eventsToComplete = await db.event.findMany({
    where: {
      status: EventStatus.PUBLISHED,
      OR: [
        { endsAt: { lte: now } },
        { endsAt: null, startsAt: { lte: now } },
      ],
    },
    select: { id: true },
  })

  if (eventsToComplete.length > 0) {
    const eventIds = eventsToComplete.map((e) => e.id)

    // Transition events → COMPLETED
    const completedResult = await db.event.updateMany({
      where: { id: { in: eventIds } },
      data: { status: EventStatus.COMPLETED },
    })
    completedCount = completedResult.count

    // Transition their ACTIVE tickets → EXPIRED
    const expiredResult = await db.ticket.updateMany({
      where: {
        eventId: { in: eventIds },
        status: TicketStatus.ACTIVE,
      },
      data: { status: TicketStatus.EXPIRED },
    })
    expiredTicketsCount = expiredResult.count
  }

  // ── Step 2: Delete events that have been COMPLETED for ≥ 6 days ───────────
  // We use `updatedAt` as a proxy for when the status was set to COMPLETED.
  const eventsToDelete = await db.event.findMany({
    where: {
      status: EventStatus.COMPLETED,
      updatedAt: { lte: deleteBefore },
    },
    select: {
      id: true,
      images: { select: { id: true, url: true } },
    },
  })

  for (const event of eventsToDelete) {
    // Delete CDN images if using Supabase Storage (best-effort)
    if (event.images.length > 0) {
      for (const img of event.images) {
        try {
          await deleteStorageFile(img.url)
        } catch (err) {
          console.error(`[EventCleanup] Failed to delete image ${img.url}:`, err)
        }
      }
    }

    // Cascade-delete the event (EventImage rows cascade via DB)
    await db.event.delete({ where: { id: event.id } })
    deletedCount++
  }

  console.log(
    `[EventCleanup] completed=${completedCount} expired_tickets=${expiredTicketsCount} deleted=${deletedCount}`
  )

  return NextResponse.json({
    ok: true,
    completed: completedCount,
    expiredTickets: expiredTicketsCount,
    deleted: deletedCount,
  })
}

/**
 * Attempt to delete an image from Supabase Storage given its public URL.
 * Silently skips if the URL doesn't match the configured storage host.
 */
async function deleteStorageFile(url: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !url.startsWith(supabaseUrl)) return

  // Extract the storage path from the URL.
  // Supabase Storage public URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match) return

  const bucket = match[1]
  const filePath = match[2]

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return

  await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    }
  )
}
