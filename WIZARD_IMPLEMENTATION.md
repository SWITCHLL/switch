# Event Creation Wizard Implementation

## Overview
Replaced the single-form event creation with a multi-step wizard (`CreateEventWizard`) that provides a better user experience, especially on mobile devices.

## What Changed

### New Component
- **`features/organizer/components/create-event-wizard.tsx`** — Complete wizard implementation with:
  - 5-step form flow
  - Mobile-optimized UI
  - Event preview screen before submission
  - Per-step validation
  - Responsive stepper (desktop) + progress bar (mobile)

### Updated Files
- **`app/(dashboard)/dashboard/events/new/page.tsx`** — Now imports `CreateEventWizard` instead of `CreateEventForm`

### Preserved Files
- **`features/organizer/components/create-event-form.tsx`** — Original single-form still available (not deleted, in case you need it as fallback)
- **`features/organizer/actions.ts`** — No changes to server actions
- All validation logic remains the same

## Features

### Multi-Step Flow
1. **Basic Details** — Title, Description, Category, Seating Type
2. **Event Type & Dates** — Start/End times, Free/Virtual toggles, Virtual Link
3. **Location** — Venue details (skipped if virtual), capacity
4. **Sales Window** — Ticket sales open/close dates (optional)
5. **Images** — Event banner and gallery images

### Mobile Optimization
- **Small screens** — Full-width card with progress bar + step indicator
- **Tablet+** — Stepper with icon labels + larger form areas
- **Flexible layout** — Grid columns adjust based on viewport
- **Touch-friendly** — Large tap targets, adequate spacing
- **No horizontal scrolling** — All content flows vertically on mobile

### Preview Screen
- Full-page event preview before submission
- Shows all entered information in a clean, card-based layout
- Image gallery preview
- Event details grid
- Summary sidebar with step completion status
- Edit/Back button to return to form
- Submit button on preview

### Validation
- Step-by-step validation before advancing
- Field-level error messages
- Cross-field validation (e.g., end time > start time)
- Visual error indicators with red borders
- Errors cleared when user corrects the field

### Form State Management
- Single `FormState` interface with all fields
- Automatic field error clearing on change
- Controlled inputs throughout
- Easy to extend with new fields

## User Experience Flow

### Desktop (≥768px)
```
┌─────────────────────────────────────────┐
│ ✓ Details  →  Event Type  →  Location  │
│    ◆ Sales  →  Images                  │
└─────────────────────────────────────────┘
        Form Card (p-8)
  [Back] [Next / Create Event]
```

### Mobile (<768px)
```
Step 1 of 5
Basic Details
▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  20%

Form Card (p-6)
  [Next]
  [Back]
```

## Validation Rules by Step

**Step 1: Basic Details**
- Title: 3-120 chars, required
- Description: max 5000 chars
- Seating type: required

**Step 2: Event Type & Dates**
- Start date: required
- End date: must be after start date (if provided)
- Virtual events: require meeting URL with valid format

**Step 3: Location**
- In-person events: require venue name and city
- Virtual events: skip location (info message shown)

**Step 4: Sales Window**
- Sales end must be after sales start
- Sales must start before event starts

**Step 5: Images**
- Optional; can skip to preview

## Technical Details

### Form Data Structure
```typescript
interface FormState {
  // Step 1
  title: string
  description: string
  categoryId: string
  
  // Step 2
  seatingType: string
  startsAt: string
  endsAt: string
  isFree: boolean
  isVirtual: boolean
  virtualLink: string
  
  // Step 3
  venue_name: string
  venue_address: string
  venue_city: string
  venue_state: string
  capacity: string
  
  // Step 4
  salesStart: string
  salesEnd: string
  
  // Step 5
  imageUrls: string[]
}
```

### Conditional Rendering
- Venue section hidden if `isVirtual === true`
- Virtual link field shown only if `isVirtual === true`
- End date picker has `fromDate` constraint to start date
- Sales end picker has `fromDate` constraint to sales start

### Preview Customization
The preview screen displays different information based on event type:
- **Virtual events** — Shows meeting link instead of venue
- **In-person events** — Shows full venue details
- **Images** — Gallery grid with carousel preview
- **Dates** — Formatted human-readable dates

## Styling

### Design System
- Uses existing Tailwind + CSS variables from `app/globals.css`
- Colors: `brand-500`, `brand-600`, `violet-600`, `red-500`, `yellow-500`
- Spacing: 4px grid (1 = 0.25rem)
- Border radius: `rounded-xl` (0.75rem) and `rounded-2xl` (1rem)

### Mobile-First Approach
- Base styles work on mobile
- `md:` breakpoint (≥768px) for desktop enhancements
- `sm:` breakpoint (≥640px) for small tablets
- `lg:` breakpoint (≥1024px) for large screens

### Responsive Classes
- Input fields: full width on all screens
- Form sections: stack vertically on mobile, 2-column grid on tablet+
- Action buttons: flex-col-reverse on mobile (submit on bottom), row on desktop
- Stepper: hidden on mobile, visible on tablet+

## Browser Support
- Modern browsers with CSS Grid, Flexbox, CSS variables
- Touch-friendly with large hit targets (min 44px height)
- Works without JavaScript for fallback (form submits)
- Image uploads handled by existing `/api/upload/event-images`

## Next Steps (Optional Enhancements)
1. **Draft auto-save** — Periodically save form state to localStorage
2. **Form state persistence** — Recover form if page is refreshed
3. **Skip optional steps** — Allow users to skip images/sales window
4. **Template events** — Pre-fill from previous events
5. **Help tooltips** — Context-specific help for each step
6. **Accessibility** — Screen reader testing for wizard stepper

## Migration Notes
- Existing event creation logic unchanged (same server actions)
- Old `CreateEventForm` component still available if needed
- No database schema changes
- All validation logic preserved from original form
- Image uploads use same API endpoint as before
