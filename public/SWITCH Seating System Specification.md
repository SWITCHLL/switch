# SWITCH Seating System Specification

## Overview

SWITCH uses a flexible, event-specific seating architecture that supports:

- General admission events
- Reserved seating
- Mixed seating
- Multiple venue sections
- Rows and numbered seats
- Different ticket prices by section/seat
- Temporary seat reservations
- Seat locking during checkout
- Ticket ownership
- Dynamic QR tickets
- Reusable venue layouts
- Future visual seat-map builders

The core principle is:

> **A physical seat belongs to a venue, while its availability belongs to an event.**

This prevents the same physical seat from being permanently marked as sold when it is reused for another event.

---

# 1. Seating Architecture

The seating hierarchy is:

```text
Event
 └── Venue
      └── SeatMap
           ├── Section
           │    ├── Row
           │    │    ├── Seat
           │    │    └── Seat
           │    └── Row
           │
           ├── Section
           │    └── ...
           │
           └── General Admission Area
```

The event-specific inventory is maintained separately:

```text
Event
 └── EventSeat
       └── Seat
```

This separation is critical.

### Physical layout

```text
Venue
 └── SeatMap
      └── Section
           └── Row
                └── Seat
```

### Event inventory

```text
Event
 └── EventSeat
      ├── status
      ├── price
      ├── ticketType
      ├── reservation
      └── ticket
```

---

# 2. Seating Types

Every event must define its seating mode.

```ts
enum SeatingType {
  GENERAL_ADMISSION = "GENERAL_ADMISSION",
  RESERVED = "RESERVED",
  MIXED = "MIXED",
}
```

## GENERAL_ADMISSION

Used for events where attendees do not select individual seats.

Examples:

- Concert standing areas
- Festivals
- Conferences
- Clubs
- General admission shows

No individual `Seat` records are required.

Capacity is controlled through ticket inventory.

Example:

```text
General Admission
Capacity: 5,000
```

---

## RESERVED

Used when attendees select specific seats.

Examples:

- Cinema
- Theatre
- Stadium
- Arena
- Concert with assigned seating

Example:

```text
VIP
 ├── Row A
 │    ├── A1
 │    ├── A2
 │    ├── A3
 │    └── A4
 │
 └── Row B
      ├── B1
      ├── B2
      ├── B3
      └── B4
```

---

## MIXED

Supports both reserved seating and general admission.

Example:

```text
Event
 ├── VIP
 │    └── Reserved Seats
 │
 ├── Regular
 │    └── Reserved Seats
 │
 └── Standing Area
      └── General Admission
```

---

# 3. Venue

A venue represents a physical location.

A venue should be reusable across multiple events.

```ts
Venue {
  id
  name
  address
  city
  state
  country
  capacity
  createdAt
  updatedAt
}
```

Example:

```json
{
  "name": "Eko Convention Centre",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "capacity": 5000
}
```

## Important

The venue should **not** contain event-specific seat availability.

A venue represents the physical location.

---

# 4. Seat Map

A seat map represents a specific layout for a venue.

```ts
SeatMap {
  id
  venueId

  name
  version

  width
  height

  status

  createdAt
  updatedAt
}
```

Example:

```text
Eko Convention Centre
 └── Main Hall Seat Map
      Version: 1
```

The `version` field allows the venue layout to evolve without breaking existing events.

---

# 5. Seat Map Versioning

Seat maps should support versions.

Example:

```text
Seat Map v1
 ├── VIP
 ├── Regular
 └── Balcony
```

Later:

```text
Seat Map v2
 ├── VVIP
 ├── VIP
 ├── Regular
 └── Balcony
```

Existing events should continue referencing the seat-map configuration they were created with.

Do not modify the seating structure of an active event in a way that invalidates already-sold tickets.

---

# 6. Sections

A section represents a logical seating area.

Examples:

- VVIP
- VIP
- Regular
- Balcony
- Box
- Table Area
- Standing Area

```ts
Section {
  id
  seatMapId

  name
  code

  type

  capacity

  positionX
  positionY

  width
  height

  createdAt
  updatedAt
}
```

Example:

