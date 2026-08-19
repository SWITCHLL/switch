/**
 * POST /api/payments/initialize-group-slot
 *
 * Initializes a Paystack transaction for a single group-order slot.
 * Called after a member claims a slot — redirects them to Paystack to pay.
 *
 * Body: { slotId: string }
 *
 * The slot must already be in HELD state (set by claimSlot server action).
 * On charge.success the webhook calls confirmGroupSlotPayment to issue the ticket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { paystack } from '@/lib/paystack'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const slotId = body?.slotId as string | undefined

  if (!slotId) {
    return NextResponse.json({ error: 'slotId is required' }, { status: 400 })
  }

  // Load the slot and its group order
  const slot = await db.groupOrderSlot.findUnique({
    where: { id: slotId },
    include: {
      groupOrder: {
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          event: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  })

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  // Security: only the claimer can pay for this slot
  if (slot.claimedBy !== session.userId) {
    return NextResponse.json({ error: 'You have not claimed this slot' }, { status: 403 })
  }

  if (slot.status !== 'HELD') {
    return NextResponse.json(
      { error: `Slot is not in HELD state (current: ${slot.status})` },
      { status: 400 }
    )
  }

  if (slot.groupOrder.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'This group order is no longer accepting payments' },
      { status: 400 }
    )
  }

  if (new Date(slot.groupOrder.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'This group order has expired' }, { status: 400 })
  }

  // Fetch user email for Paystack
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const amount = slot.price // in kobo

  // Free slot — confirm immediately (no Paystack needed)
  if (amount === 0) {
    return NextResponse.json({ free: true, slotId, code: slot.groupOrder.code })
  }

  const reference = `SWT-GRP-${Date.now()}-${randomBytes(4).toString('hex')}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'
  const callbackUrl = `${appUrl}/group/${slot.groupOrder.code}?paid=1`

  const result = await paystack.initializeTransaction({
    email: user.email,
    amount,
    reference,
    callback_url: callbackUrl,
    metadata: {
      // Signals to the webhook that this is a group slot payment
      groupSlotId: slotId,
      userId: session.userId,
      eventId: slot.groupOrder.event.id,
      groupCode: slot.groupOrder.code,
      custom_fields: [
        {
          display_name: 'Event',
          variable_name: 'event_title',
          value: slot.groupOrder.event.title,
        },
        {
          display_name: 'Group',
          variable_name: 'group_code',
          value: slot.groupOrder.code,
        },
      ],
    },
  })

  return NextResponse.json({
    authorizationUrl: result.authorization_url,
    reference,
    amount,
  })
}
