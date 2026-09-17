'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TicketStatus } from '@/app/generated/prisma/client'

const STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Valid' },
  { value: 'USED', label: 'Used' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'EXPIRED', label: 'Expired' },
]

interface TicketsFilterProps {
  hasActiveFilters: boolean
}

export function TicketsFilter({ hasActiveFilters }: TicketsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') || ''

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    const params = new URLSearchParams(searchParams)
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    router.push(`/dashboard/tickets?${params.toString()}`, { scroll: false })
  }

  const handleClearFilters = () => {
    router.push('/dashboard/tickets', { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Filter className="h-4 w-4" />
        <span>Filter by status</span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={currentStatus}
          onChange={handleStatusChange}
          className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-600 focus:border-brand-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-10 px-2.5"
          >
            <X className="h-4 w-4" />
            <span className="ml-1.5 text-xs">Clear</span>
          </Button>
        )}
      </div>
    </div>
  )
}
