# Requirements Document

## Introduction

The SWITCH platform already has a solid reservation foundation: reserved-seating checkout, GA checkout, group booking, Paystack-backed payments, QR-code tickets, check-in scanning, and Redis-based inventory locking. This spec covers the **remaining reservation models and management capabilities** that are not yet implemented:

1. **Free RSVP** — zero-price registration without Paystack
2. **Table Reservation** — organizer-configured tables with capacity and optional assigned seating
3. **Waitlist** — automatic queue when inventory is exhausted, with notification and payment window
4. **Time-Slot Reservation** — capacity-limited time windows within an event
5. **Workshop / Session Reservation** — multi-session events where attendees pick sessions
6. **Per-Order / Per-User Purchase Limits** — enforcement on ticket types
7. **Ticket Visibility Control** — public, hidden, or password-protected ticket types
8. **Organizer Reservation Configuration UI** — event creation/edit forms for all reservation models
9. **Organizer Inventory Management** — real-time inventory dashboard per event
10. **Organizer Reservation Management** — search, filter, cancel, refund, manual add, export
11. **Notifications System** — email, in-app, and SMS notifications for reservation lifecycle events
12. **Checkout Confirmation UI** — order confirmation page with tickets and QR codes

Existing capabilities (reserved seating, GA checkout, group booking with split payment, Paystack payments, refunds, QR ticket generation, check-in scanner, Redis concurrency protection, BullMQ background jobs, promo codes) are **not re-specified** here; this document extends them.

---

## Glossary

- **Reservation_Engine**: The backend system that holds, confirms, expires, and cancels inventory across all reservation models.
- **TicketType**: A named inventory bucket attached to an Event (e.g., "Early Bird", "VIP", "Table A", "9am Slot").
- **Reservation**: A time-limited hold on one or more inventory units while a customer completes checkout.
- **Order**: The record of what a customer purchased in a single checkout session (may contain multiple tickets).
- **Ticket**: An attendee's confirmed right of access to an event, carrying a unique QR code.
- **Table**: An organizer-configured seating unit with a fixed capacity sold as a single unit or by individual seat.
- **TimeSlot**: A capacity-limited time window within an event (e.g., "10:00–11:00am, max 30 visitors").
- **Session**: A breakout, workshop, or track within a multi-session event.
- **Waitlist**: An ordered queue of users who requested inventory after it was exhausted.
- **Waitlist_Window**: The configurable period a waitlisted user has to complete payment before their offer expires.
- **RSVP**: A free registration that consumes inventory without a payment step.
- **Inventory_Hold**: A temporary reservation created at the start of checkout that blocks the inventory for other users.
- **Organizer**: An authenticated user with the `ORGANIZER` role who creates and manages events.
- **Attendee**: An authenticated user who purchases tickets or RSVPs to events.
- **Platform**: The SWITCH web application built on Next.js with Prisma/PostgreSQL and Redis.

---

## Requirements

---

### Requirement 1: Free RSVP Registration

**User Story:** As an Attendee, I want to register for a free event without entering payment details, so that I can confirm my attendance quickly and receive a ticket immediately.

#### Acceptance Criteria

1. WHEN an Attendee submits an RSVP for a free TicketType (price = 0), THE Reservation_Engine SHALL create a confirmed Ticket without initiating a Paystack transaction.
2. WHEN an RSVP is submitted for a TicketType whose quantity is finite, THE Reservation_Engine SHALL decrement available inventory atomically and prevent overbooking using a database transaction.
3. IF the requested RSVP quantity exceeds the remaining inventory of the TicketType, THEN THE Reservation_Engine SHALL return an error indicating the maximum available quantity and SHALL NOT create a Reservation or Ticket.
4. WHEN an RSVP is confirmed, THE Platform SHALL issue a Ticket with a unique `ticketNumber`, a unique `qrCode`, and status `ACTIVE` in the same database transaction that decrements the inventory.
5. WHEN an RSVP is confirmed, THE Platform SHALL send an order confirmation email containing the ticket QR code(s) to the Attendee within 60 seconds.
6. WHILE a TicketType has a configured `salesStart` or `salesEnd`, THE Reservation_Engine SHALL reject RSVP submissions outside those dates with an appropriate error message.
7. WHERE an Event has per-order minimum and maximum limits configured on a TicketType, THE Reservation_Engine SHALL enforce those limits and reject RSVP submissions that violate them.

