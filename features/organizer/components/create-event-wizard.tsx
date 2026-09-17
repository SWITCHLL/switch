'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  MapPin,
  Clock,
  Tag,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { VenuePicker } from '@/components/ui/venue-picker'
import { EventImageUploader } from '@/components/ui/event-image-uploader'
import { createEvent } from '../actions'

interface CreateEventWizardProps {
  categories: { id: string; name: string }[]
}

interface FormState {
  // Step 1: Basic Details
  title: string
  description: string
  categoryId: string

  // Step 2: Event Type & Dates
  seatingType: string
  startsAt: string
  endsAt: string
  isFree: boolean
  isVirtual: boolean
  virtualLink: string

  // Step 3: Venue & Capacity
  venue_name: string
  venue_address: string
  venue_city: string
  venue_state: string
  capacity: string

  // Step 4: Sales Window
  salesStart: string
  salesEnd: string

  // Step 5: Images
  imageUrls: string[]
}

interface FieldError {
  [key: string]: string
}

const STEPS = [
  { id: 1, label: 'Details', icon: FileText },
  { id: 2, label: 'Event Type', icon: Tag },
  { id: 3, label: 'Location', icon: MapPin },
  { id: 4, label: 'Sales', icon: Clock },
  { id: 5, label: 'Images', icon: ImageIcon },
]

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateStep(step: number, state: FormState): FieldError {
  const errors: FieldError = {}

  if (step === 1) {
    if (!state.title.trim()) {
      errors.title = 'Event title is required'
    } else if (state.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters'
    } else if (state.title.trim().length > 120) {
      errors.title = 'Title must be at most 120 characters'
    }
    if (state.description && state.description.length > 5000) {
      errors.description = 'Description must be at most 5000 characters'
    }
  }

  if (step === 2) {
    if (!state.seatingType) {
      errors.seatingType = 'Please select a seating type'
    }
    if (!state.startsAt) {
      errors.startsAt = 'Event start date & time is required'
    }
    if (state.endsAt && state.startsAt && new Date(state.endsAt) <= new Date(state.startsAt)) {
      errors.endsAt = 'End time must be after start time'
    }
    if (state.isVirtual && !state.virtualLink.trim()) {
      errors.virtualLink = 'Virtual event must have a meeting/stream URL'
    }
    if (state.isVirtual && state.virtualLink) {
      try {
        new URL(state.virtualLink)
      } catch {
        errors.virtualLink = 'Please enter a valid URL (include https://)'
      }
    }
  }

  if (step === 3 && !state.isVirtual) {
    if (!state.venue_name?.trim()) {
      errors.venue_name = 'Venue name is required'
    }
    if (!state.venue_city?.trim()) {
      errors.venue_city = 'City is required'
    }
  }

  if (step === 4) {
    if (state.salesStart && state.salesEnd) {
      if (new Date(state.salesEnd) <= new Date(state.salesStart)) {
        errors.salesEnd = 'Sales end must be after sales start'
      }
    }
    if (state.salesStart && state.startsAt) {
      if (new Date(state.startsAt) <= new Date(state.salesStart)) {
        errors.salesStart = 'Sales must start before event starts'
      }
    }
  }

  return errors
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateEventWizard({ categories }: CreateEventWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState('')

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    categoryId: '',
    seatingType: 'GENERAL_ADMISSION',
    startsAt: '',
    endsAt: '',
    isFree: false,
    isVirtual: false,
    virtualLink: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    capacity: '',
    salesStart: '',
    salesEnd: '',
    imageUrls: [],
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function handleNext() {
    const errors = validateStep(step, form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    if (step < STEPS.length) {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    setFieldErrors({})
    setStep((s) => s - 1)
  }

  function handlePreview() {
    const errors = validateStep(step, form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setShowPreview(true)
  }

  async function handleSubmit() {
    setSubmitError('')

    const fd = new FormData()
    fd.set('title', form.title)
    fd.set('description', form.description)
    if (form.categoryId) fd.set('categoryId', form.categoryId)
    fd.set('seatingType', form.seatingType)
    fd.set('startsAt', new Date(form.startsAt).toISOString())
    if (form.endsAt) fd.set('endsAt', new Date(form.endsAt).toISOString())
    if (form.salesStart) fd.set('salesStart', new Date(form.salesStart).toISOString())
    if (form.salesEnd) fd.set('salesEnd', new Date(form.salesEnd).toISOString())
    if (form.capacity) fd.set('capacity', form.capacity)

    fd.set('isFree', String(form.isFree))
    fd.set('isVirtual', String(form.isVirtual))

    if (form.isVirtual) {
      fd.set('virtualLink', form.virtualLink)
    } else {
      fd.set('venue_name', form.venue_name)
      fd.set('venue_address', form.venue_address)
      fd.set('venue_city', form.venue_city)
      fd.set('venue_state', form.venue_state)
    }

    form.imageUrls.forEach((url) => fd.append('imageUrls', url))

    startTransition(async () => {
      const result = await createEvent(fd)
      if (result.success) {
        router.push(`/dashboard/events/${result.data.id}`)
      } else {
        setSubmitError(result.error)
      }
    })
  }

  if (showPreview) {
    return (
      <PreviewScreen
        form={form}
        categories={categories}
        onBack={() => setShowPreview(false)}
        onSubmit={handleSubmit}
        isPending={isPending}
        error={submitError}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* ── Stepper (Hidden on mobile, visible on tablet+) ── */}
      <div className="mb-8 hidden overflow-x-auto md:block">
        <div className="flex items-center justify-center gap-0 min-w-min">
          {STEPS.map((s, i) => {
            const isDone = step > s.id
            const isActive = step === s.id
            const Icon = s.icon

            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isDone
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : isActive
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-border text-muted-foreground'
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isActive ? 'text-brand-400' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 mb-5 h-px w-8 transition-colors md:w-12',
                      step > s.id ? 'bg-brand-500' : 'bg-border'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile Step Indicator ── */}
      <div className="mb-6 md:hidden flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">
          Step {step} of {STEPS.length}
        </span>
        <span className="text-[12px] text-foreground font-medium">{STEPS[step - 1]?.label}</span>
      </div>

      {/* ── Mobile Progress Bar ── */}
      <div className="mb-6 md:hidden h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-violet-600 transition-all duration-300"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      {/* ── Card ── */}
      <div className="border-border bg-surface rounded-2xl border p-6 md:p-8">
        {step === 1 && <StepBasicDetails form={form} set={set} errors={fieldErrors} categories={categories} />}
        {step === 2 && <StepEventType form={form} set={set} errors={fieldErrors} />}
        {step === 3 && <StepLocation form={form} set={set} errors={fieldErrors} isVirtual={form.isVirtual} />}
        {step === 4 && <StepSalesWindow form={form} set={set} errors={fieldErrors} />}
        {step === 5 && <StepImages form={form} set={set} errors={fieldErrors} />}

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 md:flex-row">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-medium transition-colors',
              step === 1
                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                : 'text-foreground border-border hover:bg-muted border'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex w-full items-center gap-3 md:w-auto">
            {step === STEPS.length && (
              <button
                type="button"
                onClick={() => handlePreview()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            )}
            <button
              type="button"
              onClick={step === STEPS.length ? handleSubmit : handleNext}
              disabled={isPending}
              className={cn(
                'flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
                isPending
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === STEPS.length ? 'Create Event' : 'Next'}
              {step < STEPS.length && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step Components ──────────────────────────────────────────────────────────

interface StepProps {
  form: FormState
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  errors: FieldError
}

function StepBasicDetails({
  form,
  set,
  errors,
  categories,
}: StepProps & { categories: { id: string; name: string }[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold">Event Details</h2>
        <p className="text-muted-foreground text-[13px] mt-1">Tell us about your event</p>
      </div>

      <Field label="Event Title" required error={errors.title}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={120}
          placeholder="e.g. Afrobeats Live Concert Lagos"
          className={inputCls(!!errors.title)}
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Tell attendees what to expect…"
          className={cn(inputCls(!!errors.description), 'resize-none')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className={selectCls(false)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seating Type" required error={errors.seatingType}>
          <select
            value={form.seatingType}
            onChange={(e) => set('seatingType', e.target.value)}
            className={selectCls(!!errors.seatingType)}
          >
            <option value="GENERAL_ADMISSION">General Admission</option>
            <option value="RESERVED">Reserved Seating</option>
            <option value="MIXED">Mixed</option>
          </select>
        </Field>
      </div>
    </div>
  )
}

function StepEventType({ form, set, errors }: StepProps) {
  const startsAtDate = form.startsAt ? new Date(form.startsAt) : undefined

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold">Event Type & Dates</h2>
        <p className="text-muted-foreground text-[13px] mt-1">When & how will your event happen?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start Date & Time" required error={errors.startsAt}>
          <DateTimePicker
            value={form.startsAt}
            onChange={(v) => set('startsAt', v)}
            placeholder="Pick start date & time"
          />
        </Field>

        <Field label="End Date & Time" error={errors.endsAt}>
          <DateTimePicker
            value={form.endsAt}
            onChange={(v) => set('endsAt', v)}
            placeholder="Pick end date & time"
            fromDate={startsAtDate}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Free Event"
          hint="All tickets are free"
          checked={form.isFree}
          onChange={(v) => set('isFree', v)}
        />
        <ToggleField
          label="Virtual / Online"
          hint="Attendees join remotely"
          checked={form.isVirtual}
          onChange={(v) => set('isVirtual', v)}
        />
      </div>

      {form.isVirtual && (
        <Field label="Stream / Meeting URL" error={errors.virtualLink}>
          <input
            value={form.virtualLink}
            onChange={(e) => set('virtualLink', e.target.value)}
            type="url"
            placeholder="https://meet.example.com/…"
            className={inputCls(!!errors.virtualLink)}
          />
        </Field>
      )}
    </div>
  )
}

function StepLocation({ form, set, errors, isVirtual }: StepProps & { isVirtual: boolean }) {
  if (isVirtual) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-[18px] font-semibold">Location</h2>
          <p className="text-muted-foreground text-[13px] mt-1">Virtual events don't need a venue</p>
        </div>
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-[13px] text-brand-600">
          Since this is a virtual event, attendees will join via the meeting link you provided.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold">Event Location</h2>
        <p className="text-muted-foreground text-[13px] mt-1">Where is your event happening?</p>
      </div>

      <Field label="Venue Name" required error={errors.venue_name}>
        <input
          value={form.venue_name}
          onChange={(e) => set('venue_name', e.target.value)}
          maxLength={200}
          placeholder="e.g. Victoria Island Convention Center"
          className={inputCls(!!errors.venue_name)}
        />
      </Field>

      <Field label="Address">
        <input
          value={form.venue_address}
          onChange={(e) => set('venue_address', e.target.value)}
          maxLength={500}
          placeholder="Street address"
          className={inputCls(false)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" required error={errors.venue_city}>
          <input
            value={form.venue_city}
            onChange={(e) => set('venue_city', e.target.value)}
            maxLength={100}
            placeholder="e.g. Lagos"
            className={inputCls(!!errors.venue_city)}
          />
        </Field>

        <Field label="State / Region">
          <input
            value={form.venue_state}
            onChange={(e) => set('venue_state', e.target.value)}
            maxLength={100}
            placeholder="e.g. Lagos State"
            className={inputCls(false)}
          />
        </Field>
      </div>

      <Field label="Capacity" hint="Leave blank for unlimited (GA events)">
        <input
          value={form.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          type="number"
          min={1}
          placeholder="e.g. 5000"
          className={inputCls(false)}
        />
      </Field>
    </div>
  )
}

function StepSalesWindow({ form, set, errors }: StepProps) {
  const salesStartDate = form.salesStart ? new Date(form.salesStart) : undefined

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold">Sales Window</h2>
        <p className="text-muted-foreground text-[13px] mt-1">When can people buy tickets?</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-[12.5px] text-muted-foreground">
        Set when ticket sales open and close. Leave empty for no specific sales window.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sales Open" error={errors.salesStart}>
          <DateTimePicker
            value={form.salesStart}
            onChange={(v) => set('salesStart', v)}
            placeholder="Pick sales open date"
          />
        </Field>

        <Field label="Sales Close" error={errors.salesEnd}>
          <DateTimePicker
            value={form.salesEnd}
            onChange={(v) => set('salesEnd', v)}
            placeholder="Pick sales close date"
            fromDate={salesStartDate}
          />
        </Field>
      </div>
    </div>
  )
}

function StepImages({ form, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold">Event Images</h2>
        <p className="text-muted-foreground text-[13px] mt-1">Add images for your event poster & gallery</p>
      </div>

      <EventImageUploader
        onChange={(urls) => set('imageUrls', urls)}
        maxImages={6}
        initialUrls={form.imageUrls}
      />

      <div className="text-[12px] text-muted-foreground space-y-1">
        <p>• First image is used as the event banner</p>
        <p>• You can upload up to 6 images</p>
        <p>• Images help attendees get excited about your event</p>
      </div>
    </div>
  )
}

// ─── Preview Screen ───────────────────────────────────────────────────────────

interface PreviewScreenProps {
  form: FormState
  categories: { id: string; name: string }[]
  onBack: () => void
  onSubmit: () => void
  isPending: boolean
  error: string
}

function PreviewScreen({
  form,
  categories,
  onBack,
  onSubmit,
  isPending,
  error,
}: PreviewScreenProps) {
  const categoryName = categories.find((c) => c.id === form.categoryId)?.name
  const startsAt = form.startsAt ? new Date(form.startsAt) : null
  const endsAt = form.endsAt ? new Date(form.endsAt) : null

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold">Preview Your Event</h1>
        <p className="text-muted-foreground text-[13px] mt-1">Review everything before creating</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {form.imageUrls.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/40">
              <div className="relative aspect-video bg-muted">
                <img
                  src={form.imageUrls[0]}
                  alt={form.title}
                  className="h-full w-full object-cover"
                />
              </div>
              {form.imageUrls.length > 1 && (
                <div className="grid grid-cols-3 gap-1 p-2">
                  {form.imageUrls.slice(1, 4).map((url, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted">
                      <img src={url} alt={`Gallery ${i}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event Info Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-foreground">{form.title}</h2>
              {categoryName && <p className="text-[12px] text-brand-500 font-medium mt-1">{categoryName}</p>}
            </div>

            {form.description && (
              <div>
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {form.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 pt-4 border-t border-border">
              <DetailRow label="Date & Time" value={formatDateTime(startsAt, endsAt)} />
              <DetailRow label="Type" value={form.isVirtual ? 'Virtual / Online' : 'In-Person'} />
              {form.isVirtual ? (
                <DetailRow label="Meeting Link" value={form.virtualLink} />
              ) : (
                <>
                  <DetailRow
                    label="Location"
                    value={[form.venue_name, form.venue_city].filter(Boolean).join(', ')}
                  />
                  {form.venue_address && <DetailRow label="Address" value={form.venue_address} />}
                  {form.capacity && <DetailRow label="Capacity" value={`${form.capacity} attendees`} />}
                </>
              )}
              <DetailRow label="Seating" value={formatSeatingType(form.seatingType)} />
              {!form.isFree && form.salesStart && (
                <DetailRow label="Ticket Sales" value={formatSalesWindow(form.salesStart, form.salesEnd)} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 sticky top-4">
            <h3 className="text-[13px] font-semibold">Summary</h3>

            <div className="space-y-2 text-[12px]">
              <SummaryItem
                icon="✓"
                label="Basic Details"
                status={form.title ? 'done' : 'pending'}
              />
              <SummaryItem
                icon="✓"
                label="Event Type & Dates"
                status={form.startsAt ? 'done' : 'pending'}
              />
              <SummaryItem
                icon="✓"
                label="Location"
                status={form.isVirtual || form.venue_name ? 'done' : 'pending'}
              />
              <SummaryItem icon="✓" label="Sales Window" status="done" />
              <SummaryItem
                icon="✓"
                label="Images"
                status={form.imageUrls.length > 0 ? 'done' : 'optional'}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-500">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={onSubmit}
                disabled={isPending}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity',
                  isPending
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
                )}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Event
              </button>
              <button
                onClick={onBack}
                disabled={isPending}
                className="rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  cn(
    'w-full rounded-xl border bg-surface px-3.5 py-2.5',
    'text-[14px] text-foreground placeholder:text-foreground placeholder:opacity-60',
    'outline-none transition-colors focus:ring-2',
    hasError
      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
      : 'border-border focus:border-brand-500 focus:ring-brand-500/20'
  )

const selectCls = (hasError: boolean) =>
  cn(
    inputCls(hasError),
    '[color-scheme:light]' // Force light mode for select dropdown in all themes
  )

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-[11.5px]">{error}</p>}
      {hint && !error && <p className="text-muted-foreground text-[11.5px]">{hint}</p>}
    </div>
  )
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className="border-border flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors select-none"
      style={
        checked
          ? { borderColor: 'rgba(109,40,217,0.4)', backgroundColor: 'rgba(109,40,217,0.05)' }
          : undefined
      }
    >
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-muted-foreground text-[11.5px]">{hint}</p>
      </div>
      {/* Track */}
      <div
        suppressHydrationWarning
        style={{
          position: 'relative',
          width: '36px',
          height: '20px',
          borderRadius: '9999px',
          flexShrink: 0,
          transition: 'background-color 150ms',
          backgroundColor: checked ? '#7c3aed' : 'rgba(113,113,122,0.35)',
        }}
      >
        {/* Thumb */}
        <span
          suppressHydrationWarning
          style={{
            position: 'absolute',
            top: '2px',
            left: 0,
            width: '16px',
            height: '16px',
            borderRadius: '9999px',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transition: 'transform 150ms',
            transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span className="text-[12px] text-muted-foreground font-medium">{label}</span>
      <span className="text-[13px] text-foreground font-medium">{value}</span>
    </div>
  )
}

function SummaryItem({
  icon,
  label,
  status,
}: {
  icon: string
  label: string
  status: 'done' | 'pending' | 'optional'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        status === 'done' && 'bg-brand-500/10 text-brand-600',
        status === 'pending' && 'bg-yellow-500/10 text-yellow-600',
        status === 'optional' && 'bg-muted text-muted-foreground'
      )}
    >
      <span className={cn('text-[11px] font-bold', status === 'done' && 'text-brand-500')}>
        {status === 'done' && '✓'}
        {status === 'pending' && '○'}
        {status === 'optional' && '◆'}
      </span>
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  )
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function formatDateTime(startsAt: Date | null, endsAt: Date | null): string {
  if (!startsAt) return 'Not set'
  const start = startsAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  if (!endsAt) return start
  const end = endsAt.toLocaleDateString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${start} – ${end}`
}

function formatSeatingType(type: string): string {
  const map: Record<string, string> = {
    GENERAL_ADMISSION: 'General Admission',
    RESERVED: 'Reserved Seating',
    MIXED: 'Mixed Seating',
  }
  return map[type] || type
}

function formatSalesWindow(salesStart: string, salesEnd: string): string {
  if (!salesStart && !salesEnd) return 'Always open'
  if (!salesStart) return `Until ${new Date(salesEnd).toLocaleDateString()}`
  if (!salesEnd) return `Starting ${new Date(salesStart).toLocaleDateString()}`
  return `${new Date(salesStart).toLocaleDateString()} – ${new Date(salesEnd).toLocaleDateString()}`
}
