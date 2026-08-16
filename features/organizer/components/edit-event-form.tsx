'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { VenuePicker, type VenuePlace } from '@/components/ui/venue-picker'
import { LocationPicker } from '@/components/ui/location-picker'
import { updateEvent } from '../actions'
import type { Category, Event, Venue } from '@/app/generated/prisma/client'

interface EditEventFormProps {
  event: Pick<
    Event,
    | 'id'
    | 'title'
    | 'description'
    | 'seatingType'
    | 'startsAt'
    | 'endsAt'
    | 'salesStart'
    | 'salesEnd'
    | 'capacity'
    | 'categoryId'
    | 'isFree'
    | 'isVirtual'
    | 'virtualLink'
  > & {
    venue: Pick<Venue, 'id' | 'name' | 'city' | 'state' | 'country' | 'address'> | null
  }
  categories: Pick<Category, 'id' | 'name'>[]
}

export function EditEventForm({ event, categories }: EditEventFormProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Venue state
  const [venue, setVenue] = useState<VenuePlace | null>(
    event.venue
      ? {
          name: event.venue.name,
          address: event.venue.address ?? '',
          city: event.venue.city,
          state: event.venue.state ?? '',
          country: event.venue.country,
          placeId: '',
        }
      : null
  )

  // Date/time state
  const [startsAt, setStartsAt] = useState(event.startsAt ? toLocalISO(event.startsAt) : '')
  const [endsAt, setEndsAt] = useState(event.endsAt ? toLocalISO(event.endsAt) : '')
  const [salesStart, setSalesStart] = useState(event.salesStart ? toLocalISO(event.salesStart) : '')
  const [salesEnd, setSalesEnd] = useState(event.salesEnd ? toLocalISO(event.salesEnd) : '')

  // Free / virtual toggles
  const [isFree, setIsFree] = useState(event.isFree)
  const [isVirtual, setIsVirtual] = useState(event.isVirtual)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')

    const form = e.currentTarget
    const formData = new FormData(form)

    formData.set('eventId', event.id)
    if (startsAt) formData.set('startsAt', new Date(startsAt).toISOString())
    if (endsAt) formData.set('endsAt', new Date(endsAt).toISOString())
    if (salesStart) formData.set('salesStart', new Date(salesStart).toISOString())
    if (salesEnd) formData.set('salesEnd', new Date(salesEnd).toISOString())
    formData.set('isFree', String(isFree))
    formData.set('isVirtual', String(isVirtual))
    if (!isVirtual) formData.delete('virtualLink')

    startTransition(async () => {
      const result = await updateEvent(formData)
      if (result.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  const startsAtDate = startsAt ? new Date(startsAt) : undefined

  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      <h2 className="mb-5 text-[14px] font-semibold">Event Details</h2>

      {status === 'success' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Changes saved.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Field label="Event Title" required>
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={event.title}
            className={inputCls}
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            defaultValue={event.description ?? ''}
            className={cn(inputCls, 'resize-none')}
          />
        </Field>

        {/* Category + Seating type */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select name="categoryId" defaultValue={event.categoryId ?? ''} className={inputCls}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Seating Type" required>
            <select
              name="seatingType"
              required
              defaultValue={event.seatingType}
              className={inputCls}
            >
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

        {/* Virtual link — only when isVirtual */}
        {isVirtual && (
          <Field label="Stream / Meeting URL">
            <input
              name="virtualLink"
              type="url"
              placeholder="https://meet.example.com/…"
              defaultValue={event.virtualLink ?? ''}
              className={inputCls}
            />
          </Field>
        )}

        {/* Venue — only when not virtual */}
        {!isVirtual && (
          <>
            <Field label="Venue Name" hint="Search on Google Maps or type a name">
              <VenuePicker defaultValue={event.venue?.name} onSelect={setVenue} />
            </Field>
            <Field label="State & City / LGA" hint="Select the event location">
              <LocationPicker
                defaultState={venue?.state ?? event.venue?.state ?? ''}
                defaultCity={venue?.city ?? event.venue?.city ?? ''}
                onChange={(loc) => {
                  setVenue((prev) =>
                    prev
                      ? { ...prev, state: loc.state, city: loc.city }
                      : {
                          name: event.venue?.name ?? '',
                          address: event.venue?.address ?? '',
                          city: loc.city,
                          state: loc.state,
                          country: 'Nigeria',
                          placeId: '',
                        }
                  )
                }}
              />
            </Field>
          </>
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
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={event.capacity ?? ''}
            placeholder="e.g. 5000"
            className={inputCls}
          />
        </Field>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
              isPending
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
            )}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </section>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Date/string to the "YYYY-MM-DDTHH:mm" format DateTimePicker expects */
function toLocalISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
