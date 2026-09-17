import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { buildIcs } from '@/features/calendar/ics'

/**
 * GET /api/calendar/export/[id]
 *
 * Exports a calendar as an ICS file.
 * [id] can be either:
 *   - A calendar `id` (owner access)
 *   - A calendar `shareToken` (shared access)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id } = await params

  // Try owner access first (by id)
  let calendar = await db.userCalendar.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      title: true,
      description: true,
      events: {
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startsAt: true,
          endsAt: true,
          allDay: true,
        },
        orderBy: { startsAt: 'asc' },
      },
    },
  })

  // Fall back to share token (for shared calendar export)
  if (!calendar) {
    const shared = await db.userCalendar.findFirst({
      where: {
        shareToken: id,
        shares: { some: { sharedWithId: session.userId } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startsAt: true,
            endsAt: true,
            allDay: true,
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    })
    calendar = shared
  }

  if (!calendar) {
    return new NextResponse('Calendar not found', { status: 404 })
  }

  const ics = buildIcs(calendar.title, calendar.events)
  const filename = `${calendar.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
