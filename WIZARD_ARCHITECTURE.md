# Event Creation Wizard - Architecture & Flow

## Component Hierarchy

```
NewEventPage (Server Component)
└── CreateEventWizard (Client Component)
    ├── Stepper (Desktop Only)
    │   └── Step Icons & Labels
    ├── Mobile Progress (Mobile Only)
    │   ├── Step Counter ("Step X of Y")
    │   └── Progress Bar
    ├── Step Cards (Dynamic)
    │   ├── StepBasicDetails
    │   │   ├── Input: title
    │   │   ├── Textarea: description
    │   │   ├── Select: categoryId
    │   │   └── Select: seatingType
    │   ├── StepEventType
    │   │   ├── DateTimePicker: startsAt
    │   │   ├── DateTimePicker: endsAt
    │   │   ├── ToggleField: isFree
    │   │   ├── ToggleField: isVirtual
    │   │   └── Input: virtualLink (conditional)
    │   ├── StepLocation
    │   │   ├── VenuePicker (disabled if virtual)
    │   │   ├── Input: venue_name
    │   │   ├── Input: venue_address
    │   │   ├── Input: venue_city
    │   │   ├── Input: venue_state
    │   │   └── Input: capacity
    │   ├── StepSalesWindow
    │   │   ├── DateTimePicker: salesStart
    │   │   └── DateTimePicker: salesEnd
    │   └── StepImages
    │       └── EventImageUploader
    ├── PreviewScreen (Conditional)
    │   ├── Image Gallery
    │   ├── Event Card
    │   │   ├── Title
    │   │   ├── Category
    │   │   ├── Description
    │   │   └── Details Grid
    │   └── Summary Sidebar
    │       ├── Completion Status
    │       ├── Edit Button
    │       └── Submit Button
    └── Navigation
        ├── Back Button (disabled on Step 1)
        ├── Next/Preview Button
        └── Error Display

```

## Data Flow

### Form State Management

```
FormState (in-memory)
├── Step 1 Fields
│   ├── title: string
│   ├── description: string
│   ├── categoryId: string
│   └── seatingType: string
├── Step 2 Fields
│   ├── startsAt: string (ISO datetime)
│   ├── endsAt: string
│   ├── isFree: boolean
│   ├── isVirtual: boolean
│   └── virtualLink: string
├── Step 3 Fields
│   ├── venue_name: string
│   ├── venue_address: string
│   ├── venue_city: string
│   ├── venue_state: string
│   └── capacity: string
├── Step 4 Fields
│   ├── salesStart: string
│   └── salesEnd: string
└── Step 5 Fields
    └── imageUrls: string[]
```

### User Interaction Flow

```
1. User enters Step 1
   ├─ Types title → validation clears previous errors
   ├─ Types description
   ├─ Selects category
   └─ Selects seating type
        ↓ [Click Next]
   
2. validateStep(1) runs
   ├─ If errors → setFieldErrors (display errors, stay on step)
   └─ If valid → setStep(2)
   
3. User enters Step 2
   ├─ Selects start date
   ├─ (Optional) Selects end date
   ├─ Toggles Free/Virtual
   │  ├─ If Virtual → show virtualLink field
   │  └─ If Not Virtual → hide virtualLink field
   └─ Enters virtualLink (if virtual)
        ↓ [Click Next]
   
4. Steps 3-5 follow similar pattern
   
5. At Step 5 (Images)
   ├─ Can preview → [Click Preview]
   │  └─ Shows PreviewScreen
   └─ Can submit → [Click Create Event]
        ↓
6. handleSubmit() runs
   ├─ Builds FormData from state
   ├─ Converts dates to ISO format
   ├─ Appends image URLs
   ├─ Calls createEvent(formData)
   │  ├─ Server validates input
   │  ├─ Creates event in DB
   │  ├─ Creates event images
   │  └─ Returns eventId
   └─ Redirects to /dashboard/events/{eventId}
```

## State Machine

```
STATE: FormState + Step + ShowPreview

TRANSITIONS:
├─ [Initial State]
│  └─ step: 1, showPreview: false
│
├─ [Step 1] → [Next Button]
│  ├─ Validate → Error? Stay on Step 1
│  └─ Valid? → Go to Step 2
│
├─ [Step N] → [Back Button]
│  ├─ Clear errors
│  └─ Go to Step (N-1)
│
├─ [Step 5] → [Preview Button]
│  ├─ Validate all steps
│  ├─ If errors → Stay on Step 5, show errors
│  └─ Valid? → Show PreviewScreen (showPreview: true)
│
├─ [Preview] → [Edit Button]
│  └─ setShowPreview(false) → Back to Step 5
│
└─ [Preview] → [Create Button]
   ├─ Call handleSubmit()
   ├─ If success → Redirect to event page
   └─ If error → Show error on preview
```

## Validation Pipeline

