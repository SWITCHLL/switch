# Ticket Template Guide

The ticket template is embedded in `lib/ticket-image-generator.ts` as the `TICKET_TEMPLATE` constant.

## Handlebars Variables Available

When rendering a ticket, these variables are available in the template:

### Ticket Information
- `{{ticketNumber}}` — Ticket number (e.g., "SWT-2026-ABC123")
- `{{ticketId}}` — First 8 characters of ticket ID (uppercase)
- `{{status}}` — Ticket status (ACTIVE, USED, CANCELLED, REFUNDED, EXPIRED)

### Event Information
- `{{eventTitle}}` — Event name (e.g., "Concert: The Weeknd Live")
- `{{eventDate}}` — Formatted date (e.g., "Jan 15, 2026")
- `{{eventTime}}` — Formatted time (e.g., "08:00 PM")
- `{{eventVenue}}` — Venue name and city (optional, wrapped in {{#if eventVenue}}...{{/if}})
- `{{ticketType}}` — Ticket tier (e.g., "VIP", "General Admission")
- `{{seatLabel}}` — Seat number/label (optional, wrapped in {{#if seatLabel}}...{{/if}})

### QR Code & Status
- `{{qrCodeDataUrl}}` — QR code as PNG data URL (base64 encoded)
- `{{isValid}}` — Boolean: true if status is ACTIVE
- `{{statusLabel}}` — Human-readable status (e.g., "Valid", "Cancelled")
- `{{statusDotColor}}` — Hex color for status indicator dot
- `{{statusTextColor}}` — Hex color for status text
- `{{statusBgColor}}` — Hex color for status background
- `{{statusBorderColor}}` — Hex color for status border

## Template Syntax

### Output
```handlebars
{{variableName}}  # Output variable, HTML-escaped
```

### Conditionals
```handlebars
{{#if condition}}
  Content if true
{{/if}}

{{#unless condition}}
  Content if false
{{/unless}}
```

## Status Colors

Colors are automatically set based on ticket status:

| Status | Dot | Text | Background | Border |
|--------|-----|------|------------|--------|
| ACTIVE | #10b981 (green) | #059669 | #f0fdf4 | #86efac |
| USED | #a1a1aa (gray) | #71717a | #f4f4f5 | #d4d4d8 |
| CANCELLED | #ef4444 (red) | #b91c1c | #fef2f2 | #fecaca |
| REFUNDED | #f59e0b (amber) | #b45309 | #fffbeb | #fcd34d |
| EXPIRED | #a1a1aa (gray) | #71717a | #f4f4f5 | #d4d4d8 |

## Customizing the Template

### Change Colors
Find the gradient in `.ticket-header`:
```css
background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
```

Update to your brand colors (e.g., purple to blue, or your brand colors).

### Change Fonts
Update the font-family in `body`:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Or use a Google Font by adding to `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT" rel="stylesheet">
```

### Change Size
Modify `.ticket-container`:
```css
width: 360px;  /* Change to 480px, 560px, etc. */
```

### Add Logo
In the `.ticket-header` section, add:
```html
<div class="organizer-logo">
  <img src="{{organizerLogoUrl}}" alt="Organizer" />
</div>
```

Then add to template context in `generateTicketHtml()`:
```typescript
organizerLogoUrl: 'https://example.com/logo.png'
```

### Add Event Image
Replace gradient header with:
```html
{{#if eventImageUrl}}
  <img src="{{eventImageUrl}}" alt="{{eventTitle}}" class="event-image" />
{{else}}
  <div class="gradient-fallback"></div>
{{/if}}
```

## Example Custom Template

To customize, you can:

1. Extract `TICKET_TEMPLATE` to a file like `templates/ticket.hbs`
2. Load it dynamically:
```typescript
const templateStr = await fs.promises.readFile('templates/ticket.hbs', 'utf-8')
const template = Handlebars.compile(templateStr)
```

3. Update the template path in deployment configs

This allows non-developers to customize ticket design without touching code.
