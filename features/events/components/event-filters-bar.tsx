'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventFiltersParsed } from '../schemas'

interface Category {
  id: string
  name: string
  slug: string
  color: string | null
}

interface EventFiltersBarProps {
  categories: Category[]
  activeFilters: EventFiltersParsed
}

export function EventFiltersBar({ categories, activeFilters }: EventFiltersBarProps) {
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
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const clearAll = useCallback(() => {
    if (searchRef.current) searchRef.current.value = ''
    startTransition(() => {
      router.push(pathname)
    })
  }, [router, pathname])

  const hasActiveFilters =
    activeFilters.category ||
    activeFilters.city ||
    activeFilters.search ||
    activeFilters.free ||
    activeFilters.dateFrom

  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search events, venues, artists…"
          defaultValue={activeFilters.search ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilter('search', (e.target as HTMLInputElement).value.trim() || null)
            }
          }}
          className={cn(
            'border-border bg-surface placeholder:text-muted-foreground text-foreground',
            'h-12 w-full rounded-xl border pl-11 pr-4 text-[14px]',
            'outline-none transition-colors',
            'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2'
          )}
          aria-label="Search events"
        />
        {activeFilters.search && (
          <button
            onClick={() => {
              if (searchRef.current) searchRef.current.value = ''
              updateFilter('search', null)
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 rounded p-0.5 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Category pill rail ── */}
      <div className="relative -mx-5 sm:-mx-8">
        {/* Fade edges */}
        <div
          className="pointer-events-none absolute top-0 left-0 z-10 h-full w-8 sm:w-12"
          style={{
            background: 'linear-gradient(to right, var(--background) 0%, transparent 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-0 right-0 z-10 h-full w-8 sm:w-12"
          style={{
            background: 'linear-gradient(to left, var(--background) 0%, transparent 100%)',
          }}
          aria-hidden
        />

        <div
          role="group"
          aria-label="Filter by category"
          className="flex items-center gap-2 overflow-x-auto px-5 pb-1 sm:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* All */}
          <button
            onClick={() => updateFilter('category', null)}
            aria-pressed={!activeFilters.category}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-all duration-200',
              !activeFilters.category
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            )}
          >
            All
          </button>

          {categories.map((cat) => {
            const isActive = activeFilters.category === cat.slug
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter('category', isActive ? null : cat.slug)}
                aria-pressed={isActive}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-all duration-200',
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                )}
                style={isActive ? { backgroundColor: cat.color ?? '#6366f1' } : undefined}
              >
                {cat.name}
              </button>
            )
          })}

          {/* Free */}
          <button
            onClick={() => updateFilter('free', activeFilters.free ? null : 'true')}
            aria-pressed={!!activeFilters.free}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-all duration-200',
              activeFilters.free
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            )}
          >
            Free
          </button>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground ml-2 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] transition-colors"
            >
              <X className="h-3 w-3" aria-hidden />
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