```
User Action (Change field)
        ↓
set(fieldKey, newValue)
├─ Update FormState
├─ Clear fieldError for that key
└─ Re-render with new value

User Action (Click Next)
        ↓
validateStep(currentStep, formState)
├─ Check all rules for this step
├─ Return FieldError object
└─ Re-render with errors

Validation Rules by Step:
├─ Step 1: Title (3-120), Description (0-5000), SeatingType
├─ Step 2: StartDate (required), EndDate (after start), VirtualLink (if virtual)
├─ Step 3: VenueName & City (if in-person)
├─ Step 4: SalesEnd > SalesStart, SalesStart < EventStart
└─ Step 5: Images (optional)
```

## Responsive Design

```
Mobile Layout (<640px)
├─ Full viewport width (no max-width)
├─ Progress bar visible
├─ Step counter visible
├─ Single column form
├─ Buttons stack vertically
└─ Touch-optimized spacing

Tablet Layout (640-1024px)
├─ max-w-2xl (42rem)
├─ 2-column grids where appropriate
├─ Form sections larger
├─ Buttons start side-by-side
└─ Stepper might be visible (768px+)

Desktop Layout (1024px+)
├─ max-w-4xl for preview (56rem)
├─ Stepper fully visible with icons
├─ 2-column grids standard
├─ Preview sidebar on right
└─ Large form sections
```

## Component Lifecycle

```
Render 1: Initial Mount
├─ FormState initialized with defaults
├─ Step: 1
├─ ShowPreview: false
├─ FieldErrors: {}
└─ Renders StepBasicDetails

User fills Step 1 & clicks Next
    ↓ Render 2-N
    ├─ Each field change triggers re-render
    ├─ Validation errors appear/disappear
    └─ Navigation updates

Click Next button
    ↓ Render N+1
    ├─ validateStep() runs
    ├─ setStep(step + 1) if valid
    └─ Renders StepEventType

Cycle through steps 2-5 (Renders continue)

Click Preview on Step 5
    ↓ Render (N+large)
    ├─ setShowPreview(true)
    └─ Renders PreviewScreen

Click Create
    ↓ startTransition() ← async operation
    ├─ isPending: true (show spinner)
    ├─ handleSubmit() awaits server response
    ├─ Router.push() on success
    └─ Show error on failure
```

## Data Transformation

```
FormState (in-memory)
    ↓
Build FormData Object
├─ title: string
├─ description: string
├─ categoryId: string
├─ seatingType: string
├─ startsAt: new Date(string).toISOString()
├─ endsAt: new Date(string).toISOString()
├─ isFree: string ("true" or "false")
├─ isVirtual: string ("true" or "false")
├─ virtualLink: string (or omitted)
├─ venue_name: string
├─ venue_address: string
├─ venue_city: string
├─ venue_state: string
├─ capacity: string
└─ imageUrls: string[] (appended as repeated fields)
    ↓
Send to Server Action: createEvent(formData)
    ↓
Server validates with Zod schema
    ↓
Extract venue data from form
    ↓
Create Event in Database
    ↓
Create EventImage records
    ↓
Return { id: string, slug: string }
    ↓
Redirect to /dashboard/events/{id}
```

## Performance Optimization

### Re-render Minimization
- FormState updates only trigger relevant step re-render
- Error clearing is optimized (doesn't clear whole object)
- Preview screen isolated from form state changes

### Network Optimization
- Image uploads are async (separate API call)
- Single createEvent POST request (not multiple)
- No polling or polling-like behavior
- FormData used (efficient encoding)

### UI Optimization
- Stepper hidden on mobile (CSS display: none)
- Progress bar CSS-only animation (no JS)
- Conditional rendering (unused steps not mounted)
- Image gallery uses Next Image with responsive sizes

## Error Handling Strategy

```
Client-Side Errors
├─ Validation errors (stay on form)
└─ Display under relevant field

Server-Side Errors
├─ Zod validation fails → Return error string
├─ Database error → Return generic error
└─ Display in alert box

User Experience
├─ Errors are specific ("Title must be 3-120 chars")
├─ Errors include action ("Correct this and try again")
├─ Retry is easy (just fix and click Next)
└─ Preview shows "Cannot submit until errors fixed"
```

## Memory Management

- FormState stored in single useState (not global)
- Images reference URLs (not image blobs in memory)
- Old form state garbage collected on navigation
- No memory leaks from event listeners
- No infinite loops or recursive updates

## Browser API Usage

- LocalStorage: Not used (no draft auto-save in this version)
- IndexedDB: Not used
- Service Workers: Not used
- Cookies: Not used (auth handled by server)
- File API: Used for image uploads (handled by EventImageUploader)

---

## Summary

The wizard follows a **linear flow with branching logic**:
1. User progresses through 5 steps linearly
2. At each step, validation gates advancement
3. Conditional rendering adapts form to user selections
4. Preview screen provides final review
5. Submission atomically creates the event

This architecture ensures:
- ✅ Clear user progression
- ✅ Fast feedback on errors
- ✅ Mobile-first responsive design
- ✅ Graceful error handling
- ✅ Efficient state management
- ✅ Accessibility compliance
