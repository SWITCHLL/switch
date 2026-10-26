# Quick Start: Bulk Order ZIP Downloads

## In 5 Minutes

### 1. Create Supabase Bucket (3 min)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Storage** → **Create a new bucket**
4. Name: `ticket-downloads`
5. Toggle **Public** ON
6. Click **Create**

Done! ✅

### 2. Update Environment Variables (1 min)

Add to `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these in: Supabase → Settings → API

### 3. Deploy & Test (1 min)

```bash
# Run dev server
npm run dev

# Go to http://localhost:3000
# Buy 10+ tickets
# Check email for ZIP download button
```

That's it! 🎉

---

## How to Use

### For Orders < 10 Tickets
- Email has individual PNG attachments
- No ZIP file needed
- Works exactly like before

### For Orders ≥ 10 Tickets
- Email has download button for ZIP
- ZIP contains all ticket PNGs
- Click button to download all at once
- ZIP expires in 7 days

---

## What Changed

| Before | After |
|--------|-------|
| 10 tickets = 700KB email | 10 tickets = 100KB email |
| All PNGs attached | ZIP download link |
| Large attachment | Instant download |

---

## Troubleshooting

### "Supabase credentials not configured"
→ Check `.env.local` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "Upload failed: 403"
→ Check Supabase bucket is named `ticket-downloads` and is **Public**

### ZIP link doesn't work
→ Link expires after 7 days, user can see first 6 tickets in email or dashboard

### Email takes too long
→ Normal — PNG generation takes time. Email still arrives reliably.

---

## File Structure

```
Supabase Storage / ticket-downloads
├── tickets
│   └── {userId}
│       └── {reservationId}
│           └── tickets-{eventName}-{shortId}.zip
```

Example: `tickets/user-123/res-456/tickets-afrobeats-res456.zip`

---

## Monitoring

### Check storage usage:
Supabase Dashboard → Storage → ticket-downloads → View bucket

### Check email logs:
Resend Dashboard → Email Logs → Search for user email

### Check server logs:
Look for `[sendTicketConfirmationEmail] Bulk order ZIP created`

---

## That's All!

The feature is now live. Orders of 10+ tickets will automatically receive ZIP downloads instead of large email attachments.

For more details, see `ZIP_DOWNLOAD_SETUP.md`
