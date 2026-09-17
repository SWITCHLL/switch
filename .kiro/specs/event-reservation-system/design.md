# Technical Design Document

## Event Reservation System

## Overview

This document describes the technical design for the remaining reservation models and management capabilities on the SWITCH platform. It extends the existing checkout, payment, and ticketing infrastructure without replacing it. All new models follow the same patterns established by the group-booking feature: Server Actions with Zod validation, server-only query modules, Redis distributed locks, BullMQ background jobs, and Prisma transactions.

---

## Architecture

```
features/
├── checkout/            ← Extended: RSVP, purchase limits, visibility unlock
├── waitlist/            ← New feature module
│   ├── actions.ts
│   ├── queries.ts
│   ├── schemas.ts
│   ├── types.ts
│   └── components/
├── time-slots/          ← New feature module
│   ├── actions.ts
│   ├── queries.ts
│   ├── schemas.ts
│   ├── types.ts
│   └── components/
├── sessions/            ← New feature module
│   ├── actions.ts
│   ├── queries.ts
│   ├── schemas.ts
│   ├── types.ts
│   └── components/
├── organizer/           ← Extended: inventory dashboard, reservation management
│   ├── actions.ts       ← Extended
│   ├── queries.ts       ← Extended
│   └── components/
│       ├── inventory-dashboard.tsx
│       ├── reservation-table.tsx
│       ├── ticket-type-form.tsx
│       ├── table-config-tab.tsx
│       ├── time-slot-config-tab.tsx
│       └── session-config-tab.tsx

app/
├── (marketing)/
│   └── events/
│       └── [slug]/
│           └── checkout/
│               └── success/
│                   └── page.tsx          ← New: confirmation page
├── (dashboard)/
│   └── dashboard/
│       ├── events/
│       │   └── [id]/
│       │       ├── inventory/
│       │       │   └── page.tsx          ← New: inventory dashboard
│       │       └── reservations/
│       │           └── page.tsx          ← New: reservation management

workers/
├── reservation-expiry.worker.ts          ← New
└── waitlist-expiry.worker.ts             ← New (or merged into reservation-expiry)

lib/
├── queues.ts            ← Extended: scheduleReservationExpiry, scheduleWaitlistExpiry
├── email.ts             ← Extended: new notification templates
└── redis.ts             ← Extended: inventory hold key helpers
```

---

## Data Models

### 2.1 New Enums

```prisma
enum WaitlistStatus {
  PENDING    // waiting for inventory to free up
  OFFERED    // inventory hold created, payment window open
  FULFILLED  // payment completed, ticket issued
  EXPIRED    // offer window passed without payment, or event closed
  CANCELLED  // attendee removed themselves
}

enum SessionInclusionMode {
  INCLUDED          // automatically enrolled with event ticket
  OPTIONAL_FREE     // attendee selects at no cost
  OPTIONAL_PAID     // attendee selects; adds to order total
  CAPACITY_LIMITED  // free but limited capacity; attendee must select
}

enum TicketVisibility {
  PUBLIC             // default — visible to all
  HIDDEN             // omitted from public event page
  PASSWORD_PROTECTED // shown with password prompt
}

enum AuditEntityType {
  RESERVATION
  TICKET
  WAITLIST_ENTRY
  EVENT_SEAT
}

enum AuditAction {
  CREATED
  STATUS_CHANGED
  CANCELLED
  REFUNDED
  ISSUED
  EXPIRED
  OFFERED
  FULFILLED
}
```

### 2.2 Modified Models

#### TicketType — new fields

```prisma
model TicketType {
  // ... existing fields ...

  // Purchase limits
  minPerOrder  Int?   // null = no minimum
  maxPerOrder  Int?   // null = no maximum
  maxPerUser   Int?   // null = no per-user limit

  // Visibility control
  visibility         TicketVisibility @default(PUBLIC)
  /// bcrypt hash of the access password (only set when visibility = PASSWORD_PROTECTED)
  accessPasswordHash String?
  /// Opaque token for direct-link unlock (only set when visibility = HIDDEN)
  directLinkToken    String?          @unique

  // Metadata for table reservations (stored as TicketType with this flag set)
  isTableType        Boolean          @default(false)
  tableCapacity      Int?             // seats per table
  requiresAssignedSeating Boolean     @default(false)

  // Relations
  waitlistEntries    WaitlistEntry[]
  tableAssignments   TableSeatAssignment[]
}
```

#### Ticket — new fields

```prisma
model Ticket {
  // ... existing fields ...

  isComplimentary  Boolean @default(false)
  /// FK to session enrolments — nullable; set for session tickets
  sessionEnrolments SessionEnrolment[]
}
```

