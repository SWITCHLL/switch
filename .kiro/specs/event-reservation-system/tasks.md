# Implementation Plan: Event Reservation System

## Overview

This plan covers all remaining reservation models and management capabilities for the SWITCH platform. It builds on the existing reserved-seating checkout, GA checkout, group booking, Paystack payments, QR tickets, Redis locking, and BullMQ infrastructure. Tasks are ordered so each layer is in place before the features that depend on it.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3, 15] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5, 7, 8, 10] },
    { "wave": 6, "tasks": [6, 9] },
    { "wave": 7, "tasks": [11, 14] },
    { "wave": 8, "tasks": [12] },
    { "wave": 9, "tasks": [13] },
    { "wave": 10, "tasks": [16] }
  ]
}
```

## Tasks

- [x] 1. Database Migration — New Models and Fields
  - Add new enums to `prisma/schema.prisma`: `WaitlistStatus` (PENDING, OFFERED, FULFILLED, EXPIRED, CANCELLED), `SessionInclusionMode` (INCLUDED, OPTIONAL_FREE, OPTIONAL_PAID, CAPACITY_LIMITED), `TicketVisibility` (PUBLIC, HIDDEN, PASSWORD_PROTECTED), `AuditEntityType` (RESERVATION, TICKET, WAITLIST_ENTRY, EVENT_SEAT), `AuditAction` (CREATED, STATUS_CHANGED, CANCELLED, REFUNDED, ISSUED, EXPIRED, OFFERED, FULFILLED)
  - Extend `TicketType` model: add `minPerOrder Int?`, `maxPerOrder Int?`, `maxPerUser Int?`, `visibility TicketVisibility @default(PUBLIC)`, `accessPasswordHash String?`, `directLinkToken String? @unique`, `isTableType Boolean @default(false)`, `tableCapacity Int?`, `requiresAssignedSeating Boolean @default(false)`; add relations `waitlistEntries WaitlistEntry[]` and `tableAssignments TableSeatAssignment[]`
  - Extend `Ticket` model: add `isComplimentary Boolean @default(false)` and relation `sessionEnrolments SessionEnrolment[]`
  - Extend `Reservation` model: add `gaHolds Json?`, `waitlistEntryId String? @unique`, relation `waitlistEntry WaitlistEntry?`
  - Add `WaitlistEntry` model: id, eventId, userId, ticketTypeId, requestedQty, position, status, offerExpiresAt, reservationId; `@@unique([userId, ticketTypeId])`, indexes on `[ticketTypeId, status, position]` and `[eventId]`; map `"waitlist_entries"`
  - Add `TimeSlot` model: id, eventId, label, startsAt, endsAt, capacity, price, currency, status; index `[eventId, status]`; map `"time_slots"`
  - Add `TimeSlotTicket` join model: id, ticketId, timeSlotId; `@@unique([ticketId, timeSlotId])`; map `"time_slot_tickets"`
  - Add `EventSession` model: id, eventId, title, description, facilitator, startsAt, endsAt, capacity, price, currency, inclusionMode, status; index `[eventId]`; map `"event_sessions"`
  - Add `SessionEnrolment` model: id, ticketId, sessionId; `@@unique([ticketId, sessionId])`, index `[sessionId]`; map `"session_enrolments"`
  - Add `TableSeatAssignment` model: id, ticketId, ticketTypeId, seatNumber, attendeeName; `@@unique([ticketId, seatNumber])`; map `"table_seat_assignments"`
  - Add `AuditLog` model: id, entityType, entityId, action, oldStatus, newStatus, actor, metadata Json?, createdAt; indexes on `[entityType, entityId]`, `[actor]`, `[createdAt]`; map `"audit_logs"`
  - Add `Event` model relations: `timeSlots TimeSlot[]`, `sessions EventSession[]`, `waitlistEntries WaitlistEntry[]`
  - Add `User` model relation: `waitlistEntries WaitlistEntry[]`
  - Run `prisma migrate dev --name reservation_system` to generate migration and regenerate client
  - Verify `prisma validate` exits 0 and all new types appear in `app/generated/prisma`

- [x] 2. Redis Key Helpers Extension
  - Add to `lib/redis.ts`: `gaHoldKey(eventId, ticketTypeId, userId)` → `ga-hold:${eventId}:${ticketTypeId}:${userId}`
  - Add `slotHoldKey(timeSlotId, userId)` → `slot-hold:${timeSlotId}:${userId}`
  - Add `waitlistHoldKey(waitlistEntryId)` → `waitlist-hold:${waitlistEntryId}`
  - Add `ticketUnlockKey(ticketTypeId, sessionToken)` → `ticket-unlock:${ticketTypeId}:${sessionToken}`
  - Add `acquireGaHold(eventId, ticketTypeId, userId, qty, ttl)` using `SET NX EX`; return boolean
  - Add `releaseGaHold(eventId, ticketTypeId, userId)` using the existing Lua check-and-delete pattern
  - Add `acquireSlotHold(timeSlotId, userId, qty, ttl)` using `SET NX EX`
  - Add `releaseSlotHold(timeSlotId, userId)` with Lua check-and-delete

- [x] 3. Audit Logging Helper
  - Create `lib/audit.ts` with `'server-only'` guard
  - Implement `writeAuditLog(tx, params)` accepting `entityType`, `entityId`, `action`, `oldStatus?`, `newStatus?`, `actor`, `metadata?`
  - Use `tx.auditLog.create({ data: params })` so the write runs inside the caller's Prisma transaction
  - Export `WriteAuditLogParams` TypeScript interface
  - TypeScript types must reference the Prisma-generated `AuditEntityType` and `AuditAction` enums from `@/app/generated/prisma/client`

- [x] 4. Purchase Limits Enforcement Helper
  - Create `lib/purchase-limits.ts` with `'server-only'` guard
  - Implement `enforcePurchaseLimits(tx, userId, ticketTypeId, requestedQty)`: query TicketType inside the transaction; throw `Error('LIMIT_MIN:{value}')` if `requestedQty < minPerOrder`; throw `Error('LIMIT_MAX:{value}')` if `requestedQty > maxPerOrder`; count existing ACTIVE+USED tickets for userId+ticketTypeId and throw `Error('LIMIT_USER:{value}')` if `existing + requestedQty > maxPerUser`; null limits are no-ops
  - Export `parseLimitError(err: unknown)` returning `{ type: 'MIN'|'MAX'|'USER', limit: number } | null` for mapping to user-facing messages in Server Actions

- [x] 5. Free RSVP Server Action
  - Add `submitRsvp(input: { eventId, ticketTypeId, quantity })` to `features/checkout/actions.ts`
  - Authenticate session; return `{ success: false, error: 'UNAUTHENTICATED' }` if no session
  - Add Zod schema in `features/checkout/schemas.ts`; validate TicketType `price === 0` and `status === ACTIVE`
  - Validate salesStart / salesEnd window; return descriptive error if outside range
  - Call `enforcePurchaseLimits` (Task 4); map error codes to user-facing messages
  - Stub visibility check with `TODO` comment (completed in Task 6)
  - Open Prisma transaction: lock TicketType row with `findUniqueOrThrow` inside tx; verify `(quantity ?? Infinity) - sold >= requestedQty`; create Ticket records with `status: ACTIVE`, unique `ticketNumber` (format `SWT-{YEAR}-{RANDOM6HEX}`), unique `qrCode` (crypto random); increment `TicketType.sold`; call `writeAuditLog` with `action: ISSUED`
  - After transaction: send confirmation email non-blocking (`.catch(console.error)`); call `scheduleEventReminder` stub
  - Return `{ success: true, ticketIds: string[] }`
  - Create `features/checkout/components/rsvp-button.tsx` Client Component with loading state, success toast, and error display

- [x] 6. Ticket Visibility Control
  - Add `unlockPasswordProtectedTicket(input: { ticketTypeId, password })` to `features/checkout/actions.ts`: load TicketType; verify `visibility === PASSWORD_PROTECTED`; bcrypt-compare password against `accessPasswordHash`; on match generate `crypto.randomBytes(32).toString('hex')` token; store `ticketUnlockKey(ticketTypeId, token) = "1"` in Redis TTL 3600; return `{ success: true, sessionToken }`; on mismatch return `{ success: false, error: 'INVALID_PASSWORD' }`
  - Add `validateDirectLinkToken(input: { ticketTypeId, token })`: verify `visibility === HIDDEN` and `directLinkToken === token`; return success or error
  - Create or extend `getPublicTicketTypes` query in `features/checkout/queries.ts`: exclude HIDDEN types (unless `?unlock=<token>` present and valid); include PASSWORD_PROTECTED types with `locked: true` flag; include PUBLIC types normally
  - Replace the Task 5 visibility stub: for PASSWORD_PROTECTED check `redis.get(ticketUnlockKey(ticketTypeId, sessionToken)) === "1"`; for HIDDEN validate directLinkToken; reject with `{ success: false, error: 'ACCESS_DENIED' }` if either check fails; apply this guard in all reservation Server Actions
  - Create `features/checkout/components/password-unlock-modal.tsx` Client Component: modal with password input; calls `unlockPasswordProtectedTicket`; stores sessionToken in `sessionStorage` keyed by ticketTypeId; signals parent to reveal unlocked ticket type on success
  - Commit and push changes to github

- [x] 7. Waitlist Feature Module
  - Create `features/waitlist/schemas.ts` with Zod schemas for `joinWaitlist` and `leaveWaitlist`
  - Create `features/waitlist/types.ts` exporting `WaitlistEntryWithDetails` type
  - Create `features/waitlist/queries.ts`: `getWaitlistEntry(userId, ticketTypeId)`, `getMyWaitlistEntries(userId)` with event+ticketType details, `getEventWaitlist(eventId, ticketTypeId?, opts?)` paginated for organizer
  - Implement `joinWaitlist(input: { eventId, ticketTypeId, quantity })` in `features/waitlist/actions.ts`: authenticate; verify TicketType sold out; reject duplicate entries for same userId+ticketTypeId; DB transaction: `MAX(position)` for ticketTypeId, insert at position+1, write AuditLog CREATED; send `waitlist-joined` email non-blocking; return `{ success: true, waitlistEntryId, position }`
  - Implement `leaveWaitlist(input: { waitlistEntryId })`: authenticate; verify ownership; verify status is PENDING or OFFERED; DB transaction: set status CANCELLED, write AuditLog; if was OFFERED: `redis.del(waitlistHoldKey(id))`, call `advanceWaitlist`; return `{ success: true }`
  - Implement internal `advanceWaitlist(input: { ticketTypeId, releasedQty })`: find next PENDING entry by position; DB transaction: create Reservation with `waitlistEntryId` and `expiresAt = now + 30min`, update WaitlistEntry status OFFERED, set offerExpiresAt, write AuditLog OFFERED; store `waitlistHoldKey(entryId) = qty` in Redis with TTL 1800; schedule `waitlist-expiry` BullMQ job; send `waitlist-offered` email non-blocking
  - Create `features/waitlist/components/waitlist-button.tsx` — "Join Waitlist" CTA shown when `available === 0`; calls `joinWaitlist`; shows position number on success
  - Create `features/waitlist/components/waitlist-status-badge.tsx` — displays PENDING/OFFERED status, position, or offer expiry countdown
  - Create `app/(dashboard)/dashboard/waitlist/page.tsx` Server Component rendering `getMyWaitlistEntries` results with status badges and leave buttons
    - Commit and push changes to github

- [x] 8. Time-Slot Reservation Module
  - Create `features/time-slots/schemas.ts`, `features/time-slots/types.ts` (exporting `TimeSlotWithAvailability`)
  - Create `features/time-slots/queries.ts`: `getEventTimeSlots(eventId)` with ticket+held counts, `getTimeSlotAvailability(timeSlotId)` returning `{ capacity, booked, held, available }`
  - Implement `reserveTimeSlot(input: { eventId, timeSlotId, quantity })` in `features/time-slots/actions.ts`: authenticate; validate TimeSlot belongs to event and is ACTIVE; check overlap (query existing ACTIVE TimeSlotTickets for user+event; reject if any slot's time range overlaps the requested slot); compute booked count; check `capacity - booked >= quantity`; acquire Redis slot hold via `acquireSlotHold`; DB transaction: create Reservation with `gaHolds` JSON; call `writeAuditLog` CREATED; schedule reservation expiry job; return `{ success: true, reservationId, expiresAt }`
  - Create `features/time-slots/components/time-slot-selector.tsx` — grid of time slots showing label, time range, price, available count; sold-out slots visually disabled
    - Commit and push changes to github

- [x] 9. BullMQ Background Workers
  - Extend `lib/queues.ts`: add `scheduleReservationExpiry(reservationId, expiresAt)` with job ID `reservation-expiry-${reservationId}` and delay `expiresAt - now`; add `scheduleWaitlistExpiry(waitlistEntryId, offerExpiresAt)` with job ID `waitlist-expiry-${waitlistEntryId}`; add `scheduleEventReminder(eventId, userId, ticketId, eventStartsAt)` with job ID `event-reminder-${eventId}-${userId}` and delay 24h before event
  - Create `workers/reservation-expiry.worker.ts`: process `reservation-expiry` queue; load Reservation; skip if status not ACTIVE; DB transaction: set Reservation EXPIRED, set each held EventSeat to AVAILABLE, write AuditLog for each; release Redis locks; call `advanceWaitlist` for each ticketTypeId in `gaHolds`; send `reservation-expired` email non-blocking
  - Create `workers/waitlist-expiry.worker.ts`: process `waitlist-expiry` queue; skip if WaitlistEntry not OFFERED; DB transaction: set WaitlistEntry EXPIRED, set associated Reservation EXPIRED, write AuditLog; `redis.del(waitlistHoldKey(id))`; call `advanceWaitlist`; send `waitlist-offer-expired` email non-blocking
  - Create `workers/event-reminder.worker.ts`: process `event-reminder` queue; skip if Ticket not ACTIVE; send `event-reminder` email
  - Create `workers/index.ts` that starts all three workers and logs startup
  - Verify idempotency: each worker checks current status before acting — re-running a job for an already-EXPIRED reservation is a no-op
    - Commit and push changes to github

- [x] 10. Workshop / Session Reservation Module
  - Create `features/sessions/schemas.ts`, `features/sessions/types.ts`
  - Create `features/sessions/queries.ts`: `getEventSessions(eventId)` with enrolment counts, `getTicketEnrolments(ticketId)`
  - Implement `enrolInSession(input: { ticketId, sessionIds })` in `features/sessions/actions.ts`: authenticate; verify ticket belongs to user and is ACTIVE; load sessions; validate inclusionMode allows selection; for OPTIONAL_PAID return `{ success: false, error: 'REQUIRES_PAYMENT', sessionIds }`; DB transaction for each free session: check capacity, create SessionEnrolment, write AuditLog; return `{ success: true }`
  - Add auto-enrolment for INCLUDED sessions inside `submitRsvp` (Task 5) and the existing `confirmOrder` path: after Ticket creation, query all INCLUDED sessions for the event and create SessionEnrolment records in the same transaction
  - Create `features/sessions/components/session-selector.tsx` — checklist of sessions with title, facilitator, time, price, capacity indicator; INCLUDED sessions pre-checked and non-interactive; full sessions show "Full" badge and are disabled
    - Commit and push changes to github

- [x] 11. Organizer Reservation Management
  - Extend `features/organizer/queries.ts` with `getEventReservations(eventId, organizerId, filters, pagination)`: filters for search (name, email, ticket number), ticketTypeId, status, dateFrom/dateTo; pagination; returns `{ tickets: TicketRow[], total: number }` where TicketRow includes id, ticketNumber, status, issuedAt, isComplimentary, attendee name+email, ticketType name, seat/table/slot info, payment amount
  - Add `cancelTicket(input: { ticketId, eventId, reason?, force? })` to `features/organizer/actions.ts`: authenticate organizer; verify ownership; if ticket USED and `force !== true` return `{ success: false, error: 'CHECKED_IN_REQUIRES_FORCE' }`; DB transaction: set Ticket CANCELLED, release EventSeat if reserved, decrement TicketType.sold if GA, write AuditLog with actor = organizerId; call `advanceWaitlist` non-blocking; send `ticket-cancelled` email non-blocking
  - Add `issueComplimentaryTicket(input: { eventId, ticketTypeId, recipientEmail, recipientName })`: authenticate organizer; upsert User by email; DB transaction: create Ticket with `isComplimentary: true` without incrementing sold, write AuditLog; send confirmation email non-blocking; return `{ success: true, ticketId }`
  - Add `resendConfirmationEmail(input: { ticketId })`: authenticate organizer; verify ticket on organizer's event; send `ticket-confirmation` email; return `{ success: true }`
  - Add `exportReservationsCSV(eventId)`: authenticate organizer; query all confirmed tickets without pagination; build CSV string with headers (ticketNumber, status, attendeeName, email, ticketType, seatInfo, purchaseDate, amount, isComplimentary); return CSV string
  - Create `app/(dashboard)/dashboard/events/[id]/reservations/page.tsx` Server Component reading search params and rendering `<ReservationTable>`
  - Create `features/organizer/components/reservation-table.tsx` Client Component: debounced search input (500ms), filter dropdowns for TicketType and status, date range picker, action column with Cancel (force-confirm dialog for USED tickets) / Issue Comp / Resend Email buttons, Export CSV button
  - Commit and push changes to github

- [x] 12. Organizer Inventory Management Dashboard
  - Extend `features/organizer/queries.ts` with `getEventInventory(eventId, organizerId)`: parallel queries for TicketType records + sold counts, active Reservation counts per ticketTypeId (expiresAt > now → held), WaitlistEntry counts (PENDING+OFFERED) per ticketTypeId, TimeSlot records + TimeSlotTicket counts, EventSession enrolment counts, EventSeat status aggregates by section; compute `available = (quantity ?? null) - sold - held`; return EventInventory shape from design doc
  - Add `exportInventoryCSV(eventId)` to `features/organizer/actions.ts`
  - Create `app/(dashboard)/dashboard/events/[id]/inventory/page.tsx` Server Component
  - Create `features/organizer/components/inventory-dashboard.tsx` Server Component: per-TicketType card showing total/sold/held/available/cancelled + waitlist count; TimeSlot section with per-slot capacity bars; Sessions section with enrolment counts; Seat section (RESERVED/MIXED only) with per-section status breakdown; Export CSV button
    - Commit and push changes to github

- [x] 13. Checkout Confirmation Page
  - Create `app/(marketing)/events/[slug]/checkout/success/page.tsx` Server Component: read `?orderId=` or `?reservationId=` query param; server-verify ownership (userId === session.user.id, status COMPLETED); redirect to `/events/[slug]` if invalid; render event name/date/venue, total paid or "Free", ticket list with QR codes, session enrolment summary
  - Create or extend `features/checkout/queries.ts` with `getConfirmedOrderDetails(reservationId, userId)` returning event info, tickets with QR codes, payment amount
  - Add "View My Tickets" button → `/dashboard/tickets`
  - Create `app/(marketing)/events/[slug]/checkout/success/success-page-client.tsx` Client Component with "Add to Calendar" button that fetches `/api/events/[slug]/ical` and triggers file download
  - Create `app/api/events/[slug]/ical/route.ts` GET handler: load event by slug; generate ICS string with VCALENDAR/VEVENT, DTSTART/DTEND, SUMMARY, LOCATION, DESCRIPTION; return `Response` with `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="event.ics"`
    - Commit and push changes to github

- [x] 14. Organizer Reservation Configuration UI
  - Extend `features/organizer/actions.ts` `upsertTicketType` to accept new fields: minPerOrder, maxPerOrder, maxPerUser, visibility, accessPassword (hashed with `bcrypt.hash(password, 10)` when PASSWORD_PROTECTED), isTableType, tableCapacity, requiresAssignedSeating; generate `directLinkToken` via `crypto.randomBytes(20).toString('hex')` when HIDDEN; guard: reject quantity reductions below `sold` for published events with confirmed tickets; server-side Zod validation with field-level errors
  - Add `upsertTimeSlot(input)` to `features/organizer/actions.ts`: Zod validation (startsAt < endsAt, capacity > 0, price >= 0); upsert; return `{ success: true, timeSlotId }`
  - Add `upsertEventSession(input)` to `features/organizer/actions.ts`: Zod validation; upsert; return `{ success: true, sessionId }`
  - Add `deleteTimeSlot(timeSlotId, eventId)` and `deleteEventSession(sessionId, eventId)`: only allowed when no confirmed tickets/enrolments exist for the slot/session
  - Update `features/organizer/components/ticket-type-form.tsx`: add Min/Max per order, Max per user numeric inputs; Visibility selector; conditional password input for PASSWORD_PROTECTED; Table Type toggle with capacity + assigned seating checkbox; read-only direct-link URL when HIDDEN with token present
  - Create `features/organizer/components/table-config-tab.tsx`: list of table TicketTypes; Add/Edit inline form using `upsertTicketType` with `isTableType: true`; Delete with confirmation
  - Create `features/organizer/components/time-slot-config-tab.tsx`: chronological slot list; Add/Edit form (label, start/end datetime, capacity, price); Delete disabled if tickets sold
  - Create `features/organizer/components/session-config-tab.tsx`: session list with title, facilitator, time, mode, capacity, enrolment count; Add/Edit form; Delete disabled if enrolments exist
  - Integrate new tabs into the event editor: General | Tickets | Tables | Time Slots | Sessions
  - Commit and push changes to github

- [x] 15. Email Notification Templates
  - Create `emails/ticket-confirmation.tsx` React Email template: props for event (name, date, venue), tickets array (ticketNumber, qrCode as data URL, seatInfo), totalPaid or "Free", attendeeName
  - Create `emails/reservation-expired.tsx` — seats released notice with link back to event
  - Create `emails/ticket-cancelled.tsx` — cancellation notice with refund info if applicable
  - Create `emails/waitlist-joined.tsx` — waitlist position confirmation with event details
  - Create `emails/waitlist-offered.tsx` — offer notice with checkout URL, ticket count, exact expiry timestamp
  - Create `emails/waitlist-offer-expired.tsx` — offer expired with option to rejoin
  - Create `emails/waitlist-closed.tsx` — event ended without offer notice
  - Create `emails/refund-confirmed.tsx` — refund amount and processing timeline
  - Create `emails/event-reminder.tsx` — 24h reminder with event details, QR code(s), venue info
  - Extend `lib/email.ts` with typed send functions for all 9 templates: `sendTicketConfirmation`, `sendReservationExpired`, `sendTicketCancelled`, `sendWaitlistJoined`, `sendWaitlistOffered`, `sendWaitlistOfferExpired`, `sendWaitlistClosed`, `sendRefundConfirmed`, `sendEventReminder`; each wraps the Resend call in try/catch, logs failures, and never throws
    - Commit and push changes to github

- [x] 16. Property-Based Tests for Correctness Properties
  - Set up `__tests__/reservation-system.property.test.ts` using the project's existing test framework
  - **P1 — Inventory Never Goes Negative:** for any sequence of concurrent `submitRsvp` calls on a TicketType with quantity N, assert total confirmed tickets never exceeds N
  - **P2 — Waitlist FIFO Ordering:** given N waitlist entries at positions 1..N, simulate cancellation releasing 1 slot; assert entry with lowest position is offered first
  - **P3 — Audit Log Completeness:** for each state-changing action (submitRsvp, cancelTicket, joinWaitlist, advanceWaitlist), verify AuditLog count increases by exactly 1
  - **P4 — Purchase Limit Enforcement:** for any `maxPerUser = M`, assert total confirmed tickets for a user across repeated purchases never exceeds M
  - **P5 — Expiry Idempotency:** run reservation expiry job 3 times for the same reservationId; assert Reservation.status remains EXPIRED and no duplicate AuditLog entries are created for the same transition
  - **P6 — Visibility Enforcement:** for any HIDDEN or PASSWORD_PROTECTED TicketType, reservation attempts without a valid token must return `{ success: false }` 100% of the time; run at least 20 generated cases per property

## Notes

- All Server Actions follow the existing pattern: `'use server'` directive, Zod input validation, authenticated session check, Prisma transaction for atomic state changes.
- Email sends are always non-blocking — wrap in `.catch(console.error)` and never await in the critical path. Failures are logged but never roll back confirmed tickets.
- BullMQ job IDs are deterministic (`reservation-expiry-{id}`, `waitlist-expiry-{id}`, `event-reminder-{eventId}-{userId}`). Scheduling the same job twice is idempotent.
- The `bcrypt` package is already available in the project (used for password hashing). Use `bcrypt.hash(password, 10)` and `bcrypt.compare`.
- Prisma client is imported from `@/app/generated/prisma/client` per the existing pattern in `lib/db.ts`.
- All new server modules must include `import 'server-only'` to prevent accidental client-side imports.
- The `crypto` module used for token generation is Node.js built-in — no additional dependency needed.
