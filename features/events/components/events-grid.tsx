import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EventCard } from './event-card'
import { FeaturedEvent } from './featured-event'
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
        <p className="text-foreground text-[17px] font-semibold">Nothing here yet.</p>
        <p className="text-muted-foreground mt-2 max-w-xs text-[14px] leading-relaxed">
          We couldn't find events matching your search.
        </p>
        <Link
          href="/events"
          className="border-border bg-surface text-muted-foreground hover:text-foreground mt-6 rounded-full border px-5 py-2 text-[13px] font-medium transition-colors"
        >
          Clear filters
        </Link>
      </div>
    )
  }

  // Use first event as featured when no specific search/filter is active
  const isFiltered = filters.search || filters.category || filters.city || filters.free
  const featuredEvent = !isFiltered && page === 1 && events.length > 0 ? events[0] : null
  const gridEvents = featuredEvent ? events.slice(1) : events

  return (
    <div>
      {/* Featured event */}
      {featuredEvent && <FeaturedEvent event={featuredEvent} />}

      {/* Section header */}
      {gridEvents.length > 0 && (
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <div className="mb-8 flex items-baseline gap-3">
            <h2 className="text-foreground text-[20px] font-semibold tracking-tight sm:text-[24px]">
              Upcoming events
            </h2>
            <span className="text-muted-foreground text-[13px]">
              {total > 1 ? `${total} events` : `${total} event`}
            </span>
          </div>

          {/* Grid */}
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {gridEvents.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Event pagination"
              className="mt-16 flex items-center justify-center gap-1.5"
            >
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
            </nav>
          )}
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
        aria-disabled="true"
        className="text-muted-foreground/30 flex h-9 w-9 items-center justify-center rounded-lg text-[13px]"
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
          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
