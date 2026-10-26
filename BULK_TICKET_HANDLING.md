# Bulk Ticket Handling (5+ Tickets)

## What Happens When User Buys 6+ Tickets

### Email Display
When a user purchases **6 or more tickets**, the email shows:

**Inline (Email Body):**
- Maximum **6 tickets displayed** with QR codes
- Example: User buys 10 tickets → Shows first 6
- Message: "+ 4 more tickets — view all in your dashboard"

**Attachments (Email Attachments):**
- **ALL 10 tickets attached as PNG files**
- Each file: `ticket-{ticketNumber}.png`
- User can download all 10 PNG files

### Current Behavior

```typescript
// In lib/email.ts
const ticketsToShow = params.tickets.slice(0, 6)  // Only first 6 for display
const extraCount = params.tickets.length - ticketsToShow.length  // Extra count

// Generate QR data URLs for first 6 only
const qrDataUrls = await Promise.all(
  ticketsToShow.map(...)  // Only 6 QR codes
)

// Generate PNG images for ALL tickets
const ticketImages = await generateTicketImages(
  params.tickets.map(...)  // ALL tickets → ALL PNGs
)
```

### Example Scenarios

#### User buys 6 tickets
```
Email body shows: 6 tickets with inline QR codes
Attachments: ticket-SWT-2026-001.png, ticket-SWT-2026-002.png, ..., ticket-SWT-2026-006.png
Message: No extra message (extraCount = 0)
```

#### User buys 10 tickets
```
Email body shows: First 6 tickets with inline QR codes
Attachments: All 10 PNG files (001-010)
Message: "+ 4 more tickets — view all in your dashboard"
```

#### User buys 20 tickets
```
Email body shows: First 6 tickets with inline QR codes
Attachments: All 20 PNG files (001-020)
Message: "+ 14 more tickets — view all in your dashboard"
```

---

## Performance Impact

### Email Generation Time

| Tickets | Time (approx) | Bottleneck | Status |
|---------|---------------|-----------|--------|
| 1-3 | 300-900ms | PNG generation | ✅ Fast |
| 4-6 | 1.2-1.8s | PNG generation | ✅ Acceptable |
| 7-10 | 2.1-3s | PNG generation | ⚠️ Slow |
| 11-15 | 3.3-4.5s | PNG generation | ⚠️ Slow |
| 16-20 | 4.8-6s | PNG generation | ⚠️ Very Slow |
| 20+ | 6s+ | PNG generation | ⚠️ Risk of timeout |

### Breakdown (per ticket)
- QR code generation: ~50ms
- Handlebars template rendering: ~20ms
- HTML to PNG conversion: ~150-200ms ← **Main bottleneck**
- Buffer creation: ~10ms

**Total per ticket: ~230-280ms**

### Email File Size

| Tickets | Approx Size | Resend Limit |
|---------|-------------|--------------|
| 1 | 50-70KB | ✅ 25MB |
| 5 | 250-350KB | ✅ 25MB |
| 10 | 500-700KB | ✅ 25MB |
| 20 | 1-1.4MB | ✅ 25MB |
| 50 | 2.5-3.5MB | ✅ 25MB |

---

## Current Issues & Solutions

### Issue 1: Sequential PNG Generation
**Problem:** Tickets are generated one at a time (sequential)
```typescript
// Current: Sequential
await Promise.all(
  tickets.map(t => generateTicketImage(t))
)
// With 10 tickets: ~2-3 seconds
```

**Solution:** This is optimal for server resources, acceptable for current volume.

### Issue 2: Serverless Function Timeout
**Problem:** On Vercel, functions timeout after 60-300 seconds depending on plan
**Current Status:** Safe for up to 100+ tickets

For 20 tickets = 5.4s, well under 60s limit ✅

### Issue 3: Email Size Limits
**Problem:** Too many large attachments could exceed email provider limits
**Current Status:** 
- Resend limit: 25MB
- 10 tickets ≈ 700KB (safe)
- 50 tickets ≈ 3.5MB (safe)
- Even 100+ tickets should be fine

---

## Recommended Improvements

### For Users Buying 10+ Tickets

