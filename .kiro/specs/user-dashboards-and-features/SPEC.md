# User Dashboards & Platform Features

Build comprehensive user experience for attendees and organizers, including separate dashboards, seat selection UI, notifications, admin controls, and API standardization.

## Requirements

### Attendee Dashboard
- **My Tickets page** - View purchased tickets with QR codes, event details, and status
- **My Bookings page** - Track group bookings and reservations with expiration timers
- **Upcoming Events** - Calendar view of registered events with filters
- **Ticket Search/History** - Search and filter tickets by date, event, status

### Organizer Dashboard (Enhanced)
- **Event Management** - Create, edit, publish, and archive events
- **Revenue Analytics** - Charts showing sales trends, revenue by ticket type, refund analysis
- **Attendee Management** - View attendees, export lists, send communications
- **Payout Tracking** - Historical payouts with transaction details

### Seat Selection UI Component
- **Visual Seat Map** - Interactive SVG/Canvas grid showing venues
- **Real-time Availability** - Live updates of seat status
- **Section Filters** - Filter by section, seat type, or price range
- **Accessibility Features** - Keyboard navigation, ARIA labels

### Notifications System
- **Email Notifications** - Order confirmations, reminders, refund updates
- **In-App Notifications** - Toast alerts for real-time updates
- **Notification Preferences** - User settings for notification frequency
- **Template Management** - Email templates for various triggers

### Admin Controls
- **KYC Dashboard** - Review pending applications, approve/reject organizers
- **User Management** - View users, disable accounts, view transaction history
- **Dispute Resolution** - Handle refund requests and complaints
- **Platform Analytics** - Overall platform stats, user growth, revenue

### API Standardization
- **Consistent Response Format** - Standardized success/error responses across all routes
- **Request Validation** - Centralized validation middleware using Zod
- **Error Handling** - Consistent error codes, messages, and HTTP status codes
- **Rate Limiting** - Implement rate limiting on sensitive endpoints

### Error Handling & Loading States
- **Boundary Components** - Error boundaries for UI isolation
- **Skeleton Loaders** - Consistent loading states across pages
- **Retry Logic** - Automatic retry with exponential backoff
- **Optimistic Updates** - Client-side state updates before server confirmation

## Design Decisions

### Technology Choices
- **Seat Map Rendering**: SVG for scalability and accessibility (not Canvas)
- **Real-time Updates**: TanStack Query invalidation, potentially WebSockets later
- **Email Delivery**: Continue using Resend API
- **Admin Dashboard**: Built into existing (dashboard) layout with role-based access
- **Response Format**: Use existing `{ success, error?, data? }` pattern

### Architecture Patterns
- **Feature Isolation**: Keep each feature in `features/<domain>/` with public API exports
- **Server Actions for Mutations**: Use server actions for all state changes
- **RSC for Initial Load**: Server components for first-paint performance
- **Client Query Hooks**: TanStack Query for client-side caching and refetching

### Data Flow
```
User Event (click, submit)
    ↓
Client Component calls server action
    ↓
Server action validates + authenticates
    ↓
Database transaction
    ↓
Response with { success, error?, data? }
    ↓
Client updates state + invalidates queries
    ↓
UI re-renders
```

## Success Criteria

- [ ] Attendees can view all purchased tickets with working QR codes
- [ ] Organizers can see dashboard with revenue charts and attendee counts
- [ ] Seat selection UI is interactive and responsive on desktop/mobile
- [ ] Confirmation emails send automatically after ticket purchase
- [ ] Admin can review and approve/reject organizer applications
- [ ] All API responses follow consistent format
- [ ] Error states show helpful messages to users
- [ ] Loading states display while fetching data
- [ ] No race conditions in concurrent seat selection
- [ ] All user actions are audit-logged in admin dashboard

## Tasks

---

### 1. Attendee Dashboard - My Tickets Page

**Objective**: Create a functional page where users see their purchased tickets with QR codes, event details, and filtering options.

