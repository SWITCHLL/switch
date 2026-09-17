/**
 * POST /api/scan-pin   — generate (or rotate) a scan PIN for an event or time slot
 * DELETE /api/scan-pin — revoke the scan PIN for an event or time slot
 *
 * Both require the caller to be the organizer of the event (or ADMIN).
 * Body: { eventId: string; timeSlotId?: string }
 *
 * If timeSlotId is provided, the PIN is scoped to that show only.
 * If timeSlotId is omitted, the PIN works for any show at the event.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { createScanPin, revokeScanPin, getScanPinTtl } from '@/lib/scan-pin'

async function resolveOrganizer(eventId: string, userId: string, role: string) {
  if (role === 'ADMIN') {
    return db.event.findUnique({ where: { id: eventId }, select: { organizerId: true } })
      .then((e) => e?.organizerId ?? null)
  }
  const org = await db.organizer.findUnique({ where: { userId }, select: { id: true } })
  if (!org) return null
  const event = await db.event.findUnique({
    where: { id: eventId, organizerId: org.id },
    select: { id: true },
  })
  return event ? org.id : null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const eventId = body?.eventId as string | undefined
  const timeSlotId = body?.timeSlotId as string | undefined

  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const organizerId = await resolveOrganizer(eventId, session.userId, session.role)
  if (!organizerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // If timeSlotId provided, verify it belongs to this event
  if (timeSlotId) {
    const slot = await db.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: { eventId: true, label: true },
    })
    if (!slot || slot.eventId !== eventId) {
      return NextResponse.json({ error: 'Time slot not found or unauthorized' }, { status: 404 })
    }
  }

  try {
    const pin = await createScanPin(eventId, organizerId, timeSlotId)
    const ttl = await getScanPinTtl(eventId, timeSlotId)

    // Format pin as XXX-XXX for readability
    const formatted = `${pin.slice(0, 3)}-${pin.slice(3)}`

    return NextResponse.json({
      pin: formatted,
      ttlSeconds: ttl,
      scope: timeSlotId ? 'time-slot' : 'event-wide',
    })
  } catch (error) {
    console.error('[scan-pin POST] Redis error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Failed to generate PIN. Please try again.' },
      { status: 503 } // Service Unavailable
    )
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const eventId = body?.eventId as string | undefined
  const timeSlotId = body?.timeSlotId as string | undefined

  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const organizerId = await resolveOrganizer(eventId, session.userId, session.role)
  if (!organizerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // If timeSlotId provided, verify it belongs to this event
  if (timeSlotId) {
    const slot = await db.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: { eventId: true },
    })
    if (!slot || slot.eventId !== eventId) {
      return NextResponse.json({ error: 'Time slot not found or unauthorized' }, { status: 404 })
    }
  }

  try {
    await revokeScanPin(eventId, timeSlotId)
    return NextResponse.json({ revoked: true })
  } catch (error) {
    console.error('[scan-pin DELETE] Redis error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Failed to revoke PIN. Please try again.' },
      { status: 503 } // Service Unavailable
    )
  }
}