```json
{
  "name": "VIP",
  "code": "VIP",
  "type": "RESERVED",
  "capacity": 250
}
```

---

# 7. Rows

Rows belong to sections.

```ts
Row {
  id
  sectionId

  label
  position

  seatsCount

  createdAt
  updatedAt
}
```

Example:

```text
VIP
 ├── Row A
 ├── Row B
 ├── Row C
 └── Row D
```

Rows can use:

- Letters
- Numbers
- Custom labels

Examples:

```text
A
B
C
D
```

or:

```text
101
102
103
```

---

# 8. Seats

Individual seats belong to rows and sections.

```ts
Seat {
  id

  rowId
  sectionId

  label
  number

  type

  positionX
  positionY

  createdAt
  updatedAt
}
```

Example:

```json
{
  "label": "A12",
  "number": 12,
  "type": "STANDARD"
}
```

Seat identity should be permanent.

Do not use a ticket ID as a seat ID.

---

# 9. Seat Types

SWITCH should support different seat types.

```ts
enum SeatType {
  STANDARD = "STANDARD",
  VIP = "VIP",
  VVIP = "VVIP",
  ACCESSIBLE = "ACCESSIBLE",
  COMPANION = "COMPANION",
  PREMIUM = "PREMIUM",
}
```

This allows future support for:

- Accessible seating
- Companion seating
- Premium seats
- VIP seating
- VVIP seating

---

# 10. Event Seat Inventory

This is one of the most important parts of the system.

Do not store event availability directly on `Seat`.

Avoid:

```ts
Seat {
  status: "SOLD"
}
```

Instead, create:

```ts
EventSeat {
  id

  eventId
  seatId

  status

  price

  ticketTypeId

  lockedUntil

  reservationId

  ticketId

  createdAt
  updatedAt
}
```

The seat is permanent.

The `EventSeat` represents how that seat behaves for a particular event.

---

# 11. Event Seat Status

```ts
enum EventSeatStatus {
  AVAILABLE = "AVAILABLE",
  HELD = "HELD",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  BLOCKED = "BLOCKED",
}
```

### AVAILABLE

Seat can be purchased.

### HELD

Seat is temporarily locked while a user is completing checkout.

### RESERVED

Seat has been assigned/reserved but payment may not yet be completed, depending on the business flow.

### SOLD

Seat has been successfully purchased.

### BLOCKED

Seat is unavailable for sale.

Examples:

- Organizer holds seat
- Maintenance
- Production crew
- Guest allocation
- Accessibility restrictions

---

# 12. Seat Lifecycle

The normal seat lifecycle is:

```text
AVAILABLE
    │
    ▼
  HELD
    │
    ├───────────────┐
    │               │
    ▼               ▼
 SOLD           AVAILABLE
```

Successful payment:

```text
AVAILABLE
    ↓
HELD
    ↓
Payment successful
    ↓
SOLD
```

Payment timeout:

```text
AVAILABLE
    ↓
HELD
    ↓
Reservation expires
    ↓
AVAILABLE
```

---

# 13. Seat Locking

Seat locking is required to prevent double booking.

Example:

```text
User A → selects A12
User B → selects A12
```

Only one user should successfully hold the seat.

SWITCH should use Redis distributed locking.

Example lock key:

```text
seat-lock:{eventId}:{seatId}
```

Example:

```text
seat-lock:event_001:seat_123
```

The lock should have a short TTL.

Example:

```text
TTL: 5 minutes
```

The exact TTL should be configurable.

---

# 14. Reservation

A reservation represents a temporary collection of seats held for a user.

```ts
Reservation {
  id

  eventId
  userId

  status

  expiresAt

  createdAt
  updatedAt
}
```

Example:

```text
Reservation R001

User:
John

Event:
Wizkid Live

Seats:
VIP-A12
VIP-A13
VIP-A14

Expires:
13:15
```

---

# 15. Reservation Status

```ts
enum ReservationStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}
```

---

# 16. Reservation Relationships

A reservation can contain multiple event seats.

```text
Reservation
 │
 ├── EventSeat A12
 ├── EventSeat A13
 └── EventSeat A14
```

This allows users to purchase multiple seats in one checkout session.

---

# 17. Ticket Types

