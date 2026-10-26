# Event Creation Wizard - Examples & Edge Cases

## Example 1: Creating an In-Person Concert

### User Journey

**Step 1: Basic Details**
```
Title:        "Afrobeats Festival Lagos 2026"
Description:  "A full-day celebration of African music with live performances, 
               DJ sets, and cultural experiences. Join us for 8 hours of 
               non-stop entertainment at Lagos' biggest concert venue."
Category:     "Concerts"
Seating Type: "General Admission"
```
→ Click "Next"

**Step 2: Event Type & Dates**
```
Start Date:   March 15, 2026 10:00 AM
End Date:     March 15, 2026 6:00 PM
Free Event:   Toggle OFF (unchecked)
Virtual:      Toggle OFF (unchecked)
Meeting URL:  (hidden, not shown)
```
→ Click "Next"

**Step 3: Location**
```
Venue Name:      "Eko Atlantic Convention Center"
Address:         "14A Admiralty Road"
City:            "Lagos"
State:           "Lagos"
Capacity:        "15000"
```
→ Click "Next"

**Step 4: Sales Window**
```
Sales Open:  March 1, 2026 9:00 AM
Sales Close: March 14, 2026 11:59 PM
```
→ Click "Next"

**Step 5: Images**
```
Upload images:
1. Festival_Poster_2026.jpg (set as primary - green border)
2. Last_Year_Crowd.jpg
3. Main_Stage.jpg
4. DJ_Lineup.jpg
```
→ Click "Preview"

**Preview Screen Shows:**
```
[Large banner image: Festival_Poster_2026.jpg]

Gallery thumbnails:
[Poster] [Crowd] [Stage] [Lineup]

Title: Afrobeats Festival Lagos 2026
Category: Concerts (in brand blue)

Description: "A full-day celebration..."

DETAILS:
Date & Time:     Sat, Mar 15, 2026 10:00 AM – 6:00 PM
Type:            In-Person
Location:        Eko Atlantic Convention Center, Lagos
Address:         14A Admiralty Road
Capacity:        15,000 attendees
Seating:         General Admission
Ticket Sales:    Mar 1, 2026 – Mar 14, 2026 11:59 PM

SUMMARY:
✓ Basic Details
✓ Event Type & Dates
✓ Location
✓ Sales Window
✓ Images (4 images uploaded)

[Edit] [Create Event]
```

→ Click "Create Event"

**Result:** Event created successfully, redirects to event dashboard

---

## Example 2: Creating a Virtual Webinar (Mobile)

### Mobile User Journey (< 640px)

**Step 1 of 5**
Progress: ████░░░░░░░░░░░░░░░░░░░░░░ 20%

```
Title:        "Digital Marketing Trends 2026"
Description:  "Join industry experts discussing latest trends..."
Category:     "Webinars"
Seating Type: "General Admission"

[NEXT BUTTON - Full Width]
```

**Step 2 of 5**
Progress: ████████░░░░░░░░░░░░░░░░░░░░ 40%

```
Start Date:    April 10, 2026 2:00 PM
End Date:      (left empty)
Free Event:    Toggle ON (checked - blue)
Virtual:       Toggle ON (checked - blue)
Stream URL:    https://zoom.us/j/abc123...

[BACK] [NEXT]
```

**Step 3 of 5**
Progress: ████████████░░░░░░░░░░░░░░░░ 60%

```
(Info box with light blue background)
"Since this is a virtual event, attendees 
will join via the meeting link you provided."

[BACK] [NEXT]
```

**Step 4 of 5**
Progress: ████████████████░░░░░░░░░░░░ 80%

```
Sales Open:   (empty - optional)
Sales Close:  (empty - optional)

Info: "Set when ticket sales open and close.
Leave empty for no specific sales window."

[BACK] [NEXT]
```

**Step 5 of 5**
Progress: ████████████████████░░░░░░░░ 100%

```
(Drag & drop area)
"Drop images here or click to browse"
0 / 6 uploaded

(No images uploaded - optional)

[BACK] [PREVIEW]
```