---

### Requirement 2: Table Reservation Model

**User Story:** As an Organizer, I want to configure tables for my event (dinners, galas, weddings), so that attendees can reserve an entire table as a single purchase unit.

#### Acceptance Criteria

1. THE Platform SHALL allow an Organizer to create one or more Table records for an Event, each with a name, capacity (number of seats at the table), price (in minor currency units), and available quantity.
2. WHEN an Organizer creates a Table record, THE Platform SHALL store the Table as a specialised TicketType with `tableCapacity` metadata, preserving the existing payment and inventory model without requiring a separate database table.
3. WHEN an Attendee purchases a Table, THE Reservation_Engine SHALL hold the Table inventory atomically using the existing Redis lock + database transaction pattern before initiating Paystack checkout.
4. WHEN a Table purchase is confirmed via Paystack webhook, THE Platform SHALL issue one Ticket per Table purchased, with the table name reflected in the ticket metadata.
5. IF an Organizer sets `requiresAssignedSeating = true` on a Table, THEN THE Platform SHALL allow the purchaser to assign individual attendee names to each seat within the table after purchase.
6. THE Platform SHALL display Table availability (available / sold / held counts) on the Organizer's inventory dashboard in real time, reading from the existing `TicketType.sold` counter and active Reservations.
7. IF a Table Reservation hold expires before payment is completed, THEN THE Reservation_Engine SHALL release the held inventory back to AVAILABLE and the Attendee SHALL be returned to the event page with an expiry notice.

---

### Requirement 3: Waitlist

**User Story:** As an Attendee, I want to join a waitlist when a ticket type is sold out, so that I can be automatically notified and given the chance to purchase if a spot opens up.

#### Acceptance Criteria

1. WHEN a TicketType's available inventory reaches zero, THE Platform SHALL display a "Join Waitlist" option to Attendees on the event page.
2. WHEN an authenticated Attendee submits a waitlist request for a TicketType, THE Platform SHALL create a WaitlistEntry record with the Attendee's userId, eventId, ticketTypeId, requested quantity, and a position number that reflects insertion order.
3. THE Platform SHALL prevent duplicate WaitlistEntry records for the same Attendee and TicketType combination; IF a duplicate is submitted, THEN THE Platform SHALL return an error indicating the Attendee is already on the waitlist.
4. WHEN a confirmed Ticket is cancelled or refunded and its associated TicketType inventory becomes available again, THE Reservation_Engine SHALL automatically advance the next eligible WaitlistEntry to `OFFERED` status and SHALL send a notification to the Attendee within 2 minutes.
5. WHEN a WaitlistEntry is advanced to `OFFERED`, THE Platform SHALL create a time-limited Inventory_Hold for the offered quantity and SHALL record the Waitlist_Window expiry time (configurable per event, default 30 minutes) in the WaitlistEntry.
6. WHEN a WaitlistEntry is `OFFERED` and the Attendee completes payment within the Waitlist_Window, THE Reservation_Engine SHALL confirm the Ticket and mark the WaitlistEntry as `FULFILLED`.
7. IF a WaitlistEntry is `OFFERED` and the Waitlist_Window expires before payment is completed, THEN THE Reservation_Engine SHALL release the held inventory, mark the WaitlistEntry as `EXPIRED`, and advance the next eligible WaitlistEntry.
8. WHEN a WaitlistEntry is advanced to `OFFERED`, THE Platform SHALL notify the Attendee by email with the offer details, checkout URL, and the exact Waitlist_Window expiry timestamp.
9. WHEN a WaitlistEntry expires without an offer being made (event closes with inventory never restocked), THE Platform SHALL send a notification email to the Attendee informing them the waitlist has closed without an offer.
10. THE Platform SHALL allow an Attendee to remove themselves from a waitlist at any time while the WaitlistEntry has status `PENDING` or `OFFERED`; WHEN an Attendee removes an `OFFERED` WaitlistEntry, THE Reservation_Engine SHALL release the associated Inventory_Hold and advance the next eligible WaitlistEntry.
11. THE Platform SHALL allow an Organizer to view, search, and export the waitlist for any TicketType on their event.

