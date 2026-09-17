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
  eventSlug: string
  ticketCount: number
  reservationId: string
  tickets: Array<{
    ticketNumber: string
    qrCode: string
    ticketTypeName: string
    seatLabel?: string | null
  }>
}): Promise<void> {
  // Look up the user's email
  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true },
  })
  if (!user) return

  const QRCode = await import('qrcode')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'

  const dateStr = params.eventDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Generate QR data URLs for each ticket (max 6 shown inline)
  const ticketsToShow = params.tickets.slice(0, 6)
  const qrDataUrls = await Promise.all(
    ticketsToShow.map((t) =>
      QRCode.default.toDataURL(t.qrCode, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
    )
  )

  const ticketRows = ticketsToShow
    .map(
      (t, i) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #27272a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;padding-right:16px;">
                <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#fafafa;">
                  ${t.ticketTypeName}${t.seatLabel ? ` · Seat ${t.seatLabel}` : ''}
                </p>
                <p style="margin:0;font-size:11px;font-family:monospace;color:#71717a;letter-spacing:0.05em;">
                  ${t.ticketNumber}
                </p>
              </td>
              <td style="vertical-align:top;text-align:right;width:84px;">
                <img
                  src="${qrDataUrls[i]}"
                  width="76"
                  height="76"
                  alt="QR code for ${t.ticketNumber}"
                  style="border-radius:6px;display:block;margin-left:auto;"
                />
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('')

  const extraCount = params.tickets.length - ticketsToShow.length

  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Your tickets for ${params.eventTitle} — ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fafafa;">${APP_NAME}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Booking Confirmation</p>
            </td>
          </tr>

          <!-- Event block -->
          <tr>
            <td style="background:#18181b;border-radius:12px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">You&apos;re going to</p>
              <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fafafa;">${params.eventTitle}</p>
              <p style="margin:0;font-size:13px;color:#a1a1aa;">${dateStr}</p>
            </td>
          </tr>

          <tr><td style="height:12px;"></td></tr>

          <!-- Tickets -->
          <tr>
            <td style="background:#18181b;border-radius:12px;padding:20px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#71717a;">
                Your ticket${params.ticketCount !== 1 ? 's' : ''} (${params.ticketCount})
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${ticketRows}
              </table>
              ${
                extraCount > 0
                  ? `<p style="margin:12px 0 0;font-size:12px;color:#71717a;">+ ${extraCount} more ticket${extraCount !== 1 ? 's' : ''} — view all in your dashboard</p>`
                  : ''
              }
            </td>
          </tr>

          <tr><td style="height:16px;"></td></tr>

          <!-- CTA -->
          <tr>
            <td align="center">
              <a href="${appUrl}/dashboard/tickets"
                 style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;">
                View all my tickets →
              </a>
            </td>
          </tr>

          <tr><td style="height:28px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:#52525b;text-align:center;">
                Booking ref: <span style="font-family:monospace;">${params.reservationId}</span>
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#3f3f46;text-align:center;">
                Present your QR code at the entrance. Keep this email safe.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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

// ─── Waitlist emails ──────────────────────────────────────────────────────────

/**
 * Notify a user that they have joined the waitlist.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendWaitlistJoined(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
  position: number
  requestedQty: number
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const waitlistUrl = `${appUrl}/dashboard/waitlist`

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `You're on the waitlist for ${params.eventTitle} — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Waitlist Confirmation</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">You're on the waitlist for</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0;">
            You are <strong style="color:#fafafa;">#${params.position}</strong> on the waitlist
            for ${params.requestedQty} ticket${params.requestedQty !== 1 ? 's' : ''}.
            We'll notify you if a spot opens up.
          </p>
        </div>
        <a href="${waitlistUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          View my waitlist →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send waitlist-joined email: ${error.message}`)
  }
}

/**
 * Notify a user that they have been offered a spot from the waitlist.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendWaitlistOffered(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
  requestedQty: number
  offerExpiresAt: Date
  reservationId: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const checkoutUrl = `${appUrl}/events/${params.eventSlug}/checkout?reservationId=${params.reservationId}`

  const expiresStr = params.offerExpiresAt.toLocaleString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your spot is ready for ${params.eventTitle} — act fast! — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Waitlist Offer</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#4ade80;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Great news! A spot opened up</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px;">
            ${params.requestedQty} ticket${params.requestedQty !== 1 ? 's have' : ' has'} been reserved for you.
          </p>
          <p style="color:#f87171;font-size:13px;margin:0;">
            This offer expires on <strong style="color:#fca5a5;">${expiresStr}</strong>.
          </p>
        </div>
        <a href="${checkoutUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px;">
          Complete my purchase →
        </a>
        <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
          If you don't complete your purchase in time, the spot will be offered to the next person on the waitlist.
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send waitlist-offered email: ${error.message}`)
  }
}

// ─── Reservation expired notification ────────────────────────────────────────

/**
 * Notify a user that their reservation has expired and seats have been released.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendReservationExpired(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const eventUrl = `${appUrl}/events/${params.eventSlug}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your reservation for ${params.eventTitle} has expired — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Reservation Expired</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#f87171;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Reservation expired</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0;">
            Your held seats have been released back to the general pool.
            If tickets are still available, you can start a new reservation.
          </p>
        </div>
        <a href="${eventUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          Back to event →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send reservation-expired email: ${error.message}`)
  }
}

// ─── Waitlist offer expired notification ──────────────────────────────────────

/**
 * Notify a user that their waitlist offer window has passed.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendWaitlistOfferExpired(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const eventUrl = `${appUrl}/events/${params.eventSlug}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your waitlist offer for ${params.eventTitle} has expired — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Waitlist Offer Expired</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#f87171;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Offer window closed</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0;">
            Unfortunately your waitlist offer expired before payment was completed.
            The spot has been offered to the next person in line.
            You can rejoin the waitlist if it's still open.
          </p>
        </div>
        <a href="${eventUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          Back to event →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send waitlist-offer-expired email: ${error.message}`)
  }
}

// ─── Event reminder notification ──────────────────────────────────────────────

/**
 * Send a 24-hour-before reminder for an upcoming event.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendEventReminder(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
  eventStartsAt: Date
  venueName: string | null
  venueAddress: string | null
  venueCity: string | null
  ticketNumber: string
  qrCode: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const ticketsUrl = `${appUrl}/dashboard/tickets`

  const dateStr = params.eventStartsAt.toLocaleString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const locationParts = [params.venueName, params.venueAddress, params.venueCity].filter(Boolean)
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'See event page for details'

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Reminder: ${params.eventTitle} is tomorrow — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Event Reminder</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#4ade80;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Your event is tomorrow!</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 4px;">${dateStr}</p>
          <p style="color:#71717a;font-size:13px;margin:0;">${locationStr}</p>
        </div>
        <div style="background:#18181b;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;margin:0 0 4px;">Ticket</p>
          <p style="font-family:monospace;font-size:13px;color:#a1a1aa;margin:0;">${params.ticketNumber}</p>
        </div>
        <a href="${ticketsUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          View my tickets →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send event-reminder email: ${error.message}`)
  }
}

// ─── Ticket cancelled notification ───────────────────────────────────────────

/**
 * Notify a user that their ticket has been cancelled by the organizer.
 * Stub — full React Email template implemented in Task 15.
 */
export async function sendTicketCancelled(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
  ticketNumber: string
  reason?: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const eventUrl = `${appUrl}/events/${params.eventSlug}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your ticket for ${params.eventTitle} has been cancelled — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Ticket Cancellation</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#f87171;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Ticket cancelled</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="font-family:monospace;font-size:13px;color:#71717a;margin:0 0 8px;">${params.ticketNumber}</p>
          ${params.reason ? `<p style="color:#a1a1aa;font-size:14px;margin:0;">Reason: ${params.reason}</p>` : ''}
        </div>
        <a href="${eventUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          Back to event →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send ticket-cancelled email: ${error.message}`)
  }
}

