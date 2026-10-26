# Event Creation Wizard - Responsive Design Guide

## Overview

The wizard is built with a **mobile-first approach**, meaning:
1. Base styles work on small screens
2. Tablet enhancements at 640px breakpoint
3. Desktop features at 768px breakpoint
4. Large screen optimizations at 1024px breakpoint

---

## Mobile View (< 640px)

### Layout
```
┌─────────────────────────────────────┐
│ Step 1 of 5                         │
│ Basic Details                       │
│                                     │
│ ████░░░░░░░░░░░░░░░░░░░░░░░ 20%   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Event Title                         │
│ [Full-width input field]            │
│                                     │
│ Description                         │
│ [Full-width textarea]               │
│                                     │
│ Category                            │
│ [Full-width select]                 │
│                                     │
│ Seating Type *                      │
│ [Full-width select]                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [NEXT - Full Width]                 │
│ [BACK - Full Width]                 │
│                                     │
└─────────────────────────────────────┘
```

### Key Features
- ✅ Full viewport width (minus safe padding)
- ✅ Single column layout (no grids)
- ✅ Progress bar at top (animated on step change)
- ✅ Step counter for clarity
- ✅ Large touch targets (minimum 44px height)
- ✅ Buttons stack vertically
- ✅ Submit button on top (most important), Back below

### Spacing
```
Card Padding:    p-6 (1.5rem = 24px)
Field Gap:       5 (1.25rem = 20px)
Button Gap:      3 (0.75rem = 12px)
Input Height:    py-2.5 (0.625rem × 2 = 20px content)
```

### Typography
```
Step Counter:    text-[13px]
Field Labels:    text-[13px]
Form Inputs:     text-[14px]
Hints:           text-[12px]
Errors:          text-[11.5px]
Button Text:     text-[13.5px] font-semibold
```

### Example: Mobile Step 1

```
┌──────────────────────────────┐
│ Step 1 of 5                  │
│ Basic Details                │
│                              │
│ ████░░░░░░░░░░░░░░ 20%      │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Event Title *                │
│ ┌──────────────────────────┐ │
│ │ e.g. Concert name        │ │
│ └──────────────────────────┘ │
│                              │
│ Description                  │
│ ┌──────────────────────────┐ │
│ │ Tell attendees what to   │ │
│ │ expect...                │ │
│ │                          │ │
│ └──────────────────────────┘ │
│ Max 5000 characters          │
│                              │
│ Category                     │
│ ┌──────────────────────────┐ │
│ │ Select category    ▼     │ │
│ └──────────────────────────┘ │
│                              │
│ Seating Type *               │
│ ┌──────────────────────────┐ │
│ │ General Admission  ▼     │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [NEXT →]                     │
│ [← BACK]                     │
└──────────────────────────────┘
```

---

## Tablet View (640px - 1024px)

### Layout
```
┌─────────────────────────────────────┐
│ Step 1 of 5                         │
│ Basic Details                       │
│                                     │
│ ████░░░░░░░░░░░░░░░░░░░░░░░ 20%   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Event Title *                       │
│ [Full-width input]                  │
│                                     │
│ Description                         │
│ [Full-width textarea]               │
│                                     │
│ [Category]  [Seating Type]          │
│                                     │
│ [Select *]  [Select *]              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [BACK]     [NEXT →]                 │
│                                     │
└─────────────────────────────────────┘
```

### Key Features
- ✅ Max-width constrained (max-w-2xl = 42rem = 672px)
- ✅ 2-column grids for related fields
- ✅ Progress bar still visible
- ✅ Better use of horizontal space
- ✅ Buttons start side-by-side
- ✅ Touch targets still 44px+
- ✅ Stepper hidden (md:hidden)

### Spacing
```
Card Padding:    p-6 md:p-8
Field Gap:       4 md:5 (when 2-column)
Column Gap:      4 (when side-by-side)
```

### Grid Breakpoint
```
Default:  grid-cols-1 (single column)
@640px:   grid-cols-2 (two columns) — sm:grid-cols-2
```

---

## Desktop View (≥ 1024px)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Details  →  Event Type  →  Location  ◇ Sales  →  Images │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐
│ Basic Details                      │
│ Tell us about your event           │
│                                    │
│ Event Title *                      │
│ [Full-width input]                 │
│                                    │
│ Description                        │
│ [Full-width textarea]              │
│                                    │
│ [Category]      [Seating Type]     │
│ [Select]        [Select]           │
│                                    │
├────────────────────────────────────┤
│                                    │
│ [BACK]  [PREVIEW]  [NEXT →]        │
│                                    │
└────────────────────────────────────┘
```

### Key Features
- ✅ Full stepper visible with icons and labels
- ✅ Visual progress (✓ completed, ◆ in progress, ○ pending)
- ✅ Larger form card (max-w-2xl = 42rem)
- ✅ Comfortable spacing throughout
- ✅ 2-column grids standard
- ✅ Side-by-side buttons
- ✅ All form elements clearly visible

### Stepper Design

```
Step Indicator:
┌─────┐         ┌─────────┐         ┌─────────┐
│  ✓  │ FileText│    ○    │   Tag   │    □    │
│Done │ Details │ Active  │ Type    │ Pending │
└─────┘─────────┴─────────┴─────────┴─────────┘
 ←─────← Line between steps →─────→