---

### Requirement 4: Time-Slot Reservation

**User Story:** As an Organizer, I want to create timed entry slots for my event (exhibitions, appointments, demos), so that attendees can book a specific time window and capacity is spread across the day.

#### Acceptance Criteria

1. THE Platform SHALL allow an Organizer to create TimeSlot records for an Event, each with a label, `startsAt` datetime, `endsAt` datetime, capacity, price, and `status` (ACTIVE / INACTIVE).
2. WHEN an Attendee selects a TimeSlot during checkout, THE Reservation_Engine SHALL hold that slot's capacity using the same Redis + database transaction pattern used for seat and GA reservations.
3. WHEN a TimeSlot Reservation is confirmed via payment, THE Platform SHALL issue one Ticket per slot purchased and SHALL associate the `timeSlotId` with the Ticket for check-in validation.
4. THE Platform SHALL prevent an Attendee from booking overlapping TimeSlots for the same Event in a single order.
5. WHEN a TimeSlot reaches zero available capacity, THE Platform SHALL mark it as visually unavailable and SHALL prevent new Reservations for that slot without affecting other slots.
6. IF a TimeSlot Reservation hold expires before payment is completed, THEN THE Reservation_Engine SHALL release the held capacity and make it available for other Attendees.
7. THE Organizer inventory dashboard SHALL display real-time capacity consumed and remaining for each TimeSlot.

---

### Requirement 5: Workshop / Session Reservation

**User Story:** As an Organizer running a conference or multi-track event, I want attendees to select sessions or workshops, so that I can manage capacity per session and personalise the attendee schedule.

#### Acceptance Criteria

1. THE Platform SHALL allow an Organizer to create EventSession records for an Event, each with a title, description, speaker/facilitator name, `startsAt`, `endsAt`, capacity, and inclusion mode: `INCLUDED` (free with event ticket), `OPTIONAL_FREE`, `OPTIONAL_PAID`, or `CAPACITY_LIMITED`.
2. WHEN an Attendee registers for an Event with sessions in `INCLUDED` mode, THE Platform SHALL automatically enrol the Attendee in all `INCLUDED` sessions without requiring additional selection.
3. WHEN an Attendee selects `OPTIONAL_FREE` or `OPTIONAL_PAID` sessions during checkout, THE Reservation_Engine SHALL hold the session capacity atomically before proceeding to payment.
4. WHEN an Attendee actively selects a session of mode `OPTIONAL_PAID`, THE Platform SHALL add the session price to the order total and process payment through the existing Paystack flow.
5. WHEN session enrolment is confirmed, THE Platform SHALL issue a SessionTicket record linking the Attendee's Ticket to the EventSession and SHALL include session details in the confirmation email.
6. IF a session's capacity is exhausted, THEN THE Platform SHALL show the session as full and SHALL prevent new selections for that session without blocking checkout for remaining sessions.
7. THE Organizer inventory dashboard SHALL display the enrolment count and remaining capacity for each EventSession.

---

### Requirement 6: Per-Order and Per-User Purchase Limits

**User Story:** As an Organizer, I want to set minimum and maximum quantities per order, and a maximum per user, on each ticket type, so that I can prevent bulk buying and ensure fair access.

#### Acceptance Criteria