**Preview Screen (Mobile)**
```
Event Details

(No image, light gray placeholder)

Title: Digital Marketing Trends 2026
Category: Webinars

Description: "Join industry experts..."

Date & Time: Thu, Apr 10, 2026, 2:00 PM
Type: Virtual / Online
Meeting Link: https://zoom.us/j/abc123...
Seating: General Admission

Summary:
✓ Basic Details
✓ Event Type & Dates
✓ Location
✓ Sales Window
◆ Images (optional)

[CREATE EVENT] (full width)
[EDIT]
```

**Result:** Free virtual event created, no images needed

---

## Example 3: Error Scenarios

### Error Scenario 1: Invalid Event Title

**User enters:**
```
Title:  "Hi"  (only 2 characters)
→ Click Next
```

**Validation Error:**
```
❌ Title must be at least 3 characters
(Error appears below the title field in red)
```

**User corrects:**
```
Title:  "Hi Tech Conference"  (now 19 characters)
→ Error automatically clears
→ Click Next (now works)
```

### Error Scenario 2: Invalid Date Range

**User enters:**
```
Start Date:  March 15, 2026 2:00 PM
End Date:    March 15, 2026 1:00 PM  (before start time!)
→ Click Next
```

**Validation Error:**
```
❌ End time must be after start time
(Error appears below end date field)
```

**User corrects:**
```
End Date:    March 15, 2026 6:00 PM
→ Error automatically clears
→ Click Next (now works)
```

### Error Scenario 3: Missing Venue (In-Person Event)

**User on Step 3:**
```
Venue Name:  (empty)
City:        (empty)
→ Click Next
```

**Validation Errors:**
```
❌ Venue name is required
❌ City is required
(Both fields have red borders)
```

**User corrects:**
```
Venue Name:  "Victoria Island Center"
City:        "Lagos"
→ Click Next (now works)
```

### Error Scenario 4: Virtual Link Invalid Format

**User enters:**
```
Virtual:         Toggle ON
Stream URL:      "zoom.us/meeting"  (missing https://)
→ Click Next
```

**Validation Error:**
```
❌ Please enter a valid URL (include https://)
(Error appears below URL field)
```

**User corrects:**
```
Stream URL:  "https://zoom.us/meeting/123"
→ Error clears
→ Click Next (now works)
```

### Error Scenario 5: Server Error on Submit

**User completes all steps, clicks "Create Event"**

```
Loading spinner shows...
[CREATE EVENT button disabled]
```

**Server returns error:**
```
❌ Event title must be unique in your account
(Error appears in red alert on preview)

[CREATE EVENT] (enabled again)
[EDIT]
```

**User action:**
```
Click EDIT → Back to Step 1
Change title to unique name
→ Preview → Create Event (succeeds)
```

---

## Example 4: Conditional Rendering

### In-Person Event → Virtual Toggle

**Initial State (Step 2):**
```
Virtual: OFF
↓
[Step 3] Shows all venue fields:
├─ Venue Name
├─ Address
├─ City
├─ State
└─ Capacity
```

**User toggles Virtual ON:**
```
Virtual: ON
↓
[Location Step Message]
"Since this is a virtual event, 
attendees will join via the meeting link 
you provided."
↓
Venue fields hidden (not shown, not submitted)
```

**User toggles Virtual OFF:**
```
Virtual: OFF
↓
[Step 3] Shows all venue fields again:
├─ Venue Name
├─ Address
├─ City
├─ State
└─ Capacity
```

---

## Example 5: Image Upload Workflow

**User on Step 5:**
```
[Drop zone area]
"Drop images here or click to browse"
0 / 6 uploaded
```

**Drag images into drop zone:**
```
Files detected: 4 files
→ Uploading... (spinner shown)

After upload completes:
├─ Image 1 (Primary) - green border with ★
├─ Image 2 - gray border
├─ Image 3 - gray border
└─ Image 4 - gray border

[Primary button visible on hover]
```

**User sets different primary:**
```
Hover over Image 3 → "Set as primary" button appears
Click "Set as primary"
↓
Image 3 moves to position 1 with ★
Green border moves to Image 3
```