#### Reservation — new fields

```prisma
model Reservation {
  // ... existing fields ...

  /// GA quantity holds: ticketTypeId → quantity (stored as JSON)
  /// Used to track which ticket types are being held for GA/RSVP/time-slot checkouts
  gaHolds Json? // { ticketTypeId: quantity }[]

  /// FK to waitlist entry that triggered this reservation (nullable)
  waitlistEntryId String? @unique
  waitlistEntry   WaitlistEntry? @relation(fields: [waitlistEntryId], references: [id])
}
```

### 2.3 New Models

#### WaitlistEntry

```prisma
model WaitlistEntry {
  id             String          @id @default(cuid())
  eventId        String
  userId         String
  ticketTypeId   String
  requestedQty   Int             @default(1)
  position       Int             // insertion-order queue position
  status         WaitlistStatus  @default(PENDING)
  /// Set when status transitions to OFFERED
  offerExpiresAt DateTime?
  /// FK to the Reservation created when the offer is made
  reservationId  String?         @unique

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  event        Event        @relation(fields: [eventId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  ticketType   TicketType   @relation(fields: [ticketTypeId], references: [id])
  reservation  Reservation? // back-relation via Reservation.waitlistEntryId

  @@unique([userId, ticketTypeId]) // prevent duplicate waitlist entries
  @@index([ticketTypeId, status, position])
  @@index([eventId])
  @@map("waitlist_entries")
}
```

#### TimeSlot

```prisma
model TimeSlot {
  id          String           @id @default(cuid())
  eventId     String
  label       String
  startsAt    DateTime
  endsAt      DateTime
  capacity    Int
  price       Int              // minor currency units; 0 for free slots
  currency    String           @default("NGN")
  status      TicketTypeStatus @default(ACTIVE)

  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  event       Event            @relation(fields: [eventId], references: [id], onDelete: Cascade)
  tickets     TimeSlotTicket[]

  @@index([eventId, status])
  @@map("time_slots")
}
```

#### TimeSlotTicket (join between Ticket and TimeSlot)

```prisma
model TimeSlotTicket {
  id         String   @id @default(cuid())
  ticketId   String
  timeSlotId String
  createdAt  DateTime @default(now())

  ticket     Ticket   @relation(fields: [ticketId], references: [id])
  timeSlot   TimeSlot @relation(fields: [timeSlotId], references: [id])

  @@unique([ticketId, timeSlotId])
  @@map("time_slot_tickets")
}
```

#### EventSession

```prisma
model EventSession {
  id            String               @id @default(cuid())
  eventId       String
  title         String
  description   String?              @db.Text
  facilitator   String?              // speaker / facilitator name
  startsAt      DateTime
  endsAt        DateTime
  capacity      Int?                 // null = unlimited
  price         Int                  @default(0) // minor units; 0 for free/included
  currency      String               @default("NGN")
  inclusionMode SessionInclusionMode @default(INCLUDED)
  status        TicketTypeStatus     @default(ACTIVE)

  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  event         Event                @relation(fields: [eventId], references: [id], onDelete: Cascade)
  enrolments    SessionEnrolment[]

  @@index([eventId])
  @@map("event_sessions")
}
```

#### SessionEnrolment

```prisma
model SessionEnrolment {
  id        String   @id @default(cuid())
  ticketId  String
  sessionId String
  createdAt DateTime @default(now())

  ticket    Ticket       @relation(fields: [ticketId], references: [id])
  session   EventSession @relation(fields: [sessionId], references: [id])

  @@unique([ticketId, sessionId])
  @@index([sessionId])
  @@map("session_enrolments")
}
```

#### TableSeatAssignment

```prisma
/// Per-seat name assignments for table reservations where requiresAssignedSeating = true
model TableSeatAssignment {
  id           String   @id @default(cuid())
  ticketId     String
  ticketTypeId String   // the table ticket type
  seatNumber   Int      // 1..tableCapacity
  attendeeName String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  ticket     Ticket     @relation(fields: [ticketId], references: [id])
  ticketType TicketType @relation(fields: [ticketTypeId], references: [id])

  @@unique([ticketId, seatNumber])
  @@map("table_seat_assignments")
}
```

#### AuditLog

```prisma
model AuditLog {
  id         String          @id @default(cuid())
  entityType AuditEntityType
  entityId   String
  action     AuditAction
  oldStatus  String?
  newStatus  String?
  /// userId or "system" for background jobs
  actor      String
  metadata   Json?           // extra context (e.g., reason, adminNote)
  createdAt  DateTime        @default(now())

  @@index([entityType, entityId])
  @@index([actor])
  @@index([createdAt])
  @@map("audit_logs")
}
```