1. THE Platform SHALL store `minPerOrder`, `maxPerOrder`, and `maxPerUser` integer fields on TicketType records (all nullable; null means no limit).
2. WHEN a checkout is initiated, THE Reservation_Engine SHALL validate that the requested quantity for each TicketType satisfies `minPerOrder ≤ quantity ≤ maxPerOrder`; IF the quantity violates either bound, THEN THE Reservation_Engine SHALL return a descriptive error and reject the reservation.
3. WHEN a checkout is initiated, THE Reservation_Engine SHALL query the Attendee's previously confirmed Tickets for each TicketType; IF the new quantity plus existing confirmed quantity exceeds `maxPerUser`, THEN THE Reservation_Engine SHALL return an error indicating the per-user limit.
4. THE Platform SHALL enforce purchase limits server-side and SHALL NOT rely on client-side input alone for limit validation.
5. WHEN an Organizer configures limits on a TicketType, THE Platform SHALL display the configured limits to Attendees on the event page so they understand the purchase rules.

---

### Requirement 7: Ticket Type Visibility Control

**User Story:** As an Organizer, I want to control who can see certain ticket types (e.g., staff comps, early-access codes), so that I can offer hidden or password-protected tiers without exposing them to the general public.

#### Acceptance Criteria

1. THE Platform SHALL store a `visibility` field on TicketType with values: `PUBLIC` (default), `HIDDEN`, or `PASSWORD_PROTECTED`.
2. WHEN the event page is rendered for an unauthenticated or general Attendee, THE Platform SHALL omit TicketTypes with `visibility = HIDDEN` from the ticket selector display.
3. WHEN the event page is rendered, THE Platform SHALL display TicketTypes with `visibility = PASSWORD_PROTECTED` with a password prompt; WHEN a correct password is entered, THE Platform SHALL unlock that TicketType for purchase in the current session.
4. THE Platform SHALL store access passwords for PASSWORD_PROTECTED TicketTypes as a hashed value and SHALL validate submissions server-side before revealing the ticket type.
5. WHEN an Organizer sets a TicketType to `HIDDEN`, THE Platform SHALL allow the Organizer to share a direct link that pre-unlocks that TicketType for Attendees who visit via the link; WHEN a valid direct-link access token is present, THE Platform SHALL display the TicketType without requiring a password prompt.
6. THE Reservation_Engine SHALL reject any reservation attempt for a `HIDDEN` or `PASSWORD_PROTECTED` TicketType submitted without a valid access token or password, regardless of the request origin.

---

### Requirement 8: Organizer Reservation Configuration UI

**User Story:** As an Organizer, I want a guided configuration interface when creating or editing an event, so that I can set up any reservation model without needing technical knowledge.

#### Acceptance Criteria

1. THE Platform SHALL provide an event creation and edit form that allows an Organizer to add, edit, and remove TicketType records including name, description, price, quantity, salesStart, salesEnd, minPerOrder, maxPerOrder, maxPerUser, visibility, and refund policy.
2. WHEN an Organizer selects the `RESERVED` or `MIXED` seating type, THE Platform SHALL guide them through associating a SeatMap with the Event and configuring per-section pricing on EventSeat records.
3. THE Platform SHALL allow an Organizer to configure Table records for an event through a dedicated "Tables" tab in the event editor, including table name, capacity, price, and quantity.
4. THE Platform SHALL allow an Organizer to add and configure TimeSlot records through a "Time Slots" tab, including time window, capacity, and price per slot.
5. THE Platform SHALL allow an Organizer to add and configure EventSession records through a "Sessions" tab, including title, speaker, time, capacity, and inclusion mode.
6. WHEN an Organizer configures a TicketType or reservation model, THE Platform SHALL show a live preview of how the ticket selector will appear to Attendees.
7. IF an Event is in `PUBLISHED` status and has confirmed Tickets, THEN THE Platform SHALL prevent the Organizer from reducing a TicketType's `quantity` below the number already sold for that type.
8. WHEN an Organizer saves changes to reservation configuration, THE Platform SHALL validate all fields server-side and return field-level errors for any invalid values.

---

### Requirement 9: Organizer Inventory Management Dashboard

**User Story:** As an Organizer, I want to see real-time inventory counts for each ticket type on my event, so that I can monitor sales and make informed decisions about capacity.

#### Acceptance Criteria

