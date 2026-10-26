# Ticket Email Attachments

## Overview

When users purchase tickets, they now receive emails with:
1. **PNG ticket images attached** — one PNG per ticket, rendered from Handlebars template
2. **QR codes embedded inline** — for email preview
3. **Full ticket details** — event info, date, venue, seat numbers, status

## How It Works

### Email Flow

```
Payment Webhook
    ↓
confirmOrder / handleChargeSuccess
    ↓
sendTicketConfirmationEmail()
    ├── Generate QR codes for inline display (email preview)
    ├── Generate PNG tickets using Handlebars template
    └── Send email with PNG attachments
```

### Ticket Image Generation

**File:** `lib/ticket-image-generator.ts`

Uses **Handlebars templating** with `qrcode` library:

1. **Handlebars Template** (`TICKET_TEMPLATE`)
   - Embedded in the module
   - Renders HTML with ticket data
   - Responsive, professional design

2. **Data Processing**
   - Format dates and times for the locale (en-NG)
   - Generate QR codes as PNG data URLs
   - Prepare template context with all ticket details

3. **HTML to PNG Conversion**
   - Uses `html-to-image` library (already installed)
   - Converts rendered HTML to PNG buffer
   - Falls back to QR-only in Node.js environments

```typescript
// Compile template once (singleton)
const template = Handlebars.compile(TICKET_TEMPLATE)

// Render with ticket data
const html = template({
  ticketNumber: '...',
  eventTitle: '...',
  qrCodeDataUrl: 'data:image/png;base64,...',
  // ... other fields
})

// Convert to PNG and return buffer
const pngBuffer = await toPng(container)
```

## Ticket Template Features

The Handlebars template includes:

### Conditional Rendering
- **Status badges** — shows Valid, Used, Cancelled, Refunded, Expired
- **Optional fields** — venue, seat information only shown if present
- **Validity indicator** — grayed out invalid tickets

### Styling
- Responsive 360px width (mobile-friendly)
- Professional gradient header
- Perforated tear-off design
- QR code optimized for scanning

### Data Fields
- Event title, date, time
- Venue name and city
- Ticket type (VIP, General, etc.)
- Seat label (if assigned)
- Ticket number (monospace font)
- Unique ticket ID

## User Experience

### Email Receipt
- Users receive email with PNG files attached
- Can download and print tickets directly
- QR codes visible inline for preview
- Full event details and booking reference

### Ticket File
- Filename: `ticket-{ticketNumber}.png`
- Size: ~50-100KB per ticket
- Quality: 2x pixel ratio for crisp printing
- Format: Standard PNG, opens in any image viewer

## Implementation Details

### Files Modified

1. **`lib/email.ts`** — `sendTicketConfirmationEmail()`
   - Uses `generateTicketImages()` to create PNG attachments
   - Wrapped in try/catch for robustness
   - Attaches PNGs to Resend email

2. **`lib/ticket-image-generator.ts`** (NEW)
   - Server-side ticket generation with Handlebars
   - Exports `generateTicketImage()` and `generateTicketImages()`
   - Handles template compilation, data formatting, PNG conversion

### Dependencies Added
- **`handlebars`** — Template engine for rendering ticket HTML

### Earlier Fixes
Fixed non-blocking email sending in 4 files to use `await` instead of `.then().catch()`.

## Handlebars Features Used

The template uses these Handlebars features:

```handlebars
{{variableName}}                    # Output variable
{{#if condition}}...{{/if}}         # Conditional
{{#unless condition}}...{{/unless}} # Negative conditional
{{statusLabel}}                     # Dynamic content
```

This makes the template:
- **Easy to maintain** — Logic is in template, not code
- **Reusable** — Can be extracted to a separate file if needed
- **Readable** — Clear what data is being used
- **Flexible** — Easy to add new fields or conditions

## Testing

To test locally:

1. Purchase a ticket through checkout
2. Check your email inbox
3. Verify:
   - Email arrives
   - PNG files are attached with naming like `ticket-SWT-2026-ABC123.png`
   - QR codes are embedded and visible in email
   - Ticket image shows all event details
   - Status badge shows correct color/label

## Error Handling

If ticket image generation fails:
- Email still sends successfully
- QR code fallback used
- Error logged to console
- Non-blocking — doesn't interrupt order flow

## Future Enhancements

- Extract template to `templates/ticket.hbs` file
- Add custom fonts to template
- Support PDF generation alongside PNG
- Add barcode in addition to QR code
- Create batch/booklet view
- Add event organizer logo to header
- Support dark mode variant