#### Event — new relations

```prisma
model Event {
  // ... existing fields ...
  timeSlots      TimeSlot[]
  sessions       EventSession[]
  waitlistEntries WaitlistEntry[]
}
```

### 2.4 Migration

One migration file: `prisma/migrations/20260902000001_reservation_system/migration.sql`

- All `ALTER TABLE` statements are additive
- New enum types use `DO $$ BEGIN … EXCEPTION WHEN duplicate_object` guard
- New tables use `CREATE TABLE IF NOT EXISTS`
- Indexes are `CREATE INDEX IF NOT EXISTS`

---

## 3. Redis Key Patterns

Extending `lib/redis.ts` with new helpers:

```typescript
// GA inventory hold during checkout (complements the DB Reservation)
// Key: ga-hold:{eventId}:{ticketTypeId}:{userId}
// Value: quantity held
// TTL: SEAT_LOCK_TTL (600s)
export function gaHoldKey(eventId: string, ticketTypeId: string, userId: string): string {
  return `ga-hold:${eventId}:${ticketTypeId}:${userId}`
}

// Time-slot hold during checkout
// Key: slot-hold:{timeSlotId}:{userId}
// Value: quantity held
// TTL: SEAT_LOCK_TTL
export function slotHoldKey(timeSlotId: string, userId: string): string {
  return `slot-hold:${timeSlotId}:${userId}`
}

// Waitlist offer hold — blocks inventory while offer window is open
// Key: waitlist-hold:{waitlistEntryId}
// Value: quantity
// TTL: waitlistWindowSeconds (configurable, default 1800)
export function waitlistHoldKey(waitlistEntryId: string): string {
  return `waitlist-hold:${waitlistEntryId}`
}

// Password-unlock session token for PASSWORD_PROTECTED ticket types
// Key: ticket-unlock:{ticketTypeId}:{sessionToken}
// Value: "1"
// TTL: 3600 (1 hour session)
export function ticketUnlockKey(ticketTypeId: string, sessionToken: string): string {
  return `ticket-unlock:${ticketTypeId}:${sessionToken}`
}
```

---

## 4. BullMQ Job Types

Extending `lib/queues.ts`:

### New queue: `reservation-expiry`

Replaces/extends the existing reservation expiry scheduling.

```typescript
// Job data
interface ReservationExpiryJob {
  reservationId: string
}

// Job ID (idempotent): reservation-expiry-{reservationId}
export async function scheduleReservationExpiry(
  reservationId: string,
  expiresAt: Date
): Promise<void>
```

### New queue: `waitlist-expiry`

```typescript
interface WaitlistExpiryJob {
  waitlistEntryId: string
}

// Job ID: waitlist-expiry-{waitlistEntryId}
export async function scheduleWaitlistExpiry(
  waitlistEntryId: string,
  offerExpiresAt: Date
): Promise<void>
```

### New queue: `event-reminder`

```typescript
interface EventReminderJob {
  eventId: string
  userId: string
  ticketId: string
}

// Job ID: event-reminder-{eventId}-{userId}
// Scheduled 24 hours before event startsAt
export async function scheduleEventReminder(
  eventId: string,
  userId: string,
  ticketId: string,
  eventStartsAt: Date
): Promise<void>
```

### Worker files

- `workers/reservation-expiry.worker.ts` — handles `reservation-expiry` queue
- `workers/waitlist-expiry.worker.ts` — handles `waitlist-expiry` queue
- `workers/event-reminder.worker.ts` — handles `event-reminder` queue
- `workers/index.ts` — starts all workers

---

## 5. Server Action API Design

### 5.1 Free RSVP — `features/checkout/actions.ts` (extended)

```typescript
// New action: submitRsvp
export async function submitRsvp(input: {
  eventId: string
  ticketTypeId: string
  quantity: number
}): Promise<{ success: true; ticketIds: string[] } | { success: false; error: string }>
```

**Logic:**
1. Authenticate session
2. Validate TicketType: `price === 0`, status `ACTIVE`, within salesStart/salesEnd window
3. Validate purchase limits (`minPerOrder`, `maxPerOrder`, `maxPerUser`)
4. Check visibility + access token
5. DB transaction:
   - Lock: `SELECT ... FOR UPDATE` on TicketType to prevent race condition on `quantity`
   - Verify `quantity - sold >= requestedQty`
   - Create `Ticket` records (status `ACTIVE`) + increment `TicketType.sold`
   - Write `AuditLog` entry (action: `ISSUED`)
6. Send confirmation email (non-blocking)
7. Schedule event reminder job

### 5.2 Waitlist — `features/waitlist/actions.ts`