1. THE Platform SHALL provide an inventory view for each published Event accessible from the organizer's event management page, showing per-TicketType counts: `total`, `sold`, `held` (active reservations), `available`, and `cancelled`.
2. WHEN the Organizer views the inventory dashboard, THE Platform SHALL compute `held` counts by querying active Reservation records with `status = ACTIVE` and `expiresAt > now()` and SHALL compute `available` as `total − sold − held`.
3. THE Platform SHALL refresh inventory counts on page load without requiring manual refresh; WHEN a sale is confirmed, the sold count SHALL be updated within the next page load cycle.
4. FOR RESERVED seating events, THE Platform SHALL additionally display per-seat-section counts of AVAILABLE, HELD, SOLD, and BLOCKED EventSeat records.
5. FOR events with TimeSlots, THE Platform SHALL display per-slot capacity consumed and remaining in the inventory dashboard.
6. FOR events with EventSessions, THE Platform SHALL display per-session enrolment counts and remaining capacity.
7. THE Platform SHALL allow the Organizer to export inventory data as a CSV file from the inventory dashboard.

---

### Requirement 10: Organizer Reservation Management

**User Story:** As an Organizer, I want to view, search, filter, and manage individual reservations and tickets for my event, so that I can handle attendee requests and maintain accurate records.

#### Acceptance Criteria

1. THE Platform SHALL provide a reservations management table for each Event, listing all confirmed Tickets with attendee name, email, ticket type, seat/table/slot, ticket number, purchase date, payment amount, and status.
2. THE Platform SHALL allow the Organizer to search reservations by attendee name, email, or ticket number with results appearing within 500ms of input.
3. THE Platform SHALL allow the Organizer to filter reservations by TicketType, status (ACTIVE, USED, CANCELLED, REFUNDED), and purchase date range.
4. THE Platform SHALL allow the Organizer to cancel an individual confirmed Ticket from the management table, which SHALL set the Ticket status to `CANCELLED` and SHALL create a record in an audit log.
5. THE Platform SHALL allow the Organizer to issue a complimentary Ticket for any TicketType on their event without going through payment; THE Platform SHALL mark complimentary Tickets with a `isComplimentary` flag and SHALL NOT count them toward `TicketType.sold` in revenue calculations.
6. THE Platform SHALL allow the Organizer to resend the confirmation email for any confirmed Ticket from the management table.
7. THE Platform SHALL allow the Organizer to export the full reservation list as a CSV file containing all fields visible in the table.
8. IF the Organizer attempts to cancel a Ticket that has already been checked in (status `USED`), THEN THE Platform SHALL require explicit confirmation and SHALL record the override in the audit log.

---

### Requirement 11: Notification System for Reservation Lifecycle Events

**User Story:** As an Attendee, I want to receive timely email notifications at key points in the reservation process, so that I always know the status of my bookings.

#### Acceptance Criteria

1. WHEN a Reservation is confirmed and Tickets are issued, THE Platform SHALL send a confirmation email to the Attendee containing the event name, date, venue, ordered ticket details, ticket numbers, and QR codes within 60 seconds of confirmation.
2. WHEN a Reservation expires without payment (hold timeout), THE Platform SHALL send an expiry notification email to the Attendee informing them that their held seats or tickets were released.
3. WHEN a Ticket is cancelled by the Organizer or Platform, THE Platform SHALL send a cancellation notification email to the Attendee.
4. WHEN a WaitlistEntry is advanced to `OFFERED`, THE Platform SHALL send an offer notification email to the Attendee containing the checkout URL, the number of tickets offered, and the exact Waitlist_Window expiry timestamp.
5. WHEN a WaitlistEntry offer expires without payment, THE Platform SHALL send an expiry notification email to the Attendee informing them the offer has passed.
6. WHEN a refund is processed and approved, THE Platform SHALL send a refund confirmation email to the Attendee with the refund amount and expected processing timeline.
7. THE Platform SHALL send all transactional emails through the existing Resend integration and SHALL use React Email templates for each notification type.
8. IF an email delivery attempt fails, THE Platform SHALL log the failure without blocking the underlying reservation operation; THE Platform SHALL NOT roll back confirmed Tickets due to email delivery failures.
9. WHERE an Event has a start time within 24 hours and an Attendee holds an active Ticket, THE Platform SHALL send a reminder email with event details and the Attendee's QR code ticket.

