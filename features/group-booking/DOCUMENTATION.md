# Group Booking with Split Payment

A feature that lets one user initiate a group ticket order, share a link, and have each member pay for their own seat individually. Seats are held during the payment window and auto-released if the deadline passes.

---

## Table of Contents

1. [Overview](#overview)
2. [User Flows](#user-flows)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Slot & Order Lifecycle](#slot--order-lifecycle)
6. [API Reference](#api-reference)
7. [Queries](#queries)
8. [Redis Keys](#redis-keys)
9. [BullMQ Worker](#bullmq-worker)
10. [UI Components](#ui-components)
11. [Pages & Routes](#pages--routes)
12. [Email Notifications](#email-notifications)
13. [Expiry Modes](#expiry-modes)
14. [Security Model](#security-model)
15. [Environment Variables](#environment-variables)
16. [Fixes & Known Issues Log](#fixes--known-issues-log)
17. [What's Next](#whats-next)

---

## Overview

Group booking solves the "who's paying?" problem for social events. One person (the **initiator**) picks seats or tickets, sets a payment deadline, and shares a link. Each group member opens the link, claims a slot, and pays independently via Paystack. No one person is on the hook for the whole bill.

Supports both **reserved seating** (specific seat IDs) and **general admission** (ticket type + quantity) events, and both modes can be mixed for MIXED seating events.

---

## User Flows

### Initiator flow

```
1. Browse event → event detail page
2. "Get Tickets" widget → click "Group" tab
3. Select quantities (GA) or seats are pre-selected (Reserved)
4. Set deadline (10 / 15 / 30 / 60 min)
5. Toggle all-or-nothing if needed
6. Click "Create group · N slots"
7. Redirected to /group/GRP-XXXXXX
8. Copy shareable link → send via WhatsApp, DM, etc.
9. Monitor slot status live on the same page
10. Receives email when all slots are paid
```

### Member flow

```
1. Receive link /group/GRP-XXXXXX
2. Open page — see event info, countdown timer, slot list
3. Sign in if not already authenticated
4. Click "Claim" on an open slot
5. Redirected to /checkout/group-slot to complete Paystack payment
6. Ticket issued on successful payment
7. Slot shows as "Paid" on the group page for everyone
```

### Expiry flow

```
Deadline fires (BullMQ job)
    ↓
All-or-nothing mode:
  → Unpaid slots released back to general inventory
  → If any paid slots exist → order marked EXPIRED (admin handles refunds)
  → If no paid slots → order marked EXPIRED

Best-effort mode (default):
  → Unpaid slots released back to general inventory
  → Paid slots keep their tickets
  → Order marked COMPLETE (if any paid) or EXPIRED (if none paid)
```

---

## Architecture

```
features/group-booking/
├── actions.ts      ← Server Actions (create, claim, confirm, release, cancel)
├── queries.ts      ← Data fetching (server-only)
├── schemas.ts      ← Zod validation schemas
├── types.ts        ← TypeScript domain types + action result types
├── index.ts        ← Public API
├── DOCUMENTATION.md
└── components/
    ├── group-booking-panel.tsx   ← Creation UI inside TicketSelector
    ├── slot-list.tsx             ← Per-slot status + claim buttons
    ├── group-countdown.tsx       ← Live countdown timer
    ├── group-progress.tsx        ← Animated paid/total progress bar
    └── copy-link.tsx             ← One-tap copy + native share API

app/(marketing)/group/[code]/
├── page.tsx              ← Server-rendered join page (SSR + metadata)
└── group-join-client.tsx ← Client island: countdown, claims, cancel

features/events/components/
└── ticket-selector.tsx   ← Updated with Solo / Group tab toggle

lib/
├── redis.ts    ← Seat + group slot lock helpers, TLS-aware Upstash config
├── queues.ts   ← BullMQ queue singleton + scheduleGroupExpiry()
└── email.ts    ← sendGroupBookingInviteEmail, sendGroupCompleteEmail

workers/
└── group-expiry.worker.ts  ← Processes deadline expiry jobs
```

---

## Database Schema

### New enums

```prisma
enum GroupOrderStatus {
  PENDING    // waiting for members to pay
  COMPLETE   // all slots paid (or best-effort closed)
  EXPIRED    // deadline passed; unpaid slots released
  CANCELLED  // initiator cancelled before any slot was paid
}

enum GroupSlotStatus {
  OPEN     // unclaimed — any group member can take it
  HELD     // member claimed it, payment in progress (15 min Redis TTL)
  PAID     // payment complete, ticket issued
  RELEASED // member dropped out or slot auto-expired
}
```

### GroupOrder

| Column               | Type               | Description                                   |
| -------------------- | ------------------ | --------------------------------------------- |
| `id`                 | `String`           | CUID primary key                              |
| `eventId`            | `String`           | FK → events                                   |
| `initiatorId`        | `String`           | FK → users (creator of the group)             |
| `code`               | `String`           | Unique human-readable code, e.g. `GRP-8F3A2C` |
| `status`             | `GroupOrderStatus` | Current state of the order                    |
| `requireFullPayment` | `Boolean`          | All-or-nothing mode flag                      |
| `expiresAt`          | `DateTime`         | Hard deadline — BullMQ fires at this time     |
| `createdAt`          | `DateTime`         | —                                             |
| `updatedAt`          | `DateTime`         | —                                             |

### GroupOrderSlot

One row per ticket/seat in the group. Each member claims and pays for one slot.

| Column         | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| `id`           | `String`          | CUID primary key                                           |
| `groupOrderId` | `String`          | FK → group_orders                                          |
| `eventSeatId`  | `String?`         | FK → event_seats (reserved seating only)                   |
| `ticketTypeId` | `String?`         | FK → ticket_types (GA seating only)                        |
| `price`        | `Int`             | Price in minor units (kobo), snapshotted at group creation |
| `currency`     | `String`          | Default `NGN`                                              |
| `label`        | `String?`         | Optional display label, e.g. `"John's seat"`               |
| `status`       | `GroupSlotStatus` | Current state of the slot                                  |
| `claimedBy`    | `String?`         | FK → users — set when member claims                        |
| `claimedAt`    | `DateTime?`       | When the claim was made                                    |
| `paymentId`    | `String?`         | FK → payments (unique) — set on payment                    |
| `ticketId`     | `String?`         | FK → tickets (unique) — set after ticket is issued         |

### Relations added to existing models

| Model        | New relation                                                    |
| ------------ | --------------------------------------------------------------- |
| `User`       | `initiatedGroups GroupOrder[]`, `claimedSlots GroupOrderSlot[]` |
| `Event`      | `groupOrders GroupOrder[]`                                      |
| `EventSeat`  | `groupSlots GroupOrderSlot[]`                                   |
| `TicketType` | `groupSlots GroupOrderSlot[]`                                   |
| `Ticket`     | `groupSlot GroupOrderSlot?`                                     |
| `Payment`    | `groupSlot GroupOrderSlot?`                                     |

### Migration

File: `prisma/migrations/20260816000001_group_booking/migration.sql`

All statements are additive (`CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN … EXCEPTION` enum guards). Safe to apply to an existing database.

To apply:

```bash
npx prisma migrate deploy
```

If you previously used `db push` to set up the database, baseline the older migrations first:

```bash
npx prisma migrate resolve --applied "20260809000000_init"
npx prisma migrate resolve --applied "20260809000001_domain"
# etc. for any migrations that already exist as tables in the DB
npx prisma migrate deploy
```

---

## Slot & Order Lifecycle

### Slot state machine

```
OPEN
 │
 ├─[claim]──→ HELD ──[payment confirmed]──→ PAID
 │               │
 │               └─[member drops out / timeout]──→ OPEN
 │
 └─[expiry / cancel]──→ RELEASED
```

### Order state machine

```
PENDING
 │
 ├─[all slots PAID]──────────────────────────────→ COMPLETE
 │
 ├─[initiator cancels, 0 paid slots]────────────→ CANCELLED
 │
 └─[deadline fires]
      ├─ requireFullPayment=true, any paid slots → EXPIRED (admin refunds)
      ├─ requireFullPayment=true, 0 paid slots   → EXPIRED
      ├─ requireFullPayment=false, any paid slots → COMPLETE
      └─ requireFullPayment=false, 0 paid slots  → EXPIRED
```

---

## API Reference

All server actions are in `features/group-booking/actions.ts` and exported via `index.ts`.

### `createGroupOrder(input)`

Creates a group order, holds reserved seats, and schedules the expiry job.

**Input**

```ts
{
  eventId: string
  reservedSlots?: Array<{
    eventSeatId: string
    label?: string          // max 60 chars
  }>
  gaSlots?: Array<{
    ticketTypeId: string
    quantity: number        // 1–20
    label?: string          // max 60 chars
  }>
  requireFullPayment?: boolean   // default false
  ttlMinutes?: number            // 5–60, default 15
}
```

**Returns**

```ts
{ success: true; groupOrderId: string; code: string }
| { success: false; error: string }
```

**Behaviour**

- Validates event is `PUBLISHED` and within sales window
- For reserved slots: acquires Redis seat locks before the DB transaction, double-checks availability inside the transaction
- Generates a unique `GRP-XXXXXX` code (retries on collision)
- Sets `EventSeat.status = HELD` for all reserved seats
- Schedules BullMQ expiry job with idempotent `jobId` (`group-expiry-{groupOrderId}`)

> **Note:** BullMQ job IDs cannot contain `:` — the job ID uses `-` as a separator, not `:`.

---

### `claimSlot(input)`

Called when a member clicks "Claim" on a slot. Acquires a Redis lock on the slot and marks it `HELD`.

**Input**

```ts
{
  slotId: string
}
```

**Returns**

```ts
{ success: true; slotId: string; amount: number; currency: string }
| { success: false; error: string }
```

**Behaviour**

- Requires authentication — unauthenticated users are redirected to `/login`
- Validates group order is `PENDING` and not expired
- Acquires `group-slot-lock:{slotId}` in Redis (15 min TTL, `SET NX EX`)
- Double-checks slot is still `OPEN` inside a DB transaction
- On success: caller is redirected to `/checkout/group-slot?slotId=…&amount=…`

---

### `confirmGroupSlotPayment(input)`

Called from the Paystack webhook after successful payment. Issues the ticket and checks whether all slots are now paid.

**Input**

```ts
{
  slotId: string
  paystackReference: string
}
```

**Returns**

```ts
{ success: true; ticketId: string; groupComplete: boolean }
| { success: false; error: string }
```

**Behaviour**

- Validates slot is `HELD` and has a claimer
- Resolves organizer fee (custom `feePercent` or env default)
- Inside a single DB transaction:
  - Creates `Ticket` with unique `ticketNumber` + `qrCode`
  - Creates `Payment` with fee snapshot
  - Marks `EventSeat.status = SOLD` (reserved seating)
  - Increments `TicketType.sold` (GA seating)
  - Sets slot `status = PAID` and links `ticketId`
- Releases the Redis slot lock
- Checks if all sibling slots are `PAID` → marks order `COMPLETE` + fires completion email

---

### `releaseSlot(input)`

Called when a member drops out of a `HELD` slot before paying.

**Input**

```ts
{
  slotId: string
}
```

**Returns**

```ts
{ success: true } | { success: false; error: string }
```

**Behaviour**

- Only the user who claimed the slot can release it
- `PAID` slots cannot be released (must submit a refund request instead)
- Resets slot to `OPEN` and releases Redis lock
- The underlying `EventSeat` stays `HELD` for the group (not returned to general inventory)

---

### `cancelGroupOrder(input)`

Initiator cancels the entire group order. Only allowed before any slot is paid.

**Input**

```ts
{
  groupOrderId: string
}
```

**Returns**

```ts
{ success: true } | { success: false; error: string }
```

**Behaviour**

- Only the initiator can cancel
- Blocked if any slot has `status = PAID`
- Releases all held `EventSeat` records back to `AVAILABLE`
- Releases Redis locks for all `HELD` slot claimers
- Sets all slots to `RELEASED` and order to `CANCELLED`

---

## Queries

All queries are in `features/group-booking/queries.ts` and are `server-only`.

### `getGroupOrderByCode(code: string)`

Fetches a full `GroupOrderDetail` by the public shareable code. Used on the join page.

### `getGroupOrderById(id: string)`

Same shape as above but looks up by internal ID.

### `getMyGroupOrders(userId: string)`

Returns all group orders initiated by a user, with event info and slot status summary.

### `GroupOrderDetail` shape

```ts
{
  id, code, status, requireFullPayment, expiresAt, createdAt,
  event: { id, title, slug, imageUrl, startsAt, venue },
  initiator: { id, name, image },
  slots: GroupSlot[],
  // Computed
  totalSlots: number,
  paidSlots: number,
  openSlots: number,
  totalAmount: number,   // sum of all slot prices in kobo
}
```

---

## Redis Keys

| Key                            | Value    | TTL    | Purpose                                   |
| ------------------------------ | -------- | ------ | ----------------------------------------- |
| `seat-lock:{eventId}:{seatId}` | `userId` | 10 min | Existing seat lock from checkout          |
| `group-slot-lock:{slotId}`     | `userId` | 15 min | Prevents two users claiming the same slot |

Both use atomic `SET NX EX` for acquisition and a Lua check-and-delete script for release.

---

## BullMQ Worker

**Queue name:** `group-expiry`

**File:** `workers/group-expiry.worker.ts`

**Job data:**

```ts
{
  groupOrderId: string
}
```

**Scheduling:** Jobs are enqueued by `scheduleGroupExpiry()` in `lib/queues.ts` with a `delay` calculated from `expiresAt`. The `jobId` is `group-expiry-{groupOrderId}` (hyphen separator — BullMQ disallows colons in job IDs).

**Starting the worker:**

```bash
npx tsx workers/index.ts
```

**Concurrency:** 5 parallel jobs. Retries up to 3 times with exponential backoff (5 s base).

**Graceful shutdown:** `SIGTERM` and `SIGINT` handlers call `worker.close()`.

---

## UI Components

All components are in `features/group-booking/components/`.

### `<GroupBookingPanel>`

The main creation UI. Rendered inside the existing `TicketSelector` widget when the user switches to the "Group" tab.

```tsx
<GroupBookingPanel
  event={event}
  selectedSeatIds={['es_abc', 'es_xyz']} // pre-selected from seat map (reserved events)
/>
```

For GA events: shows quantity steppers per ticket type.
For Reserved events: shows a seat count summary (seats already chosen on the seat map page).

Includes:

- Deadline picker (10 / 15 / 30 / 60 min)
- All-or-nothing toggle
- "Create group · N slots" CTA that calls `createGroupOrder` and redirects to `/group/[code]`

### `<SlotList>`

Renders the list of slots with per-slot status badges and claim buttons.

```tsx
<SlotList
  slots={order.slots}
  currentUserId={userId}
  onClaim={(slotId) => {
    /* call claimSlot */
  }}
  claimingSlotId={slotId | null}
/>
```

| Status     | Colour         | Label    |
| ---------- | -------------- | -------- |
| `OPEN`     | Emerald        | Open     |
| `HELD`     | Amber          | Claimed  |
| `PAID`     | Brand (indigo) | Paid     |
| `RELEASED` | Zinc           | Released |

### `<GroupCountdown>`

Live countdown timer that ticks every second. Amber when ≥ 3 min, red + animated pulse when < 3 min. Calls `onExpired` when it reaches zero.

```tsx
<GroupCountdown expiresAt={order.expiresAt} onExpired={() => setExpired(true)} />
```

### `<GroupProgress>`

Animated progress bar showing paid vs total slots. Shows "All-or-nothing" badge when `requireFullPayment` is true. Bar turns solid emerald at 100%.

```tsx
<GroupProgress paidSlots={3} totalSlots={5} requireFullPayment={false} />
```

### `<CopyLink>`

One-tap copy-to-clipboard with `window.prompt` fallback. Renders a native share button (`navigator.share`) on mobile when available.

```tsx
<CopyLink url="https://switchapp.io/group/GRP-8F3A2C" />
```

### `TicketSelector` — updated

The existing `TicketSelector` component now has a **Solo | Group** tab toggle at the top of the widget. The Group tab is only shown to authenticated users on available events. Unauthenticated users still see the standard solo flow.

---

## Pages & Routes

### `/group/[code]` — Public join page

**File:** `app/(marketing)/group/[code]/page.tsx`

Server-rendered. Fetches group order and current session in parallel. Renders:

- Event banner with image, title, date, venue
- 3-stat summary grid (total / paid / open slots)
- `<GroupJoinClient>` for all interactive elements

Generates dynamic `<title>` and `<description>` metadata for link preview cards (WhatsApp, Telegram, Twitter).

Returns `404` if the code doesn't match any group order.

### `GroupJoinClient`

**File:** `app/(marketing)/group/[code]/group-join-client.tsx`

Client component handling:

- Live countdown with expiry state
- Slot claiming with per-slot loading states
- Unauthenticated redirect to `/login?next=/group/{code}`
- Post-claim redirect to `/checkout/group-slot?slotId=…&amount=…&currency=…&code=…`
- Cancel confirmation (two-tap pattern)
- Terminal state displays (complete / cancelled / expired)

---

## Email Notifications

Both functions are in `lib/email.ts`.

### `sendGroupBookingInviteEmail`

Send manually when you want to invite specific members by email.

```ts
await sendGroupBookingInviteEmail({
  toEmail: 'member@example.com',
  toName: 'Amaka',
  initiatorName: 'Chidi',
  eventTitle: 'Wizkid Live Lagos',
  groupCode: 'GRP-8F3A2C',
  expiresAt: new Date('...'),
})
```

### `sendGroupCompleteEmail`

Sent to the initiator automatically when the last slot is paid. Fires non-blocking (`.catch()`) inside `confirmGroupSlotPayment`.

---

## Expiry Modes

Set via `requireFullPayment` when creating the group order.

### Best-effort (`requireFullPayment: false`) — default

Everyone who paid gets their ticket. At the deadline:

- Unpaid slots released back to general inventory
- Paid slots keep their tickets
- Order closes as `COMPLETE` (any paid) or `EXPIRED` (none paid)

Best for: large GA groups, concerts, festivals.

### All-or-nothing (`requireFullPayment: true`)

Everyone pays or nobody gets in. At the deadline:

- If all slots paid → `COMPLETE` (normal)
- If any slots unpaid → `EXPIRED`, unpaid seats released, paid slots flagged for admin refund

Best for: table bookings, reserved rows, small groups where going together is the point.

---

## Security Model

| Concern                           | Mitigation                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Two users claiming the same slot  | Redis `SET NX EX` atomic lock + DB transaction double-check                      |
| Seat price manipulation           | Price snapshotted at group creation from DB, never from client                   |
| Claiming someone else's slot      | `claimedBy === userId` check in `releaseSlot`                                    |
| Cancelling with paid members      | `cancelGroupOrder` blocks if any slot has `status = PAID`                        |
| Replay attacks on webhooks        | `paystackReference` is `@unique` on `Payment` — duplicate calls fail at DB level |
| Expired slots still being claimed | `expiresAt` checked in `claimSlot` before any lock is acquired                   |
| Initiator-only cancel             | `initiatorId === userId` guard in `cancelGroupOrder`                             |

---

## Environment Variables

### Required

| Variable           | Description                                             | Where to get it                       |
| ------------------ | ------------------------------------------------------- | ------------------------------------- |
| `REDIS_URL`        | Upstash TCP connection string                           | Upstash dashboard → Connect → ioredis |
| `WORKER_REDIS_URL` | Same as `REDIS_URL` — used by the BullMQ worker process | Same source                           |

### Format

Upstash TCP connections use TLS. The URL **must** start with `rediss://` (double `s`):

```
REDIS_URL=rediss://default:your_password@your-db.upstash.io:6379
WORKER_REDIS_URL=rediss://default:your_password@your-db.upstash.io:6379
```

Using `redis://` (single `s`) will be rejected by Upstash in production.

### TLS handling

`lib/redis.ts` detects the `rediss://` prefix and automatically sets `tls: { rejectUnauthorized: false }` on the ioredis client. This is required for Upstash because their TLS certificate is issued to a shared `*.upstash.io` domain. The worker (`workers/group-expiry.worker.ts`) applies the same option to its own connection.

### Local development

For local dev without Upstash, you can use a plain local Redis instance:

```
REDIS_URL=redis://localhost:6379
```

The TLS option is only applied when the URL starts with `rediss://`, so local dev is unaffected.

---

## Fixes & Known Issues Log

| Date       | Issue                                                  | Fix                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-16 | `public.group_orders` table not found                  | Database had tables from `db push` with no migration history. Resolved by baselining existing migrations with `prisma migrate resolve --applied` then running `prisma migrate deploy` |
| 2026-08-16 | `[createGroupOrder] Error: Custom Id cannot contain :` | BullMQ job IDs do not allow colons. Changed `group-expiry:{id}` to `group-expiry-{id}` in `lib/queues.ts`                                                                             |
| 2026-08-16 | Upstash TLS connection failures                        | Added `tls: { rejectUnauthorized: false }` to ioredis client options in `lib/redis.ts` and `workers/group-expiry.worker.ts` when `rediss://` scheme is detected                       |

---

## What's Next

1. **Checkout page** — build `/checkout/group-slot` to collect Paystack payment for a single slot using the `slotId` and `amount` query params set by `claimSlot`

2. **Paystack webhook handler** — wire `confirmGroupSlotPayment` into `/api/webhooks/paystack` (verify HMAC signature from `PAYSTACK_WEBHOOK_SECRET`, match on `paystackReference`)

3. **Dashboard view** — add a "My Groups" tab to `/dashboard/tickets` using `getMyGroupOrders`, showing status and slot progress per group

4. **Admin view** — surface `EXPIRED` orders with paid slots so admins can process refunds

5. **Real-time slot updates** — replace `router.refresh()` with SSE or polling on the join page so members see claims live without a manual refresh
