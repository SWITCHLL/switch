import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { buildIcs } from '@/features/calendar/ics'

/**
 * GET /api/calendar/event/[id]/export
 * Exports a single calendar event as an ICS file.
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

  const event = await db.calendarEvent.findFirst({
    where: {
      id,
      calendar: { userId: session.userId },
    },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      allDay: true,
      calendar: { select: { title: true } },
    },
  })

  if (!event) {
    return new NextResponse('Event not found', { status: 404 })
  }

  const ics = buildIcs(event.calendar.title, [event])
  const filename = `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