```typescript
export async function joinWaitlist(input: {
  eventId: string
  ticketTypeId: string
  quantity: number
}): Promise<
  { success: true; waitlistEntryId: string; position: number } | { success: false; error: string }
>

export async function leaveWaitlist(input: {
  waitlistEntryId: string
}): Promise<{ success: true } | { success: false; error: string }>

// Called internally by reservation-expiry worker when a ticket is cancelled
export async function advanceWaitlist(input: {
  ticketTypeId: string
  releasedQty: number
}): Promise<void>
```

**`joinWaitlist` logic:**
1. Authenticate
2. Verify TicketType is sold out (`quantity - sold <= 0`)
3. Check no existing `PENDING` or `OFFERED` entry for same `(userId, ticketTypeId)`
4. DB transaction: get `MAX(position)` for that ticketTypeId and insert at `position + 1`

**`advanceWaitlist` logic (system/internal):**
1. Find next `PENDING` WaitlistEntry for `ticketTypeId` ordered by position
2. DB transaction:
   - Create `Reservation` with `waitlistEntryId` and `expiresAt = now + waitlistWindowMs`
   - Update `WaitlistEntry.status = OFFERED`, set `offerExpiresAt`
   - Store inventory hold in Redis with TTL = waitlistWindowSeconds
3. Schedule `waitlist-expiry` BullMQ job
4. Send offer email (non-blocking)
5. Write `AuditLog`

### 5.3 Time-Slot Reservation — `features/time-slots/actions.ts`

```typescript
export async function reserveTimeSlot(input: {
  eventId: string
  timeSlotId: string
  quantity: number
}): Promise<{ success: true; reservationId: string; expiresAt: Date } | { success: false; error: string }>
```

**Logic:**
1. Authenticate
2. Validate TimeSlot belongs to event and is `ACTIVE`
3. Check `capacity - bookedCount >= quantity` (bookedCount = confirmed tickets + active holds)
4. Acquire Redis hold via `SET NX EX` on `slotHoldKey`
5. DB transaction: create `Reservation` with `gaHolds` JSON recording the time slot hold
6. Schedule reservation expiry job

### 5.4 Session Enrolment — `features/sessions/actions.ts`

```typescript
export async function enrolInSession(input: {
  ticketId: string
  sessionIds: string[]
}): Promise<{ success: true } | { success: false; error: string }>
```

**Logic:**
1. Authenticate; verify ticket belongs to user
2. Load sessions; validate `inclusionMode` allows selection
3. For `OPTIONAL_PAID` sessions: redirect to checkout to add session price to order
4. DB transaction:
   - For each sessionId: check capacity, create `SessionEnrolment`, update session enrolment count
5. For `INCLUDED` sessions: auto-enrolment happens inside `confirmOrder` / `submitRsvp`

### 5.5 Ticket Visibility Unlock — `features/checkout/actions.ts` (extended)

```typescript
export async function unlockPasswordProtectedTicket(input: {
  ticketTypeId: string
  password: string
}): Promise<{ success: true; sessionToken: string } | { success: false; error: string }>

export async function validateDirectLinkToken(input: {
  ticketTypeId: string
  token: string
}): Promise<{ success: true } | { success: false; error: string }>
```

**`unlockPasswordProtectedTicket` logic:**
1. Load TicketType, verify `visibility = PASSWORD_PROTECTED`
2. bcrypt-compare submitted password against `accessPasswordHash`
3. On match: generate random session token, store `ticketUnlockKey(ticketTypeId, token)` in Redis (TTL 3600)
4. Return session token to client (stored in sessionStorage)
5. All subsequent reservation attempts include the token; backend validates via Redis before allowing hold

### 5.6 Organizer — Ticket Type Configuration (extended `features/organizer/actions.ts`)

```typescript
// Extended: now accepts new fields
export async function upsertTicketType(input: {
  eventId: string
  ticketTypeId?: string
  name: string
  description?: string
  price: number
  quantity?: number
  salesStart?: Date
  salesEnd?: Date
  minPerOrder?: number
  maxPerOrder?: number
  maxPerUser?: number
  visibility: TicketVisibility
  accessPassword?: string    // plaintext; hashed server-side if visibility = PASSWORD_PROTECTED
  isTableType?: boolean
  tableCapacity?: number
  requiresAssignedSeating?: boolean
}): Promise<{ success: true; ticketTypeId: string } | { success: false; error: string }>

export async function upsertTimeSlot(input: {
  eventId: string
  timeSlotId?: string
  label: string
  startsAt: Date
  endsAt: Date
  capacity: number
  price: number
}): Promise<{ success: true; timeSlotId: string } | { success: false; error: string }>

export async function upsertEventSession(input: {
  eventId: string
  sessionId?: string
  title: string
  description?: string
  facilitator?: string
  startsAt: Date
  endsAt: Date
  capacity?: number
  price?: number
  inclusionMode: SessionInclusionMode
}): Promise<{ success: true; sessionId: string } | { success: false; error: string }>
```

