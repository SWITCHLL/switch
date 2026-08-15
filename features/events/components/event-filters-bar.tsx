'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
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

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset to page 1 on filter change
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const clearAll = useCallback(() => {
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
        'mb-8 space-y-4 transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-60'
      )}
    >
      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Search events, venues…"
          defaultValue={activeFilters.search ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFilter('search', (e.target as HTMLInputElement).value || null)
            }
          }}
          className={cn(
            'border-border bg-surface placeholder:text-muted-foreground text-foreground w-full rounded-xl border py-2.5 pr-4 pl-10',
            'text-[14px] transition-colors outline-none',
            'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2'
          )}
          aria-label="Search events"
        />
      </div>

      {/* ── Category pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />

        <button
          onClick={() => updateFilter('category', null)}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all',
            !activeFilters.category
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          )}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              updateFilter('category', activeFilters.category === cat.slug ? null : cat.slug)
            }
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all',
              activeFilters.category === cat.slug
                ? 'border-transparent text-white'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            )}
            style={
              activeFilters.category === cat.slug
                ? { backgroundColor: cat.color ?? '#6366f1' }
                : undefined
            }
          >
            {cat.name}
          </button>
        ))}

        {/* Free events toggle */}
        <button
          onClick={() => updateFilter('free', activeFilters.free ? null : 'true')}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all',
            activeFilters.free
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          )}
        >
          Free
        </button>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-[12.5px] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
