'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttendeeSearchProps {
  searchQuery?: string
  selectedEventId?: string
}

export function AttendeeSearch({ searchQuery, selectedEventId }: AttendeeSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set('q', query.trim())
      } else {
        params.delete('q')
      }
      startTransition(() => {
        router.push(`?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <input
          ref={searchRef}
          type="search"
          defaultValue={searchQuery ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch((e.target as HTMLInputElement).value)
            }
          }}
          onBlur={(e) => {
            handleSearch(e.currentTarget.value)
          }}
          placeholder="Search name, email, ticket #…"
          className={cn(
            'border-border bg-surface w-full rounded-xl border py-2.5 pr-3.5 pl-10',
            'text-foreground placeholder:text-muted-foreground text-[13.5px] outline-none',
            'focus:border-brand-500 focus:ring-brand-500/20 transition-colors focus:ring-2'
          )}
          aria-label="Search attendees"
        />
      </div>
    </div>
  )
}
