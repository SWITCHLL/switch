import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── ICS date format: YYYYMMDDTHHMMSSZ ───────────────────────────────────────

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcs(s: string): string {
  // Per RFC 5545 §3.3.11 — escape backslash, semicolon, comma, newline
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Fold long lines per RFC 5545 §3.1
function foldLine(line: string): string {
  const MAX = 75
  if (line.length <= MAX) return line
  let out = ''
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) {
      out += line.slice(0, MAX)
      pos = MAX
    } else {
      out += '\r\n ' + line.slice(pos, pos + MAX - 1)
      pos += MAX - 1
    }
  }
  return out
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  const event = await db.event.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      venueName: true,
      venueAddress: true,
      venueCity: true,
      venueState: true,
      isVirtual: true,
      virtualLink: true,
      slug: true,
    },
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const eventUrl = `${appUrl}/events/${event.slug}`

  // Build LOCATION
  let location = ''
  if (event.isVirtual && event.virtualLink) {
    location = event.virtualLink
  } else {
    const parts = [event.venueName, event.venueAddress, event.venueCity, event.venueState].filter(
      Boolean
    )
    location = parts.join(', ')
  }

  // DTEND defaults to 1 hour after start if not set
  const dtEnd = event.endsAt ?? new Date(event.startsAt.getTime() + 60 * 60 * 1000)

  // Unique ID for this event
  const uid = `event-${event.slug}@useswitch.net`

  const description = [
    event.description ? event.description.replace(/<[^>]+>/g, '').slice(0, 500) : '',
    eventUrl,
  ]
    .filter(Boolean)
    .join('\n\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SWITCH//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(dtEnd)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    location ? `LOCATION:${escapeIcs(location)}` : '',
    description ? `DESCRIPTION:${escapeIcs(description)}` : '',
    `URL:${eventUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map(foldLine)
    .join('\r\n')

  const filename = `${event.slug}.ics`

  return new Response(lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