**Details**:
- Display all tickets owned by the current user with event name, date, seat info, and ticket status
- Show QR code (scannable) for each ticket
- Filter by status (ACTIVE, USED, REFUNDED, CANCELLED)
- Filter by date range
- Show ticket number and purchase date
- Link to event details page
- "Download ticket as PDF" button (future enhancement)

**Files to Create/Modify**:
- `features/tickets/pages/my-tickets.tsx` (new RSC page component)
- `app/(dashboard)/dashboard/tickets/page.tsx` (new route)
- `features/tickets/queries.ts` (new query: `getUserTicketsWithEvents()`)
- `features/tickets/components/ticket-card.tsx` (new component)
- `features/tickets/components/tickets-filter.tsx` (new component)

**Acceptance Criteria**:
- [ ] Tickets load on page mount
- [ ] QR code is scannable (contains ticket ID)
- [ ] Filters work and persist in URL params
- [ ] Responsive on mobile (cards stack, QR smaller)
- [ ] No performance issues with 100+ tickets

---

### 2. Attendee Dashboard - My Bookings Page

**Objective**: Show group booking history with slots, expiration status, and booking details.

**Details**:
- List all group bookings initiated by user
- Show organizer name, event, number of slots
- Show expiration time with countdown if PENDING
- Show status (PENDING, COMPLETE, EXPIRED, CANCELLED)
- Link to event details
- "View slots" expands to show individual slot status
- "Cancel booking" button for PENDING bookings

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/bookings/page.tsx` (new route)
- `features/group-booking/queries.ts` (enhance or create: `getUserGroupBookings()`)
- `features/group-booking/components/booking-card.tsx` (new)
- `features/group-booking/components/booking-slots-list.tsx` (new)

**Acceptance Criteria**:
- [ ] Bookings load and display correctly
- [ ] Countdown timer updates for expiring bookings
- [ ] Expanding slots shows detailed status
- [ ] Cancel button works and updates status

---

### 3. Organizer Dashboard - Event Management Page

**Objective**: Allow organizers to create, view, edit, and publish events from a centralized page.

**Details**:
- Table/grid view of all organizer's events
- Show event name, date, status (DRAFT/PUBLISHED/CANCELLED/COMPLETED), ticket types count, sales count
- "Create event" button opens dialog/redirect to creation form
- "Edit" button links to event editor
- "View analytics" button links to event analytics page
- "Publish" button for DRAFT events
- "Archive" button to cancel event
- Search and filter by status/date range
- Pagination if 50+ events

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/events/page.tsx` (enhance existing)
- `features/organizer/components/events-table.tsx` (new)
- `features/organizer/components/event-actions-menu.tsx` (new)
- `features/organizer/queries.ts` (enhance: `getOrganizerEventsWithStats()`)

**Acceptance Criteria**:
- [ ] All events display in table
- [ ] Actions (edit, publish, archive) work
- [ ] Filters and search work correctly
- [ ] Performance is acceptable with 100+ events

---

### 4. Organizer Dashboard - Analytics Page (Enhanced)

**Objective**: Display sales trends, revenue breakdown, and attendee insights.

