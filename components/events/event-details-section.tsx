import { format } from 'date-fns'
import { isSameDay } from 'date-fns'
import type { EventDetail } from '@/features/events/types'

interface EventDetailsSectionProps {
  event: Pick<EventDetail, 'startsAt' | 'endsAt' | 'category' | 'seatingType' | 'isVirtual' | 'status'>
}

export function EventDetailsSection({ event }: EventDetailsSectionProps) {
  const { startsAt, endsAt, category, seatingType, isVirtual, status } = event

  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : null

  const dateDisplay = format(start, 'EEEE, MMMM d, yyyy')

  let timeDisplay: string
  if (!end || start.getTime() === end.getTime()) {
    timeDisplay = format(start, 'h:mm a')
  } else {
    timeDisplay = `${format(start, 'h:mm a')} — ${format(end, 'h:mm a')}`
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Date', value: dateDisplay },
    { label: 'Time', value: timeDisplay },
  ]

  if (category) rows.push({ label: 'Category', value: category.name })

  const seatingLabel: Record<string, string> = {
    GENERAL_ADMISSION: 'General Admission',
    RESERVED: 'Reserved Seating',
    MIXED: 'Mixed Seating',
  }
  rows.push({ label: 'Seating', value: seatingLabel[seatingType] ?? seatingType })
  rows.push({ label: 'Format', value: isVirtual ? 'Online event' : 'In-person event' })

  if (status !== 'PUBLISHED') {
    const statusLabel: Record<string, string> = {
      DRAFT: 'Draft',
      CANCELLED: 'Cancelled',
      COMPLETED: 'Completed',
    }
    rows.push({ label: 'Status', value: statusLabel[status] ?? status })
  }

  return (
    <section aria-labelledby="details-heading">
      <h2
        id="details-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        Event Details
      </h2>

      <dl className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[0.03]">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <dt className="w-24 shrink-0 text-[13px] text-white/40">{label}</dt>
            <dd className="text-right text-[13px] font-medium text-white/80">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
