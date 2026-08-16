/**
 * Email Service — Resend
 *
 * Thin wrapper around the Resend SDK. All email sending goes through here.
 */
import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@switchapp.io'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'SWITCH'

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${APP_NAME} login code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;margin:0 0 32px;font-size:14px;">Your one-time login code</p>
        <div style="background:#18181b;border-radius:8px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:32px;font-weight:700;font-family:monospace;">
          ${otp}
        </div>
        <p style="color:#71717a;font-size:13px;margin:24px 0 0;">
          This code expires in <strong style="color:#a1a1aa;">10 minutes</strong>.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`)
  }
}

export async function sendTicketConfirmationEmail(params: {
  userId: string
  eventTitle: string
  eventDate: Date
  ticketCount: number
  reservationId: string
}): Promise<void> {
  // Look up the user's email
  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true },
  })
  if (!user) return

  const dateStr = params.eventDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Your tickets for ${params.eventTitle} — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Booking Confirmation</p>

        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">You're going to</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0;">${dateStr}</p>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <div style="flex:1;background:#18181b;border-radius:10px;padding:16px;text-align:center;">
            <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Tickets</p>
            <p style="font-size:28px;font-weight:700;margin:0;">${params.ticketCount}</p>
          </div>
          <div style="flex:1;background:#18181b;border-radius:10px;padding:16px;text-align:center;">
            <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Status</p>
            <p style="font-size:16px;font-weight:600;color:#4ade80;margin:0;">Confirmed</p>
          </div>
        </div>

        <p style="color:#71717a;font-size:13px;margin:0 0 16px;">
          Your tickets are ready. You can view and download them from your 
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'}/dashboard/tickets" 
             style="color:#818cf8;text-decoration:none;">tickets page</a>.
        </p>

        <p style="color:#52525b;font-size:12px;margin:0;">
          Reference: ${params.reservationId}
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send confirmation email: ${error.message}`)
  }
}

// ─── Group booking invite ─────────────────────────────────────────────────────

export async function sendGroupBookingInviteEmail(params: {
  toEmail: string
  toName: string | null
  initiatorName: string | null
  eventTitle: string
  groupCode: string
  expiresAt: Date
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'
  const joinUrl = `${appUrl}/group/${params.groupCode}`
  const expiresStr = params.expiresAt.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const from = params.initiatorName ?? 'Someone'

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `${from} invited you to ${params.eventTitle} on ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Group Booking Invite</p>

        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">You're invited to</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:13px;margin:0;">
            <strong style="color:#fafafa;">${from}</strong> is organising a group booking and saved a spot for you.
          </p>
        </div>

        <a href="${joinUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
          Claim my spot →
        </a>

        <p style="color:#52525b;font-size:12px;margin:0;">
          This invite expires at <strong style="color:#71717a;">${expiresStr}</strong>.
          If you didn't expect this, you can ignore it.
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send group invite email: ${error.message}`)
  }
}

// ─── Group booking complete notification ──────────────────────────────────────

export async function sendGroupCompleteEmail(params: {
  toEmail: string
  eventTitle: string
  groupCode: string
  paidCount: number
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io'

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your group is set for ${params.eventTitle} 🎉 — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Group Booking Complete</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#4ade80;font-size:14px;font-weight:600;margin:0;">
            All ${params.paidCount} ticket${params.paidCount !== 1 ? 's' : ''} confirmed ✓
          </p>
        </div>
        <a href="${appUrl}/dashboard/tickets"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          View my tickets →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send group complete email: ${error.message}`)
  }
}