### 5.7 Organizer — Reservation Management (new in `features/organizer/actions.ts`)

```typescript
export async function cancelTicket(input: {
  ticketId: string
  eventId: string
  reason?: string
}): Promise<{ success: true } | { success: false; error: string }>

export async function issueComplimentaryTicket(input: {
  eventId: string
  ticketTypeId: string
  recipientEmail: string
  recipientName: string
}): Promise<{ success: true; ticketId: string } | { success: false; error: string }>

export async function resendConfirmationEmail(input: {
  ticketId: string
}): Promise<{ success: true } | { success: false; error: string }>
```

**`cancelTicket` logic:**
1. Authenticate as organizer; verify event ownership
2. If ticket status is `USED`, require explicit `force: true` flag
3. DB transaction:
   - Set `Ticket.status = CANCELLED`
   - If reserved seat: set `EventSeat.status = AVAILABLE`
   - If GA: decrement `TicketType.sold`
   - Write `AuditLog` (actor = organizerId)
4. Trigger `advanceWaitlist` if applicable
5. Send cancellation email to attendee (non-blocking)

**`issueComplimentaryTicket` logic:**
1. Authenticate as organizer
2. Look up or create `User` by email
3. DB transaction: create `Ticket` with `isComplimentary = true`; do NOT increment `sold`
4. Write `AuditLog`
5. Send confirmation email

---

## 6. Query Functions

### `features/waitlist/queries.ts`

```typescript
// Attendee queries
export async function getWaitlistEntry(userId: string, ticketTypeId: string)
export async function getMyWaitlistEntries(userId: string)

// Organizer queries
export async function getEventWaitlist(eventId: string, ticketTypeId?: string, opts?: PaginationOpts)
```

### `features/time-slots/queries.ts`

```typescript
export async function getEventTimeSlots(eventId: string) // includes confirmed + held counts
export async function getTimeSlotAvailability(timeSlotId: string): Promise<{ capacity: number; booked: number; held: number; available: number }>
```

### `features/sessions/queries.ts`

```typescript
export async function getEventSessions(eventId: string) // includes enrolment counts
export async function getTicketEnrolments(ticketId: string)
```

### `features/organizer/queries.ts` (extended)

```typescript
// Inventory dashboard
export async function getEventInventory(eventId: string, organizerId: string): Promise<EventInventory>

// Reservation management
export async function getEventReservations(
  eventId: string,
  organizerId: string,
  filters: { search?: string; ticketTypeId?: string; status?: TicketStatus; dateFrom?: Date; dateTo?: Date },
  pagination: { page: number; pageSize: number }
): Promise<PaginatedReservations>

// Audit logs
export async function getAuditLogs(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLog[]>
```

**`EventInventory` shape:**

```typescript
interface EventInventory {
  eventId: string
  ticketTypes: TicketTypeInventory[]
  timeSlots: TimeSlotInventory[]    // empty array for non-slot events
  sessions: SessionInventory[]      // empty array for non-session events
  seatSections: SeatSectionInventory[] // only for RESERVED/MIXED events
}

interface TicketTypeInventory {
  ticketTypeId: string
  name: string
  total: number | null  // null = unlimited
  sold: number
  held: number          // active Reservations with expiresAt > now
  available: number     // total - sold - held (or null if unlimited)
  cancelled: number
  waitlistCount: number // PENDING + OFFERED entries
}
```

---

## 7. Route & Page Structure

### New pages

| Route | File | Description |
|---|---|---|
| `/events/[slug]/checkout/success` | `app/(marketing)/events/[slug]/checkout/success/page.tsx` | Confirmation page (Req 12) |
| `/dashboard/events/[id]/inventory` | `app/(dashboard)/dashboard/events/[id]/inventory/page.tsx` | Organizer inventory dashboard (Req 9) |
| `/dashboard/events/[id]/reservations` | `app/(dashboard)/dashboard/events/[id]/reservations/page.tsx` | Organizer reservation management (Req 10) |
| `/dashboard/waitlist` | `app/(dashboard)/dashboard/waitlist/page.tsx` | Attendee waitlist status |

### Confirmation page (`/events/[slug]/checkout/success`)

Server Component. Reads `?orderId=` or `?reservationId=` query param, verifies server-side that the session user owns the confirmed order, then renders:

