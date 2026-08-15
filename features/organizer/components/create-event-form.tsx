'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { VenuePicker, type VenuePlace } from '@/components/ui/venue-picker'
import { EventImageUploader } from '@/components/ui/event-image-uploader'
import { createEvent } from '../actions'
interface CreateEventFormProps {
  categories: { id: string; name: string }[]
}

export function CreateEventForm({ categories }: CreateEventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [venue, setVenue] = useState<VenuePlace | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isFree, setIsFree] = useState(false)
  const [isVirtual, setIsVirtual] = useState(false)

  // ── Controlled date/time state ────────────────────────────────────────────
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [salesStart, setSalesStart] = useState('')
  const [salesEnd, setSalesEnd] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Inject datetime values
    if (startsAt) formData.set('startsAt', new Date(startsAt).toISOString())
    if (endsAt) formData.set('endsAt', new Date(endsAt).toISOString())
    if (salesStart) formData.set('salesStart', new Date(salesStart).toISOString())
    if (salesEnd) formData.set('salesEnd', new Date(salesEnd).toISOString())

    // Inject uploaded image URLs (repeated field)
    formData.delete('imageUrls')
    imageUrls.forEach((url) => formData.append('imageUrls', url))
    formData.set('isFree', String(isFree))
    formData.set('isVirtual', String(isVirtual))
    if (!isVirtual) formData.delete('virtualLink')

    startTransition(async () => {
      const result = await createEvent(formData)
      if (result.success) {
        router.push(`/dashboard/events/${result.data.id}`)
      } else {
        setError(result.error)
      }
    })
  }

  const startsAtDate = startsAt ? new Date(startsAt) : undefined

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Title */}
      <Field label="Event Title" required>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Afrobeats Live Concert Lagos"
          className={inputCls}
        />
      </Field>

      {/* Description */}
      <Field label="Description">
        <textarea
          name="description"
          rows={4}
          maxLength={5000}
          placeholder="Tell attendees what to expect…"
          className={cn(inputCls, 'resize-none')}
        />
      </Field>

      {/* Category + Seating type */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select name="categoryId" className={inputCls}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seating Type" required>
          <select name="seatingType" required className={inputCls}>
            <option value="GENERAL_ADMISSION">General Admission</option>
            <option value="RESERVED">Reserved Seating</option>
            <option value="MIXED">Mixed</option>
          </select>
        </Field>
      </div>

      {/* Free / Virtual toggles */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Free Event"
          hint="All tickets are free"
          checked={isFree}
          onChange={setIsFree}
        />
        <ToggleField
          label="Virtual / Online"
          hint="Attendees join remotely"
          checked={isVirtual}
          onChange={setIsVirtual}
        />
      </div>

      {/* Virtual link */}
      {isVirtual && (
        <Field label="Stream / Meeting URL">
          <input
            name="virtualLink"
            type="url"
            placeholder="https://meet.example.com/…"
            className={inputCls}
          />
        </Field>
      )}

      {/* Venue — Google Places Autocomplete */}
      {!isVirtual && (
        <Field
          label="Venue"
          hint={
            venue
              ? `${venue.city}${venue.state ? `, ${venue.state}` : ''}, ${venue.country}`
              : 'Search for a venue verified on Google Maps'
          }
        >
          <VenuePicker onSelect={setVenue} />
        </Field>
      )}

      {/* Event dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start Date & Time" required>
          <DateTimePicker
            value={startsAt}
            onChange={setStartsAt}
            placeholder="Pick start date & time"
          />
        </Field>
        <Field label="End Date & Time">
          <DateTimePicker
            value={endsAt}
            onChange={setEndsAt}
            placeholder="Pick end date & time"
            fromDate={startsAtDate}
          />
        </Field>
      </div>

      {/* Sales window */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sales Open">
          <DateTimePicker
            value={salesStart}
            onChange={setSalesStart}
            placeholder="Pick sales open date"
          />
        </Field>
        <Field label="Sales Close">
          <DateTimePicker
            value={salesEnd}
            onChange={setSalesEnd}
            placeholder="Pick sales close date"
            fromDate={salesStart ? new Date(salesStart) : undefined}
          />
        </Field>
      </div>

      {/* Capacity */}
      <Field label="Capacity" hint="Leave blank for unlimited (GA events)">
        <input type="number" name="capacity" min={1} placeholder="e.g. 5000" className={inputCls} />
      </Field>

      {/* Event images — Supabase Storage upload */}
      <Field
        label="Event Images"
        hint="First image is used as the banner. You can upload up to 6 images."
      >
        <EventImageUploader onChange={setImageUrls} maxImages={6} />
      </Field>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/dashboard/events"
          className="text-muted-foreground hover:text-foreground border-border hover:bg-muted rounded-xl border px-4 py-2.5 text-[13.5px] font-medium transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || !startsAt}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
            isPending || !startsAt
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
          )}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save as Draft
        </button>
      </div>
    </form>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
)

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-muted-foreground text-[11.5px]">{hint}</p>}
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
        checked ? 'border-brand-500/40 bg-brand-500/5' : 'border-border hover:border-brand-500/30'
      )}
    >
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-muted-foreground text-[11.5px]">{hint}</p>
      </div>
      <div
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  )
}
