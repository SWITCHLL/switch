# Background Workers

Switch uses [BullMQ](https://docs.bullmq.io/) for background job processing. The workers run as a **separate long-lived process** — they cannot run on Vercel. Deploy them to any platform that supports persistent Node.js processes.

## What runs here

| Worker | Queue | Trigger |
|--------|-------|---------|
| `reservation-expiry.worker.ts` | `reservation-expiry` | When a checkout hold expires (~10 min) |
| `waitlist-expiry.worker.ts` | `waitlist-expiry` | When a waitlist offer window closes (~30 min) |
| `group-expiry.worker.ts` | `group-expiry` | When a group booking deadline passes |
| `event-reminder.worker.ts` | `event-reminder` | 24 hours before an event starts |

All workers are idempotent — rerunning a job for an already-processed record is a safe no-op.

---

## Local development

Run the workers alongside `npm run dev` in a second terminal:

```bash
npm run workers:dev
```

This uses `tsx watch` so workers restart on file changes. You need a local Redis instance or an Upstash Redis URL in `REDIS_URL` / `WORKER_REDIS_URL`.

> **Why `--conditions react-server`?** The `server-only` package (used in `lib/db`, `lib/redis`, etc.) normally throws in non-Next.js environments. Passing this condition flag makes it resolve to the no-op shim instead.

---

## Production deployment

The workers need these env vars from your `.env.example`:

```
NODE_ENV=production
DATABASE_URL=
DIRECT_URL=
WORKER_REDIS_URL=        # can be the same as REDIS_URL
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=     # used in email links
NIN_ENCRYPTION_KEY=      # only needed if workers touch NIN data
```

### Option A — Railway (recommended)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo
3. Railway will detect `railway.json` and use `Dockerfile.workers` automatically
4. Add the env vars listed above in the Railway dashboard
5. Deploy — Railway keeps the process alive and restarts on failure

### Option B — Render

1. Create a new **Background Worker** service on [Render](https://render.com)
2. Connect your GitHub repo — Render detects `render.yaml` automatically
3. Add env vars in the Render dashboard
4. Deploy

### Option C — Fly.io

```bash
fly launch --name switch-workers --dockerfile Dockerfile.workers --no-deploy
fly secrets set DATABASE_URL="..." WORKER_REDIS_URL="..." RESEND_API_KEY="..." # etc.
fly deploy
```

### Option D — Any VPS / Docker host

```bash
docker build -f Dockerfile.workers -t switch-workers .
docker run -d --restart=unless-stopped --env-file .env.production switch-workers
```

---

## Architecture note

The Next.js app (Vercel) **enqueues** jobs via `lib/queues.ts`. The workers **consume** those jobs from the same Redis queues. Both sides connect to the same Upstash Redis instance — that's the only shared dependency between Vercel and the worker host.

```
Vercel (Next.js)          Upstash Redis          Worker host
──────────────────        ──────────────         ─────────────────────────
scheduleReservation()  →  reservation-expiry  →  reservation-expiry.worker
scheduleWaitlist()     →  waitlist-expiry     →  waitlist-expiry.worker
scheduleGroupExpiry()  →  group-expiry        →  group-expiry.worker
scheduleEventReminder()→  event-reminder      →  event-reminder.worker
```