- Event name, date, venue
- Total paid (or "Free" for RSVP)
- Each ticket: ticketNumber, QR code image, seat/table/slot info
- "View My Tickets" → `/dashboard/tickets`
- "Add to Calendar" → `/api/events/[slug]/ical` (downloads ICS file)
- Session enrolment summary (if event has sessions)

Redirects to `/events/[slug]` if no valid confirmed order found.

### ICS download API

| Route | File | Description |
|---|---|---|
| `/api/events/[slug]/ical` | `app/api/events/[slug]/ical/route.ts` | Generates and streams an ICS file |

---

## Components and Interfaces

### `features/checkout/components/`

- `rsvp-button.tsx` — Single-click RSVP for free ticket types
- `waitlist-button.tsx` — "Join Waitlist" CTA shown when TicketType is sold out
- `waitlist-status-badge.tsx` — Shows current waitlist position/offer status
- `password-unlock-modal.tsx` — Modal dialog for unlocking PASSWORD_PROTECTED ticket types
- `time-slot-selector.tsx` — Grid of available time slots for selection
- `session-selector.tsx` — Checklist of optional sessions with capacity indicators

### `features/organizer/components/`

- `ticket-type-form.tsx` — Extended form: limits, visibility, table config
- `table-config-tab.tsx` — Table name/capacity/price/qty fields
- `time-slot-config-tab.tsx` — Add/edit/remove time slot records
- `session-config-tab.tsx` — Add/edit/remove session records
- `inventory-dashboard.tsx` — Per-type counters: total/sold/held/available
- `reservation-table.tsx` — Searchable/filterable table with cancel/comp/resend actions
- `waitlist-panel.tsx` — Waitlist view per ticket type with export

### `app/(marketing)/events/[slug]/checkout/success/`

- `success-page-client.tsx` — Client island for "Add to Calendar" button (uses `fetch` to download ICS)

---

## 9. Email Templates

All templates are React Email components in `emails/`:

| Template file | Trigger | Description |
|---|---|---|
| `ticket-confirmation.tsx` | Ticket issued (paid or RSVP) | QR codes, event details, tickets list |
| `reservation-expired.tsx` | Reservation hold times out | Seats released, link back to event |
| `ticket-cancelled.tsx` | Organizer or system cancels ticket | Cancellation notice, refund info if applicable |
| `waitlist-joined.tsx` | Attendee joins waitlist | Position number, event details |
| `waitlist-offered.tsx` | WaitlistEntry → OFFERED | Checkout link, expiry countdown, ticket count |
| `waitlist-offer-expired.tsx` | Waitlist offer window passes | Apology, option to rejoin |
| `waitlist-closed.tsx` | Event ends with no offer made | Closure notice |
| `refund-confirmed.tsx` | Refund approved | Amount, processing timeline |
| `event-reminder.tsx` | 24h before event | Event details, QR code(s), venue map link |

All templates use the existing Resend integration via `lib/email.ts`. Email delivery failures are logged but never block the underlying operation (non-blocking `.catch()`).

---

## 10. Purchase Limit Enforcement

Limits are enforced in **all** reservation paths (RSVP, GA checkout, time-slot, session):

```typescript
async function enforcePurchaseLimits(
  tx: PrismaTransactionClient,
  userId: string,
  ticketTypeId: string,
  requestedQty: number
): Promise<void> {
  const tt = await tx.ticketType.findUniqueOrThrow({ where: { id: ticketTypeId } })

  // minPerOrder
  if (tt.minPerOrder !== null && requestedQty < tt.minPerOrder) {
    throw new Error(`LIMIT_MIN:${tt.minPerOrder}`)
  }

  // maxPerOrder
  if (tt.maxPerOrder !== null && requestedQty > tt.maxPerOrder) {
    throw new Error(`LIMIT_MAX:${tt.maxPerOrder}`)
  }

  // maxPerUser — count existing confirmed tickets
  if (tt.maxPerUser !== null) {
    const existing = await tx.ticket.count({
      where: {
        userId,
        ticketTypeId,
        status: { in: ['ACTIVE', 'USED'] },
      },
    })
    if (existing + requestedQty > tt.maxPerUser) {
      throw new Error(`LIMIT_USER:${tt.maxPerUser}`)
    }
  }
}
```

This helper is called inside the DB transaction before issuing tickets, so it is always server-side enforced.

---

## 11. Visibility Control Flow