Ticket types define what customers are purchasing.

```ts
TicketType {
  id
  eventId

  name
  description

  price
  currency

  quantity

  salesStart
  salesEnd

  status

  createdAt
  updatedAt
}
```

Example:

```text
VIP
₦50,000

Regular
₦20,000

Early Bird
₦15,000
```

---

# 18. Ticket Type Status

```ts
enum TicketTypeStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SOLD_OUT = "SOLD_OUT",
}
```

---

# 19. Event Seat Pricing

For reserved seating, pricing should be associated with the event inventory.

Example:

```text
VIP A1 → ₦50,000
VIP A2 → ₦50,000
VIP A3 → ₦50,000

Regular B1 → ₦20,000
Regular B2 → ₦20,000
```

Therefore:

```ts
EventSeat {
  seatId
  eventId

  ticketTypeId

  price

  status
}
```

This allows organizers to price the same physical seat differently for different events.

---

# 20. Ticket

A ticket represents a successful purchase/issued ticket.

```ts
Ticket {
  id

  eventId
  userId

  eventSeatId

  ticketTypeId

  ticketNumber

  qrCode

  status

  issuedAt

  createdAt
  updatedAt
}
```

For general admission tickets, `eventSeatId` can be nullable.

---

# 21. Ticket Status

```ts
enum TicketStatus {
  ACTIVE = "ACTIVE",
  USED = "USED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  EXPIRED = "EXPIRED",
}
```

---

# 22. Ticket Verification

Every ticket should have a unique ticket identifier.

Example:

```text
SWT-2026-8F92A1
```

The QR code should contain a secure ticket reference rather than exposing sensitive user information.

Example conceptual payload:

```json
{
  "ticketId": "ticket_123",
  "eventId": "event_001"
}
```

The backend must verify the ticket before allowing entry.

---

# 23. Event Creation Flow

The organizer event creation process should be:

```text
1. Event Details
       ↓
2. Select Venue
       ↓
3. Select Seating Type
       ↓
4. Configure Seating
       ↓
5. Configure Ticket Types
       ↓
6. Configure Prices
       ↓
7. Review Capacity
       ↓
8. Save Draft
       ↓
9. Publish Event
```

---

# 24. Organizer Seating Options

During event creation:

```text
How will attendees be seated?

○ General Admission

○ Reserved Seating

○ Mixed Seating
```

If the organizer selects:

### General Admission

Show:

```text
Total Capacity
Ticket Types
Prices
```

Example:

```text
Regular
Capacity: 5,000
Price: ₦20,000
```

---

### Reserved Seating

Show:

```text
Select Venue
      ↓
Select Seat Map
      ↓
Configure Sections
      ↓
Configure Prices
      ↓
Review Seat Inventory
```

---

### Mixed Seating

Show:

```text
Reserved Sections
+
General Admission Areas
```

---

# 25. Visual Seat Map

SWITCH should eventually provide a visual seat-map builder.

Example:

```text
┌───────────────────────────────────────┐
│                STAGE                  │
├───────────────────────────────────────┤
│                                       │
│                VVIP                   │
│          A1 A2 A3 A4 A5 A6            │
│          B1 B2 B3 B4 B5 B6            │
│                                       │
│                 VIP                   │
│       C1 C2 C3 C4 C5 C6 C7 C8         │
│       D1 D2 D3 D4 D5 D6 D7 D8         │
│                                       │
│               REGULAR                 │
│    E1 E2 E3 E4 E5 E6 E7 E8 E9 E10    │
│    F1 F2 F3 F4 F5 F6 F7 F8 F9 F10     │
│                                       │
└───────────────────────────────────────┘
```

The visual builder should allow organizers to:

- Add sections
- Add rows
- Add seats
- Delete seats
- Rename rows
- Change seat types
- Move sections
- Move rows
- Configure pricing
- Block seats
- Set capacities

---

# 26. Coordinates

Sections, rows and seats may have visual coordinates:

```ts
positionX
positionY
```

These coordinates are primarily for rendering the seat map.

They should not be used as the source of truth for seat identity.

The database should understand:

```text
A12
↓
Row A
↓
VIP
↓
Seat Map
↓
Venue
```

