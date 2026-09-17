/**
 * ICS (iCalendar) file builder
 *
 * Generates RFC 5545-compliant .ics content that can be imported into:
 * - Google Calendar
 * - Apple Calendar (iPhone / Mac)
 * - Outlook / Windows Calendar
 * - Any CalDAV-compatible app
 */

interface IcsEvent {
  id: string
  title: string
  description?: string | null
  location?: string | null
  startsAt: Date
  endsAt?: Date | null
  allDay: boolean
}

/** Format a Date as a UTC YYYYMMDDTHHMMSSZ string */
function toUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Format a Date as a local YYYYMMDD string (for all-day events) */
function toDateStamp(d: Date): string {
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('')
}

/** Fold long lines per RFC 5545 §3.1 (75-octet limit) */
function fold(line: string): string {
  const LIMIT = 75
  if (line.length <= LIMIT) return line
  let result = ''
  let i = 0
  while (i < line.length) {
    if (i === 0) {
      result += line.slice(0, LIMIT)
      i += LIMIT
    } else {
      result += '\r\n ' + line.slice(i, i + LIMIT - 1)
      i += LIMIT - 1
    }
  }
  return result
}

/** Escape text values per RFC 5545 §3.3.11 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

export function buildIcs(calendarTitle: string, events: IcsEvent[]): string {
  const now = toUtcStamp(new Date())
  const prodId = `-//SWITCH//Calendar//EN`

  const veventBlocks = events.map((ev) => {
    const dtStamp = now
    const uid = `${ev.id}@switch-calendar`

    let dtStart: string
    let dtEnd: string

    if (ev.allDay) {
      dtStart = `DTSTART;VALUE=DATE:${toDateStamp(ev.startsAt)}`
      // All-day end is exclusive — next day
      const end = ev.endsAt ?? ev.startsAt
      const nextDay = new Date(end)
      nextDay.setDate(nextDay.getDate() + 1)
      dtEnd = `DTEND;VALUE=DATE:${toDateStamp(nextDay)}`
    } else {
      dtStart = `DTSTART:${toUtcStamp(ev.startsAt)}`
      const end = ev.endsAt ?? new Date(ev.startsAt.getTime() + 60 * 60 * 1000) // default 1h
      dtEnd = `DTEND:${toUtcStamp(end)}`
    }

    const lines = [
      'BEGIN:VEVENT',
      fold(`UID:${uid}`),
      fold(`DTSTAMP:${dtStamp}`),
      fold(dtStart),
      fold(dtEnd),
      fold(`SUMMARY:${escapeText(ev.title)}`),
    ]

    if (ev.description) {
      lines.push(fold(`DESCRIPTION:${escapeText(ev.description)}`))
    }
    if (ev.location) {
      lines.push(fold(`LOCATION:${escapeText(ev.location)}`))
    }

    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escapeText(calendarTitle)}`),
    ...veventBlocks,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}