```
Event page loads (Server Component)
  ↓
getPublicTicketTypes(eventId, { sessionUnlockTokens })
  ↓
Filter: visibility = PUBLIC → include
        visibility = HIDDEN  → exclude (unless directLinkToken present in query)
        visibility = PASSWORD_PROTECTED → include, but mark as "locked"
  ↓
Client renders locked ticket types with password prompt
  ↓
User submits password → unlockPasswordProtectedTicket() Server Action
  ↓
Returns sessionToken → client stores in sessionStorage
  ↓
Subsequent checkout calls include sessionToken
  ↓
Backend validates: redis.get(ticketUnlockKey(ticketTypeId, token)) === "1"
  ↓
Reservation proceeds
```

The `directLinkToken` flow:
- Organizer shares URL: `/events/slug?unlock=<directLinkToken>`
- Server Component detects `?unlock=` param, calls `validateDirectLinkToken`
- On valid token: renders hidden ticket type without password prompt for this page load

---

## 12. Inventory Dashboard Data Flow

```
GET /dashboard/events/[id]/inventory (Server Component)
  ↓
getEventInventory(eventId, organizerId)
  ↓
Parallel queries:
  - TicketType records with sold count
  - Active Reservation count per ticketType (expiresAt > now) → held
  - WaitlistEntry counts (PENDING + OFFERED) per ticketType
  - TimeSlot records with ticket counts
  - EventSession enrolment counts
  - EventSeat status aggregates (for RESERVED events)
  ↓
Compute: available = total - sold - held
  ↓
Render InventoryDashboard (server render, refreshed on page load)
```

No real-time WebSocket required. Page reloads on navigation automatically refresh counts.

---

## 13. Audit Logging Helper

```typescript
// lib/audit.ts
import { db } from './db'
import type { AuditEntityType, AuditAction } from '@/app/generated/prisma/client'

export async function writeAuditLog(
  tx: PrismaTransactionClient,
  params: {
    entityType: AuditEntityType
    entityId: string
    action: AuditAction
    oldStatus?: string
    newStatus?: string
    actor: string  // userId or "system"
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await tx.auditLog.create({ data: params })
}
```

This is called inside the same DB transaction as the state change, ensuring the audit entry is never orphaned.

---

## 14. Background Worker Logic

### `workers/reservation-expiry.worker.ts`

```
On job fire (reservationId):
  1. Load Reservation — if status !== ACTIVE, skip (idempotent)
  2. DB transaction:
     a. Set Reservation.status = EXPIRED
     b. For reserved seats: EventSeat.status = AVAILABLE, reservationId = null
     c. For GA holds: no DB change needed (TicketType.sold never incremented for held GA)
     d. If waitlistEntryId set: mark WaitlistEntry.status = EXPIRED
     e. WriteAuditLog (actor = "system")
  3. Release Redis keys (seat locks, ga-hold keys, waitlist-hold key)
  4. If GA reservation: call advanceWaitlist() to offer next in queue
  5. Send reservation-expired email (non-blocking)
```

### `workers/waitlist-expiry.worker.ts`

```
On job fire (waitlistEntryId):
  1. Load WaitlistEntry — if status !== OFFERED, skip (idempotent)
  2. DB transaction:
     a. Set WaitlistEntry.status = EXPIRED
     b. If reservationId set: set Reservation.status = EXPIRED
     c. WriteAuditLog (actor = "system")
  3. Release Redis waitlist-hold key
  4. Call advanceWaitlist() for next PENDING entry
  5. Send waitlist-offer-expired email (non-blocking)
```

---

## Correctness Properties

The following properties must hold at all times and are verifiable by tests:

### Property 1: No Overbooking

For any TicketType with a finite `quantity`, at all times: `sold + active_holds ≤ quantity`. Enforced by DB transaction with `SELECT ... FOR UPDATE` on TicketType before issuing tickets or creating holds.

**Validates: Requirements 1.2, 1.3, 2.3, 4.2, 5.3**

### Property 2: Purchase Limit Integrity

No user holds more than `maxPerUser` confirmed + active tickets for any TicketType where `maxPerUser` is set. Enforced by `enforcePurchaseLimits` inside the DB transaction before ticket issuance.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 3: Waitlist Ordering

WaitlistEntries are offered in ascending `position` order. No entry at position N is OFFERED while an entry at position M < N is PENDING. Enforced by `advanceWaitlist` always selecting `findFirst` ordered by `position ASC` with `status = PENDING`.

**Validates: Requirements 3.4, 3.7**

### Property 4: Audit Completeness

Every Ticket, WaitlistEntry, and EventSeat status transition has a corresponding AuditLog entry written within the same database transaction as the state change. Enforced by calling `writeAuditLog(tx, ...)` inside every transaction that changes entity status.

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 5: Visibility Enforcement

No Reservation or Ticket is created for a `HIDDEN` or `PASSWORD_PROTECTED` TicketType without a valid Redis unlock token present at the time of the Server Action call. Enforced server-side in all reservation paths before any DB transaction begins.