rather than relying on:

```text
x: 250
y: 120
```

---

# 27. Database Relationships

Recommended relationship:

```text
Venue
 │
 └── SeatMap
      │
      └── Section
           │
           └── Row
                │
                └── Seat
```

Event inventory:

```text
Event
 │
 ├── TicketType
 │
 ├── EventSeat
 │      │
 │      └── Seat
 │
 ├── Reservation
 │      │
 │      └── EventSeat
 │
 └── Ticket
        │
        └── EventSeat
```

---

# 28. Complete Entity Model

```text
User
 │
 └── Organizer
       │
       └── Event
             │
             ├── Venue
             │    └── SeatMap
             │         └── Section
             │              └── Row
             │                   └── Seat
             │
             ├── TicketType
             │
             ├── EventSeat
             │
             ├── Reservation
             │
             └── Ticket
```

---

# 29. Example Event

```json
{
  "name": "Wizkid Live Lagos",
  "seatingType": "RESERVED",
  "venue": "Eko Convention Centre",
  "seatMap": "Main Hall",
  "sections": [
    {
      "name": "VIP",
      "code": "VIP",
      "rows": [
        {
          "label": "A",
          "seats": [
            "A1",
            "A2",
            "A3",
            "A4"
          ]
        }
      ]
    }
  ]
}
```

Event inventory:

```json
{
  "eventId": "event_001",
  "seatId": "seat_A1",
  "ticketTypeId": "vip",
  "price": 50000,
  "status": "AVAILABLE"
}
```

After checkout:

```json
{
  "eventId": "event_001",
  "seatId": "seat_A1",
  "ticketTypeId": "vip",
  "price": 50000,
  "status": "SOLD"
}
```

---

# 30. General Admission Example

```text
Event
 └── Seating Type
      GENERAL_ADMISSION

Ticket Types

Regular
 ├── Price: ₦20,000
 └── Quantity: 5,000

VIP
 ├── Price: ₦50,000
 └── Quantity: 500
```

No individual seats need to be created.

Inventory is managed through ticket quantities.

---

# 31. Mixed Event Example

```text
Event
 └── MIXED
      │
      ├── VVIP
      │    └── Reserved Seats
      │
      ├── VIP
      │    └── Reserved Seats
      │
      └── Regular
           └── General Admission
```

This gives SWITCH the flexibility to support large concerts and festivals.

---

# 32. Important Database Constraints

The database should enforce:

### Unique seat labels within a row

```text
(rowId, label)
```

must be unique.

### Unique event seat

```text
(eventId, seatId)
```

must be unique.

This prevents duplicate event inventory.

### Unique ticket number

```text
ticketNumber
```

must be globally unique.

### Unique QR identifier

QR/ticket verification identifiers must be unique.

---

# 33. Concurrency Requirements

Seat purchasing is a high-concurrency operation.

The system must prevent:

```text
User A → A12
User B → A12
```

from both receiving the same seat.

The checkout process should use:

```text
Redis Lock
      ↓
Database Transaction
      ↓
Reservation
      ↓
Payment
      ↓
Ticket
```

Never rely only on frontend seat availability.

The backend must always verify seat availability.

---

# 34. Recommended Checkout Flow

```text
User selects seats
        ↓
Frontend sends seat IDs
        ↓
Backend validates event
        ↓
Backend acquires Redis locks
        ↓
Backend checks EventSeat status
        ↓
Create Reservation
        ↓
Set EventSeat = HELD
        ↓
Start payment
        ↓
Payment successful?
      /       \
    YES        NO
     ↓          ↓
SOLD        Release seats
     ↓
Create Ticket
     ↓
Generate QR
     ↓
Send ticket
```

---

# 35. Security Requirements

Never trust:

- Seat price from frontend
- Seat availability from frontend
- Ticket type price from frontend
- Event ID alone
- User-submitted ticket status

The backend must calculate and validate:

```text
Event
Seat
Ticket Type
Price
Availability
Reservation
Payment
Ticket
```

---

# 36. Event Publishing Validation

An event should not be published until the system validates:

