/**
 * GET /api/debug/email-test?to=you@example.com
 *
 * Sends a test confirmation email to verify Resend is configured correctly.
 * REMOVE THIS ROUTE before going to production or restrict to admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { sendTicketConfirmationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const to = req.nextUrl.searchParams.get('to') ?? session.email

  // Log env var presence (not values)
  const envCheck = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? '(not set — using default)',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(not set)',
  }

  console.log('[email-test] env check:', envCheck)

  try {
    await sendTicketConfirmationEmail({
      userId: session.userId,
      eventTitle: 'Test Event — SWITCH',
      eventDate: new Date(),
      eventSlug: 'test-event',
      ticketCount: 1,
      reservationId: 'TEST-' + Date.now(),
      tickets: [
        {
          ticketNumber: 'SWT-2026-TEST01',
          qrCode: 'SWT-TEST-QR-CODE-VALUE',
          ticketTypeName: 'General Admission',
          seatLabel: null,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      sentTo: to,
      envCheck,
    })
  } catch (err) {
    console.error('[email-test] error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        envCheck,
      },
      { status: 500 }
    )
  }
}