**Validates: Requirements 7.2, 7.3, 7.6**

### Property 6: Idempotent Expiry

Running a reservation-expiry or waitlist-expiry BullMQ job twice for the same entity ID produces the same final state; the second execution is a no-op. Enforced by checking entity status at the start of each worker handler and returning early if status is not `ACTIVE` / `OFFERED`.

**Validates: Requirements 13.4, 13.5**

### Property 7: RSVP Atomicity

An RSVP either creates all tickets and increments `TicketType.sold` in one transaction, or does neither. Partial ticket creation must not occur. Enforced by wrapping all RSVP writes in a single `db.$transaction(...)` call.

**Validates: Requirements 1.2, 1.4**

### Property 8: Complimentary Ticket Isolation

`isComplimentary = true` tickets do not affect `TicketType.sold` and are excluded from revenue calculations in all aggregate queries. Enforced by the `issueComplimentaryTicket` action never incrementing `sold`, and all revenue queries filtering `WHERE is_complimentary = false`.

**Validates: Requirements 10.5**

---

## Error Handling

All Server Actions return a discriminated union `{ success: true; ... } | { success: false; error: string }`. Error strings follow a `CATEGORY:DETAIL` pattern where appropriate (e.g., `LIMIT_MAX:10`, `SEATS_UNAVAILABLE`) so the client can display contextual messages without parsing free text.

### Inventory conflict errors

- **Overbooking attempt** — return `{ success: false, error: 'Not enough inventory' }` with the remaining count if > 0
- **Seat held by another user** — return `{ success: false, error: 'Seat no longer available', conflictingSeatIds }` and roll back all acquired Redis locks
- **Purchase limit violated** — return `{ success: false, error: 'LIMIT_MIN:N' | 'LIMIT_MAX:N' | 'LIMIT_USER:N' }` with the limit value embedded

### Visibility / access errors

- **Missing unlock token** for PASSWORD_PROTECTED or HIDDEN ticket type — return `{ success: false, error: 'ACCESS_DENIED' }` from the Server Action
- **Expired or invalid token** — same as above; client re-prompts for password

### Payment and webhook errors

- **Duplicate Paystack reference** — `paystackReference` is `@unique`; duplicate webhook delivery results in a Prisma `P2002` unique constraint error, which is caught, logged, and returns 200 to Paystack (idempotent)
- **Reservation expired before webhook fires** — check `Reservation.status`; if not `ACTIVE`, log and skip ticket issuance, trigger refund via Paystack API

### Email delivery errors

Email sends are always non-blocking (`.catch(console.error)`). Failed delivery is logged to the server console. The underlying reservation or ticket operation is never rolled back due to email failure.

### Background job errors

BullMQ workers retry up to 3 times with exponential backoff (5 s base). If all retries fail, the job moves to the `failed` queue and an error is logged. Idempotent job IDs (`reservation-expiry-{id}`, `waitlist-expiry-{id}`) prevent double-processing on replay.

---

## Testing Strategy

### Unit tests

- `enforcePurchaseLimits` — matrix of min/max/user limit combinations
- `advanceWaitlist` — correct position ordering, status transitions
- Visibility unlock token generation and expiry
- Audit log writes (mock transaction)

### Integration tests (against test DB)

- RSVP flow: submit → ticket created → sold incremented → email queued
- Waitlist flow: join → advance → offer → fulfil → fulfilled; join → advance → offer → expire → next advanced
- Time-slot flow: hold → confirm → ticket with timeSlotId; hold expiry → slot available again
- Purchase limit enforcement: attempt over maxPerOrder, over maxPerUser

### Property-based tests

Using [fast-check](https://github.com/dubzzz/fast-check):

- **No overbooking property**: For any sequence of concurrent RSVP/checkout operations against a TicketType with quantity N, the total confirmed tickets count never exceeds N.
- **Waitlist ordering property**: For any sequence of join/leave/advance operations, the invariant `OFFERED entries have lower position than all PENDING entries` is maintained.

---

## 17. Migration & Rollout Notes

1. Apply `20260902000001_reservation_system` migration in a maintenance window (additive only — no breaking changes to existing tables).
2. Deploy workers (`workers/reservation-expiry.worker.ts`, `workers/waitlist-expiry.worker.ts`, `workers/event-reminder.worker.ts`) alongside the app.
3. The existing `features/checkout/actions.ts` `confirmOrder` path is unchanged — new fields (`minPerOrder`, `maxPerUser`, `visibility`) are nullable and default-safe.
4. Feature flags are not required since new reservation models are only activated when an organizer explicitly configures them on an event.