- Venue exists
- Seating configuration is valid
- Capacity is greater than zero
- Ticket types have valid prices
- Ticket quantities are valid
- Reserved seats belong to the selected seat map
- No duplicate seats exist
- No duplicate rows exist
- No duplicate sections exist
- Event dates are valid
- Ticket sales dates are valid
- Required organizer/KYC requirements are satisfied

---

# 37. Immutable Sold Seats

Once a ticket has been sold:

```text
EventSeat
   ↓
SOLD
   ↓
Ticket
```

The organizer should not be allowed to:

- Delete the seat
- Change its identity
- Move it to another section
- Change its row
- Change its seat number

If a correction is required, use an administrative migration/refund process.

---

# 38. Recommended Prisma Structure

A simplified Prisma implementation should eventually resemble:

```prisma
model Venue {
  id        String   @id @default(uuid())
  name      String
  address   String?
  city      String
  state     String?
  country   String

  capacity  Int?

  seatMaps  SeatMap[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SeatMap {
  id        String   @id @default(uuid())
  venueId   String

  name      String
  version   Int      @default(1)

  width     Float?
  height    Float?

  venue     Venue     @relation(fields: [venueId], references: [id])
  sections  Section[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([venueId])
}

model Section {
  id        String   @id @default(uuid())
  seatMapId String

  name      String
  code      String
  type      String

  capacity  Int?

  positionX Float?
  positionY Float?
  width     Float?
  height    Float?

  seatMap   SeatMap  @relation(fields: [seatMapId], references: [id])
  rows      Row[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([seatMapId])
}

model Row {
  id        String   @id @default(uuid())
  sectionId String

  label     String
  position  Int?

  section   Section  @relation(fields: [sectionId], references: [id])
  seats     Seat[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sectionId, label])
}

model Seat {
  id         String   @id @default(uuid())
  rowId      String
  sectionId  String

  label      String
  number     Int?
  type       String

  positionX  Float?
  positionY  Float?

  row        Row      @relation(fields: [rowId], references: [id])

  eventSeats EventSeat[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([rowId, label])
  @@index([sectionId])
}

model EventSeat {
  id            String   @id @default(uuid())

  eventId       String
  seatId        String

  status        String   @default("AVAILABLE")

  price         Decimal
  ticketTypeId  String?

  lockedUntil   DateTime?

  reservationId String?
  ticketId      String?

  seat          Seat      @relation(fields: [seatId], references: [id])

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([eventId, seatId])
  @@index([eventId, status])
}
```

This is a **simplified starting point**, not the final production schema. The final implementation should also include the Event, TicketType, Reservation, ReservationSeat, Ticket, Payment, Organizer, and audit relationships.

---

# 39. Design Principles

SWITCH seating should follow these principles:

### 1. Separate physical seats from event inventory

```text
Seat ≠ EventSeat
```

### 2. Never trust frontend availability

Always verify on the backend.

### 3. Use Redis for temporary locks

Prevent concurrent purchases.

### 4. Use database constraints

Protect against race conditions and duplicate records.

### 5. Keep sold tickets immutable

Never modify the identity of a sold seat.

### 6. Support multiple seating models

```text
General Admission
Reserved
Mixed
```

### 7. Keep venue layouts reusable

One venue can host many events.

### 8. Support future visual seat maps

Store rendering coordinates separately from seat identity.

### 9. Make the system event-specific

Prices, availability and ticket assignments belong to the event.

### 10. Design for high concurrency

Concerts and popular events can produce thousands of simultaneous seat selections.

---

# 40. Final Architecture

The recommended SWITCH seating architecture is:

```text
                    ┌─────────────┐
                    │    Venue    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   SeatMap   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Section   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     Row     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Seat     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  EventSeat  │
                    └──────┬──────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
      ┌──────▼──────┐             ┌──────▼──────┐
      │ Reservation │             │    Ticket   │
      └─────────────┘             └─────────────┘
```

The most important relationship is:

```text
Physical Seat
     ↓
EventSeat
     ↓
Reservation
     ↓
Ticket
```

This architecture gives SWITCH a strong foundation for **concerts, conferences, cinemas, theatres, stadiums, festivals, and other ticketed events** while keeping seat inventory, reservations, payments, and ticket issuance cleanly separated.