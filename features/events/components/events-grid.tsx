import Link from 'next/link'
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { EventCard } from './event-card'
import type { EventsPage } from '../types'
import type { EventFiltersParsed } from '../schemas'
import { cn } from '@/lib/utils'

interface EventsGridProps {
  data: EventsPage
  filters: EventFiltersParsed
}

export function EventsGrid({ data, filters }: EventsGridProps) {
  const { events, total, page, totalPages } = data

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <SearchX className="text-muted-foreground/40 mb-4 h-12 w-12" />
        <h3 className="text-[16px] font-semibold">No events found</h3>
        <p className="text-muted-foreground mt-1.5 max-w-xs text-[14px]">
          Try adjusting your filters or check back later for new events.
        </p>
        <Link
          href="/events"
          className="border-border bg-surface text-muted-foreground hover:text-foreground mt-6 rounded-xl border px-4 py-2 text-[13.5px] font-medium transition-colors"
        >
          Clear filters
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Result count */}
      <p className="text-muted-foreground mb-6 text-[13px]">
        {total} event{total !== 1 ? 's' : ''} found
      </p>

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <PaginationLink
            filters={filters}
            page={page - 1}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PaginationLink>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationLink key={p} filters={filters} page={p} active={p === page}>
              {p}
            </PaginationLink>
          ))}

          <PaginationLink
            filters={filters}
            page={page + 1}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationLink>
        </div>
      )}
    </div>
  )
}

// ─── Pagination link builder ──────────────────────────────────────────────────

function PaginationLink({
  filters,
  page,
  disabled,
  active,
  children,
  'aria-label': ariaLabel,
}: {
  filters: EventFiltersParsed
  page: number
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
  'aria-label'?: string
}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.city) params.set('city', filters.city)
  if (filters.search) params.set('search', filters.search)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.free) params.set('free', 'true')
  params.set('page', String(page))

  if (disabled) {
    return (
      <span
        aria-disabled
        className="text-muted-foreground/40 flex h-9 w-9 items-center justify-center rounded-lg text-[13px]"
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      href={`/events?${params.toString()}`}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