**Details**:
- 30-day revenue chart (line graph with Recharts)
- Pie chart: revenue by ticket type
- Stats cards: total sales, total revenue, ticket types count, avg ticket price
- Table: top events by revenue
- Refund stats: total refunds, refund rate %
- Attendee growth chart (7-day or 30-day)
- Export button to download analytics as CSV

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/analytics/page.tsx` (enhance existing)
- `features/organizer/components/revenue-chart.tsx` (new)
- `features/organizer/components/ticket-type-breakdown.tsx` (new)
- `features/organizer/components/top-events-table.tsx` (new)
- `features/organizer/queries.ts` (enhance: aggregation queries)

**Dependencies**: Recharts or similar charting library

**Acceptance Criteria**:
- [ ] Charts load and display data correctly
- [ ] Stats cards show accurate numbers
- [ ] CSV export includes all relevant data
- [ ] Performance acceptable (charts don't lag)

---

### 5. Seat Selection UI Component - Interactive Seat Map

**Objective**: Build a reusable, interactive seat map component for event checkout flow.

**Details**:
- Render SVG-based seat grid from EventSeat + Seat data
- Show sections, rows, and individual seats
- Color-code seats by status: AVAILABLE (green), HELD (yellow), SOLD (gray), BLOCKED (black)
- Color-code by seat type: STANDARD, VIP, VVIP with different shades
- Click seat to select/deselect (with state in parent component)
- Show selected seats count and total price
- Legend explaining colors and seat types
- Keyboard navigation (arrow keys to move between seats)
- Touch support for mobile
- Zoom/pan controls for large seat maps
- Filter sections by name

**Files to Create/Modify**:
- `features/checkout/components/seat-map.tsx` (new - core component)
- `features/checkout/components/seat-map-legend.tsx` (new)
- `features/checkout/components/seat-map-section.tsx` (new - sub-component)
- `features/checkout/types.ts` (enhance: add seat map rendering types)
- `features/checkout/utils.ts` (new: helpers for seat positioning, color mapping)

**Component Props**:
```ts
interface SeatMapProps {
  eventId: string
  seatMap: SeatMapWithSeating // includes sections, rows, seats
  selectedSeats: Set<string> // eventSeat IDs
  onSeatSelect: (eventSeatId: string, isSelected: boolean) => void
  onSectionFilter?: (sectionId: string) => void
  disabled?: boolean
}
```

**Acceptance Criteria**:
- [ ] Seats render correctly in grid layout
- [ ] Clicking seat toggles selection
- [ ] Status colors display correctly
- [ ] Keyboard navigation works (Tab, Arrow keys)
- [ ] Mobile touch interactions work
- [ ] Zoom/pan works on large maps
- [ ] Performance acceptable with 1000+ seats
- [ ] Accessible (ARIA labels, focus indicators)

---

### 6. Notifications System - Email Templates & Queue

**Objective**: Set up email notification system with templates for key events.

**Details**:
- **Triggers**:
  - Order confirmation (ticket purchased)
  - Refund processed
  - Event reminder (day before, if opted in)
  - Group booking expiring (24h before)
  - Payment failed
- **Template system**: Email templates in `/emails/` with dynamic variables
- **Queue integration**: Use BullMQ to queue emails (already in stack)
- **Preferences**: User can set notification frequency (all, daily digest, none)

**Files to Create/Modify**:
- `lib/email.ts` (enhance: add template function)
- `emails/order-confirmation.tsx` (new - React Email template)
- `emails/refund-processed.tsx` (new)
- `emails/event-reminder.tsx` (new)
- `emails/group-booking-expiring.tsx` (new)
- `features/notifications/actions.ts` (new: `enqueueEmail()` server action)
- `features/notifications/types.ts` (new)
- `workers/email-worker.ts` (new or enhance if exists)

**Acceptance Criteria**:
- [ ] Templates render correctly
- [ ] Emails queue on purchase
- [ ] Queue processes emails
- [ ] Variables interpolate correctly
- [ ] Unsubscribe link works

---

### 7. Notifications System - In-App Toast Alerts

**Objective**: Add toast notifications for real-time user feedback.

**Details**:
- Use shadcn/ui Toast component or Sonner
- Trigger toasts on:
  - Ticket purchase success
  - Reservation expiring (warning)
  - Seat unavailable (error)
  - Payment failed (error)
  - Refund processed (success)
- Auto-dismiss after 5 seconds
- Show close button
- Stacking multiple toasts
- Position: top-right or bottom-right

**Files to Create/Modify**:
- `components/ui/toaster.tsx` (if not exists - shadcn component)
- `lib/toast.ts` (new: toast helper functions)
- `features/checkout/actions.ts` (integrate: call toast on reservation)
- `features/payments/actions.ts` (integrate: toast on payment)

**Acceptance Criteria**:
- [ ] Toasts display on key events
- [ ] Auto-dismiss works
- [ ] Multiple toasts don't overlap badly
- [ ] Close button works
- [ ] Accessible (ARIA roles)

---

### 8. Admin Dashboard - KYC Review Page

**Objective**: Allow admins to review pending organizer applications and approve/reject.

**Details**:
- List all organizer applications with PENDING status
- Show applicant name, email, submission date, KYC status
- "View details" opens modal/sidebar with full application info
- **In modal**:
  - Applicant personal info
  - Business info
  - Verification documents (if uploaded)
  - Admin can approve (sets status to ACTIVE) or reject (sets to REJECTED) with reason
  - Activity log showing previous actions
- Filter by submission date, KYC status
- Pagination (25 per page)

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/admin/kyc-review/page.tsx` (new)
- `features/admin/components/kyc-applications-table.tsx` (new)
- `features/admin/components/kyc-detail-modal.tsx` (new)
- `features/admin/actions.ts` (new: `approveOrganizerApplication()`, `rejectOrganizerApplication()`)
- `features/admin/queries.ts` (new: `getPendingApplications()`)