// ─── Waitlist closed notification ─────────────────────────────────────────────

/**
 * Notify a user that their waitlist position closed without receiving an offer
 * (event ended without restocked inventory).
 */
export async function sendWaitlistClosed(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  eventSlug: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://useswitch.net'
  const eventUrl = `${appUrl}/events/${params.eventSlug}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Waitlist update for ${params.eventTitle} — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Waitlist Update</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Waitlist closed</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0;">
            Unfortunately the event has ended and we were unable to offer you a spot from the waitlist.
            Thank you for your patience — we hope to see you at a future event.
          </p>
        </div>
        <a href="${eventUrl}"
           style="display:block;text-align:center;background:#6366f1;color:#fff;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;">
          Browse events →
        </a>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send waitlist-closed email: ${error.message}`)
  }
}

// ─── Refund confirmed notification ───────────────────────────────────────────

/**
 * Notify a user that their refund has been processed.
 */
export async function sendRefundConfirmed(params: {
  toEmail: string
  toName: string | null
  eventTitle: string
  refundAmount: number
  currency: string
  processingTimeline?: string
}): Promise<void> {
  const amountStr = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: params.currency,
    minimumFractionDigits: 0,
  }).format(params.refundAmount / 100)

  const timeline = params.processingTimeline ?? '5–10 business days'

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Refund confirmed for ${params.eventTitle} — ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fafafa;border-radius:12px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${APP_NAME}</h1>
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 32px;">Refund Confirmation</p>
        <div style="background:#18181b;border-radius:10px;padding:24px;margin-bottom:24px;">
          <p style="color:#4ade80;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Refund approved</p>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">${params.eventTitle}</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px;">
            Your refund of <strong style="color:#fafafa;">${amountStr}</strong> has been approved.
          </p>
          <p style="color:#71717a;font-size:13px;margin:0;">
            Please allow <strong style="color:#a1a1aa;">${timeline}</strong> for the funds to appear in your account.
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send refund-confirmed email: ${error.message}`)
  }
}