```

**Styling:**
```
Done:     bg-brand-500 border-brand-500 text-white ✓
Active:   bg-brand-500/10 border-brand-500 text-brand-400
Pending:  bg-transparent border-border text-muted-foreground
Line:     h-px bg-brand-500 (if done) / bg-border (if pending)
```

---

## Large Screen View (≥ 1280px)

### Preview Screen Layout
```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  [Image Gallery]        │  ┌──────────────────────────────┐ │
│  ├─ Main image         │  │ Summary                       │ │
│  ├─ [Thumb] [Thumb]    │  │ ✓ Basic Details              │ │
│  │ [Thumb] [Thumb]     │  │ ✓ Event Type                 │ │
│                         │  │ ✓ Location                   │ │
│  Event Card            │  │ ✓ Sales Window               │ │
│  ┌───────────────────┐ │  │ ✓ Images                     │ │
│  │ Event Title       │ │  │                              │ │
│  │ Category: [Brand] │ │  │ [CREATE EVENT - Full width] │ │
│  │                   │ │  │ [EDIT]                       │ │
│  │ Description...    │ │  └──────────────────────────────┘ │
│  │                   │ │                                     │
│  │ Details Grid      │ │                                     │
│  │ Date | Mar 15     │ │                                     │
│  │ Type | In-Person  │ │                                     │
│  │ Loc  | Lagos      │ │                                     │
│  └───────────────────┘ │                                     │
│                         │                                     │
└──────────────────────────────────────────────────────────────┘
```

### Key Features
- ✅ 3-column layout (image, details, sidebar)
- ✅ Sidebar sticky on scroll
- ✅ Image gallery takes up left 2 columns
- ✅ Summary sidebar on right
- ✅ Clear visual hierarchy

---

## Responsive Breakpoints Reference

### Tailwind Breakpoints Used

```
Mobile     < 640px    (default, no prefix)
Tablet     ≥ 640px    (sm: prefix)
Small MD   ≥ 768px    (md: prefix) ← Key transition point
Large MD   ≥ 1024px   (lg: prefix)
XL         ≥ 1280px   (xl: prefix)
```

### Component Visibility

| Component | Mobile | Tablet | Desktop | XL |
|-----------|--------|--------|---------|-----|
| Stepper | hidden | hidden | visible | visible |
| Progress bar | visible | visible | hidden | hidden |
| Step counter | visible | visible | hidden | hidden |
| Form (1 col) | visible | — | — | — |
| Form (2 col) | — | visible | visible | visible |
| Button stack | vertical | horizontal | horizontal | horizontal |
| Preview sidebar | — | — | visible | visible |

---

## Typography Scaling

### Mobile
```
Heading 2 (Step title):   text-[18px]
Label:                    text-[13px]
Input text:               text-[14px]
Helper text:              text-[11.5px]
Error text:               text-[11.5px]
Button text:              text-[13.5px]
```

### Desktop
```
Heading 2 (Step title):   text-[18px] (no change)
Label:                    text-[13px] (no change)
Input text:               text-[14px] (no change)
Helper text:              text-[11.5px] (no change)
Error text:               text-[11.5px] (no change)
Button text:              text-[13.5px] (no change)
```

**Note:** Typography stays consistent across breakpoints (font size doesn't vary with screen size)

---

## Button Layouts

### Mobile
```
Default arrangement (all screens):
┌─────────────────────────┐
│   flex-col-reverse      │
├─────────────────────────┤
│ [NEXT - Full width]     │ ← Top (Primary action)
│ [BACK - Full width]     │ ← Bottom
└─────────────────────────┘
```

### Desktop+
```
@768px and above:
┌────────────────────────────────────┐
│   flex-row                         │
├────────────────────────────────────┤
│ [BACK] ... [PREVIEW] [NEXT]        │
└────────────────────────────────────┘
```

---

## Form Grid Patterns

### Single Column (Default)
```css
.grid {
  grid-template-columns: 1fr; /* Mobile */
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: 1fr 1fr; /* Tablet+ */
    gap: 1rem;
  }
}
```

### Two Column With Gaps
```
Mobile (1 col, 20px gap):
┌──────────────────┐
│ [Field 1]        │
├──────────────────┤
│ [Field 2]        │
└──────────────────┘