**Acceptance Criteria**:
- [ ] Table loads with pending applications
- [ ] Modal opens and shows full details
- [ ] Approve/reject works and updates status
- [ ] Activity log tracks actions
- [ ] Rejection reason is required

---

### 9. Admin Dashboard - User Management Page

**Objective**: Allow admins to view users, search, and manage account status.

**Details**:
- Table of all users with columns: ID, email, role, created date, status, actions
- Search by email or user ID
- Filter by role (USER, ORGANIZER, ADMIN)
- Filter by created date range
- **Actions**:
  - View user details (tickets, bookings, payment history)
  - Disable/enable account
  - Change role (promote to organizer, etc.)
  - View audit log
- Pagination
- Export user list to CSV

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/admin/users/page.tsx` (new)
- `features/admin/components/users-table.tsx` (new)
- `features/admin/components/user-detail-modal.tsx` (new)
- `features/admin/actions.ts` (enhance: user management actions)
- `features/admin/queries.ts` (enhance: `getAllUsers()`, `getUserDetails()`)

**Acceptance Criteria**:
- [ ] Users table loads with pagination
- [ ] Search and filter work
- [ ] Role change works
- [ ] Disable/enable account works
- [ ] CSV export includes all users

---

### 10. Admin Dashboard - Dispute Resolution Page

**Objective**: Handle refund requests, complaints, and disputes.

**Details**:
- Table of all refund requests with status
- Show requestor, event, reason, amount, request date
- Statuses: PENDING, APPROVED, REJECTED, PROCESSED
- Filter by status and date range
- "View details" opens modal with:
  - Full request details
  - Original ticket/payment info
  - Admin can approve/reject with comment
  - Once approved, admin clicks "Process refund" to initiate payment
- Track refund payment status

**Files to Create/Modify**:
- `app/(dashboard)/dashboard/admin/disputes/page.tsx` (new)
- `features/admin/components/disputes-table.tsx` (new)
- `features/admin/components/dispute-detail-modal.tsx` (new)
- `features/admin/actions.ts` (enhance: `approveRefund()`, `processRefund()`)
- `features/admin/queries.ts` (enhance: `getRefundRequests()`)

**Acceptance Criteria**:
- [ ] Disputes table loads with all requests
- [ ] Modal shows full details
- [ ] Approve/reject works
- [ ] Process refund initiates Paystack transaction
- [ ] Status updates in real-time

---

### 11. API Standardization - Response Format & Middleware

**Objective**: Standardize all API responses and add validation/error middleware.

**Details**:
- **Response format**:
  ```ts
  {
    success: boolean
    data?: T
    error?: {
      code: string
      message: string
      details?: any
    }
  }
  ```
- **Error codes**: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, SERVER_ERROR, etc.
- **Status codes**: Use correct HTTP status codes (200, 400, 401, 403, 404, 500, etc.)
- **Middleware**:
  - Request validation (Zod schemas)
  - Authentication check
  - Authorization check (role-based)
  - Error handling (catch all errors, log, return formatted response)
  - Rate limiting on sensitive endpoints
- **Server Actions**: Update existing server actions to follow format consistently
- **API Routes**: Ensure all `/app/api/*` routes follow format

**Files to Create/Modify**:
- `lib/api.ts` (new: response helpers, middleware)
- `lib/error-handler.ts` (new: error formatting)
- `lib/validators.ts` (new: centralized Zod schemas)
- `features/*/actions.ts` (update all to consistent format)
- `app/api/*` (update all to consistent format and status codes)

**Acceptance Criteria**:
- [ ] All responses follow format
- [ ] HTTP status codes are correct
- [ ] Validation errors include field details
- [ ] Authentication/authorization checks work
- [ ] Rate limiting blocks excessive requests
- [ ] Errors are logged for debugging

---

### 12. Error Handling - Error Boundaries & Fallbacks

**Objective**: Add error boundaries and fallback UI for graceful error handling.

**Details**:
- **Global error boundary**: Catch unhandled errors in entire app
- **Feature-level error boundaries**: Catch errors in specific feature areas
- **API error fallback**: Show error message if data fetch fails
- **Retry logic**: Add retry button on error states
- **Logging**: Log errors to monitoring service (if available)

**Files to Create/Modify**:
- `app/error.tsx` (enhance existing or create if missing)
- `app/(dashboard)/error.tsx` (new - dashboard error boundary)
- `components/error-boundary.tsx` (new - reusable error boundary)
- `lib/sentry.ts` (new - if using error monitoring)

**Acceptance Criteria**:
- [ ] Global errors show friendly message, not white screen
- [ ] Feature errors don't crash entire page
- [ ] Retry button works
- [ ] Errors logged for debugging

---

### 13. Loading States - Skeleton Loaders & Spinners

**Objective**: Add consistent loading UI across pages and components.

**Details**:
- **Skeleton components**: Use shadcn Skeleton for content placeholders
- **Page-level loaders**: Show skeleton layout while RSC data loads
- **Component-level loaders**: Show spinner while client query loads
- **Patterns**:
  - Table skeleton (rows of boxes)
  - Card skeleton (multiple cards loading)
  - Chart skeleton (empty chart outline)

**Files to Create/Modify**:
- `components/skeletons/table-skeleton.tsx` (new)
- `components/skeletons/card-skeleton.tsx` (new)
- `components/skeletons/chart-skeleton.tsx` (new)
- `features/*/components/` (integrate skeletons in list/table pages)
- `lib/suspense.ts` (new: Suspense boundary helpers if needed)

**Acceptance Criteria**:
- [ ] Loading states appear before data
- [ ] Skeletons match final layout
- [ ] No janky jumps when data loads
- [ ] Accessible (loading announced to screen readers)

---

### 14. Optimistic Updates & State Management

**Objective**: Implement optimistic updates for instant feedback on user actions.

**Details**:
- When user purchases ticket, update local state immediately
- Show "pending" state while server processes
- Revert if server returns error
- Use TanStack Query `optimisticData`
- Apply to: ticket purchase, seat selection, reservation actions

**Files to Create/Modify**:
- `features/checkout/hooks.ts` (new: custom hooks with optimistic logic)
- `features/checkout/actions.ts` (ensure proper error handling for reverts)

**Acceptance Criteria**:
- [ ] Seat selection updates immediately on click
- [ ] Ticket purchase shows loading, then success
- [ ] Errors revert optimistic state
- [ ] No race conditions

---

## Implementation Order

1. **Phase 1** (Core): Tasks 1, 2, 3, 4 - Get dashboards working
2. **Phase 2** (Interaction): Tasks 5, 6, 7 - Seat selection and notifications
3. **Phase 3** (Admin): Tasks 8, 9, 10 - Admin controls
4. **Phase 4** (Polish): Tasks 11, 12, 13, 14 - API standardization and UX refinement

## Notes

- Each task should be implemented as a feature following the modular monolith pattern
- Use existing patterns: server actions for mutations, queries for reads, Zod for validation
- Maintain TypeScript strict mode and ESLint compliance
- All new code should have proper error handling and logging
- Test key flows manually before marking complete
- Keep database queries optimized with `select` clauses

---