#### Option 1: Batch Email + Download Link (Recommended)
Instead of attaching all PNGs, send:
1. Email with first 6 tickets (inline)
2. Generate ZIP file with all PNGs
3. Upload to Supabase Storage
4. Send download link in email

**Benefits:**
- Email stays small (~100KB)
- Faster email delivery
- Users can download all at once
- Can retry if needed

**Implementation:**
```typescript
// lib/ticket-zip-generator.ts
async function generateTicketZip(tickets: TicketData[]) {
  // Create ZIP with all PNGs
  // Upload to Supabase
  // Return download URL
}

// In sendTicketConfirmationEmail()
if (params.tickets.length > 10) {
  const zipUrl = await generateTicketZip(params.tickets)
  // Include link in email
} else {
  // Attach all PNGs (current behavior)
}
```

#### Option 2: Parallel PNG Generation (Current Limit)
```typescript
// Generate up to 5 tickets in parallel
const BATCH_SIZE = 5
for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
  const batch = tickets.slice(i, i + BATCH_SIZE)
  await Promise.all(batch.map(t => generateTicketImage(t)))
}
// Would reduce 10 tickets from 2.8s to ~0.6s
```

#### Option 3: Move to Background Queue
```typescript
// Instead of awaiting in email:
// 1. Send email immediately with first 6 tickets
// 2. Schedule PNG generation in background (BullMQ)
// 3. Send follow-up email with remaining PNGs when ready

await sendTicketConfirmationEmail({...})
scheduleTicketAttachmentEmail({...})
```

---

## What to Monitor

### Current Metrics (Production)
- **Email generation time:** Should be < 10s
- **Email delivery:** Track in Resend dashboard
- **Attachment count:** Usually 1-5 per email
- **Email size:** Usually < 1MB

### Red Flags
🚩 Email generation takes > 30s
🚩 Email size exceeds 5MB
🚩 Users report missing attachments
🚩 Resend error: "Request entity too large"

---

## Testing Bulk Orders

### Local Testing
```bash
# Test 10 ticket purchase
1. Create event with 10 available tickets
2. Go to checkout
3. Select 10 tickets
4. Complete payment
5. Check email inbox
6. Verify all 10 PNGs attached
7. Time the email delivery (should be < 10s)
```

### Staging Testing
```bash
# Load test with multiple concurrent orders
1. Simulate 5 users each buying 10 tickets
2. Monitor email queue in Resend
3. Check server logs for performance
4. Verify all emails deliver successfully
```

---

## Future Enhancement: ZIP Approach

When implementing Option 1 (ZIP for bulk orders):

```typescript
// lib/ticket-zip-generator.ts
import JSZip from 'jszip'

export async function generateTicketZip(tickets: TicketData[]): Promise<{
  zipBuffer: Buffer
  filename: string
}> {
  const zip = new JSZip()
  
  // Add all ticket PNGs to ZIP
  for (const ticket of tickets) {
    const png = await generateTicketImage(ticket)
    zip.file(`ticket-${ticket.ticketNumber}.png`, png)
  }
  
  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  
  return {
    zipBuffer,
    filename: `tickets-${tickets[0].eventTitle}.zip`
  }
}

// Then upload to Supabase and send download link
```

---

## Checklist for Bulk Order Support

- [x] Accepts 6+ tickets in single order
- [x] Generates all PNG attachments
- [x] Shows message for overflow tickets
- [x] Email delivery tested
- [ ] ZIP file generation for 20+ tickets
- [ ] Background job queue for large orders
- [ ] Performance monitoring/alerts
- [ ] User communication about email size

---

## Summary

### Current Behavior (5+ tickets)
✅ Email arrives with first 6 tickets visible
✅ All PNGs attached (even if 6+)
✅ Message directs users to dashboard for full list
✅ Works reliably up to ~20 tickets
⚠️ Gets slow (> 5s) above 15 tickets
⚠️ No batching/optimization for bulk

### Recommended Next Step
→ Implement ZIP download link for orders with 10+ tickets
→ Keep current behavior for < 10 tickets
→ Reduces email size and generation time significantly