**User removes an image:**
```
Hover over Image 2 → "Remove" button appears
Click "Remove"
↓
Image 2 deleted
Images 3 & 4 shift left
3 / 6 uploaded now
```

**User adds more images:**
```
Click [+] button or drop new files
Upload 2 more images
↓
5 / 6 uploaded
[Can add 1 more]

Try to add 2 more:
Error: "You can only add 1 more image (max 6)"
```

---

## Example 6: Desktop vs Mobile Visual Differences

### Desktop (1024px+)
```
┌─ Stepper at top with 5 steps ─────┐
│ ✓ Details → Event Type → Location │
│ Sales → Images                    │
└───────────────────────────────────┘

┌───── Form Card (max-w-2xl) ────────┐
│ Step heading                        │
│ Form fields                         │
│                                    │
│ [Back] [Preview] [Next / Create]  │
└────────────────────────────────────┘
```

### Mobile (< 640px)
```
Step 1 of 5
▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20%

┌──── Form Card ────────────┐
│ Form fields (full width)   │
│                           │
│  [NEXT BUTTON - Full]     │
│  [BACK - Full]            │
└───────────────────────────┘
```

### Tablet (640-1024px)
```
Step 1 of 5 (Indicator visible)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

┌─── Form Card (max-w-2xl) ───┐
│ Step heading                 │
│ [Col 1] [Col 2]              │
│ [Col 1] [Col 2]              │
│                              │
│ [Back]     [Preview] [Next]  │
└──────────────────────────────┘
```

---

## Example 7: Keyboard Navigation

**Tab through form:**
```
Focus: Title input
  ↓ Tab
Focus: Description textarea
  ↓ Tab
Focus: Category select
  ↓ Tab
Focus: Seating Type select
  ↓ Tab
Focus: Back button
  ↓ Tab
Focus: Next button
  ↓ Tab
Focus: Next button (stays, no more elements)
```

**Using Enter key:**
```
Focus: Toggle field (Free Event)
  ↓ Press Enter
Toggle switches ON
  ↓ Press Enter
Toggle switches OFF
```

**Using Space key:**
```
Focus: Toggle field (Virtual)
  ↓ Press Space
Toggle switches ON
```

---

## Example 8: Long Event Descriptions

**User enters very long description:**
```
Description: "Join us for an amazing evening of live music 
and entertainment. Our event features world-renowned artists 
performing hit songs from the last two decades. We have 
carefully curated an experience that includes not just music, 
but also food, drinks, and amazing company. Attendees can 
expect professional sound and lighting, comfortable seating, 
and access to premium facilities. Our venue is located in the 
heart of the city with easy parking and public transport access. 
Come early to explore our pre-show activities including artist 
meet & greets. This is an event you won't want to miss!"
```

**On Form:**
```
Textarea shows full text with scrolling
Character count shows: 687 / 5000
(Still valid)
```

**On Preview**
```
Description shown with text-wrap
(Full text visible, no truncation)

All text displays with proper line breaks
```

---

## Example 9: No Category Selected

**User skips category:**
```
Category: (left as "Select category" - empty value)
```

**Validation:**
```
Passes validation (Category is optional)
```

**On Preview:**
```
(No category badge shown)
Title displays without category tag
```

---

## Example 10: Capacity Edge Cases

**User enters capacity:**
```
Capacity: 1  ✓ (minimum)
```

**User enters capacity:**
```
Capacity: 999999  ✓ (accepted, no max)
```

**User enters capacity:**
```
Capacity: 0  ✗ (rejected, must be positive)
Capacity: -100  ✗ (rejected, must be positive)
```

**User leaves capacity empty:**
```
Capacity: (blank)  ✓ (optional, means unlimited)
```

---

## Summary

These examples show:
- ✅ Real-world event creation workflows
- ✅ Error handling and recovery
- ✅ Conditional field rendering
- ✅ Mobile vs desktop differences
- ✅ Keyboard navigation
- ✅ Edge cases and limits
- ✅ Preview screen rendering
- ✅ Form validation in action