---

### Requirement 12: Checkout Confirmation Page

**User Story:** As an Attendee, I want to see a clear confirmation screen after completing checkout, so that I can verify my purchase, view my tickets, and know what to do next.

#### Acceptance Criteria

1. WHEN a Paystack payment is confirmed via webhook and Tickets are issued, THE Platform SHALL display a confirmation page at `/events/[slug]/checkout/success` showing the order summary, all issued ticket numbers, and a link to view full tickets.
2. THE confirmation page SHALL display each issued Ticket's QR code as a scannable image.
3. THE confirmation page SHALL display the event name, date, venue, and total amount paid.
4. WHEN the confirmation page loads, THE Platform SHALL verify the payment status server-side before rendering ticket details and SHALL redirect to the event page if no valid confirmed order is found.
5. THE confirmation page SHALL include a "View My Tickets" button linking to the Attendee's ticket dashboard (`/dashboard/tickets`).
6. THE confirmation page SHALL include an "Add to Calendar" button that generates an ICS download for the event.
7. FOR Free RSVP confirmations, THE Platform SHALL display a confirmation page with the same structure, replacing payment amount with "Free" and omitting payment details.

---

### Requirement 13: Reservation Expiry Background Jobs

**User Story:** As a Platform operator, I want expired reservations and waitlist offers to be cleaned up automatically, so that held inventory is returned promptly without manual intervention.

#### Acceptance Criteria

1. THE Platform SHALL use the existing BullMQ infrastructure to schedule a reservation expiry job at the time each Reservation's `expiresAt` is set.
2. WHEN a reservation expiry job fires, THE Reservation_Engine SHALL verify the Reservation status; IF the Reservation is in `ACTIVE` status, THEN THE Reservation_Engine SHALL atomically set the Reservation to `EXPIRED`, release all held EventSeat statuses back to `AVAILABLE`, and decrement any held GA TicketType inventory holds.
3. WHEN a waitlist offer expiry job fires, THE Reservation_Engine SHALL verify the WaitlistEntry status; IF the WaitlistEntry is in `OFFERED` status, THEN THE Reservation_Engine SHALL release the associated Inventory_Hold, mark the WaitlistEntry as `EXPIRED`, and advance the next eligible WaitlistEntry.
4. THE Platform SHALL use idempotent BullMQ job IDs for reservation expiry (`reservation-expiry-{reservationId}`) and waitlist expiry (`waitlist-expiry-{waitlistEntryId}`) to prevent duplicate processing on webhook retries.
5. IF a reservation expiry job fires for a Reservation that is already in `COMPLETED`, `CANCELLED`, or `EXPIRED` status, THEN THE Reservation_Engine SHALL skip processing and return without error.

---

### Requirement 14: Audit Logging for Reservation Operations

**User Story:** As a Platform operator or Organizer, I want a complete audit trail of all reservation state changes, so that disputes can be investigated and fraudulent activity detected.

#### Acceptance Criteria

1. THE Platform SHALL record an audit log entry for every state transition of a Reservation, Ticket, WaitlistEntry, or EventSeat that is initiated by a user action or background job.
2. EACH audit log entry SHALL contain: the entity type, entity id, the old status, the new status, the actor (userId or `"system"` for background jobs), and a UTC timestamp.
3. THE Platform SHALL write audit log entries within the same database transaction as the state change they record, ensuring audit entries are never created without the corresponding change.
4. THE Platform SHALL allow Admin users to query audit logs by entity type, entity id, actor, and date range from the admin dashboard.
5. WHEN an Organizer cancels a Ticket or issues a complimentary Ticket, THE Platform SHALL record the Organizer's userId as the actor in the audit log entry.
