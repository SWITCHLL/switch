'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventStatusFilterProps {
  statusFilter: string
  searchQuery: string
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Events' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function EventStatusFilter({ statusFilter, searchQuery }: EventStatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      updateFilter('status', value === 'ALL' ? null : value)
    },
    [updateFilter]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilter('search', value.trim() || null)
    },
    [updateFilter]
  )

  const clearAll = useCallback(() => {
    if (searchRef.current) searchRef.current.value = ''
    startTransition(() => {
      router.push(pathname)
    })
  }, [router, pathname])

  const hasActiveFilters = searchQuery || (statusFilter && statusFilter !== 'ALL')

  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="space-y-4">
        {/* ── Search ── */}
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search events by title, venue, or category…"
            defaultValue={searchQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchChange((e.target as HTMLInputElement).value)
              }
            }}
            onBlur={(e) => {
              handleSearchChange(e.currentTarget.value)
            }}
            className={cn(
              'border-border bg-surface placeholder:text-muted-foreground text-foreground',
              'h-10 w-full rounded-lg border pl-11 pr-4 text-[14px]',
              'outline-none transition-colors',
              'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2'
            )}
            aria-label="Search events"
          />
          {searchQuery && (
            <button
              onClick={() => {
                if (searchRef.current) searchRef.current.value = ''
                handleSearchChange('')
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 rounded p-0.5 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Status Filter ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="status-select" className="text-[13px] font-medium text-muted-foreground">
            Status:
          </label>
          <select
            id="status-select"
            value={statusFilter || 'ALL'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={cn(
              'border-border bg-surface text-foreground',
              'h-10 rounded-lg border px-3 py-2 text-[14px]',
              'outline-none transition-colors',
              'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2',
              'cursor-pointer'
            )}
            aria-label="Filter events by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* ── Clear button ── */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-[13px] font-medium transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