Tablet (2 col, 16px gap):
┌──────────┬──────────┐
│ [Field 1] | [Field 2] │
└──────────┴──────────┘
```

---

## Touch Target Sizing

All interactive elements follow mobile-first touch target guidelines:

```
Minimum Touch Target:  44px × 44px
Recommended:           48px × 48px

Our Implementation:
├─ Button height:      py-2.5 = 20px content + padding = ~40px
├─ Input height:       py-2.5 = 20px content + padding = ~40px
├─ Toggle height:      ~20px (within larger container)
└─ All clickable areas: >44px when including padding
```

---

## Safe Area Padding

```
Mobile Layout:
┌─ 4px safe (px-4 = 1rem = 16px)
├─ Content width: 100vw - 32px
└─ Card width: calc(100vw - 32px)

Tablet Layout:
┌─ 0px safe (px-0 = no padding)
├─ Content max-width: 42rem (672px)
└─ Centered with margin auto

Desktop Layout:
├─ max-w-2xl: 42rem (672px)
└─ Centered with auto margins
```

---

## Responsive Images

### Preview Screen Gallery

```
Mobile:
┌──────────────────┐
│  Main Image      │ ← Full width, 16:9 aspect
│  16:9 aspect     │
└──────────────────┘
[3 thumbnails in row]
┌──┬──┬──┐
│1 │2 │3 │
└──┴──┴──┘

Tablet:
┌────────────────────┐
│    Main Image      │ ← Full width, 16:9 aspect
└────────────────────┘
[Up to 4 thumbnails in row]
┌────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │
└────┴────┴────┴────┘

Desktop:
├─ Main: 2/3 width
├─ Thumbnails below
└─ 3 per row
```

---

## Print Styling (Bonus)

Not explicitly implemented, but considerations:

```
✅ Form elements hide for print (display: none)
✅ Preview screen formats well on paper
✅ Images scale appropriately
✅ Text colors convert to grayscale
✅ Links show URLs
```

---

## Accessibility Considerations

### Keyboard Navigation
- Tab order: Top to bottom, left to right
- Enter key: Activates buttons and toggles
- Space key: Toggles checkboxes
- Escape: (optional enhancement for modals)

### Touch Accessibility
- Touch targets ≥ 44×44px
- No hover-only functionality
- Focus states visible
- Error messages linked to inputs

### Screen Readers
- Semantic HTML headings
- Form labels associated with inputs
- Error messages announced
- Button text descriptive

---

## Performance Considerations

### Responsive Images
```
<img sizes="(max-width: 640px) 50vw, 33vw" />
├─ Mobile: 50% of viewport width
└─ Desktop: 33% of viewport width
```

### Lazy Loading
```
Images loaded only when visible (lazy loading)
Large preview images optimized with Next Image
```

### CSS Optimization
- Tailwind classes minified in production
- No unused styles shipped
- CSS variables for theming

---

## Testing Responsive Design

### Recommended Viewport Sizes

```
Mobile Testing:
├─ iPhone 12 (390px)
├─ iPhone SE (375px)
├─ Android common (360px)
└─ Small phones (280px)

Tablet Testing:
├─ iPad (768px - landscape)
├─ iPad (1024px - portrait)
└─ Android tablet (600px)

Desktop Testing:
├─ Laptop (1366px - common)
├─ Desktop (1920px - full HD)
└─ Desktop (2560px - 4K)

Edge Cases:
├─ Very narrow (320px)
└─ Very wide (3440px - ultrawide)
```

### DevTools Browser Testing

```
Chrome DevTools:
1. Press F12
2. Click device toggle (Ctrl+Shift+M)
3. Select device from dropdown
4. Test all interactions
5. Check console for errors

Manual Testing:
1. Test on real iPhone/iPad
2. Test on real Android device
3. Test on real laptop/desktop
4. Verify touch interactions work
5. Verify keyboard navigation works
```

---

## Responsive Design Checklist

- [ ] Mobile layout tested on real phone
- [ ] Tablet layout tested on real tablet
- [ ] Desktop layout tested on real monitor
- [ ] No horizontal scrolling on mobile
- [ ] All buttons easily tappable
- [ ] All text readable without zooming
- [ ] Images display correctly
- [ ] Progress bar animates smoothly
- [ ] Forms submit successfully
- [ ] Preview displays correctly
- [ ] Keyboard navigation works
- [ ] Touch gestures work
- [ ] No visual glitches or overlaps
- [ ] Spacing consistent across breakpoints
- [ ] Colors readable on all screens

---

## Summary

The Event Creation Wizard provides a **seamless experience across all devices** with:
- ✅ Mobile-first approach
- ✅ Tablet-friendly layout
- ✅ Desktop enhancements
- ✅ Large screen optimization
- ✅ Touch-friendly design
- ✅ Accessible to all users
- ✅ Fast performance
- ✅ Professional appearance
