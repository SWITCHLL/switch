'use client'

import { cn } from '@/lib/utils'

interface GroupProgressProps {
  paidSlots: number
  totalSlots: number
  requireFullPayment: boolean
}

export function GroupProgress({ paidSlots, totalSlots, requireFullPayment }: GroupProgressProps) {
  const percent = totalSlots === 0 ? 0 : Math.round((paidSlots / totalSlots) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="text-muted-foreground font-medium">
          {paidSlots} of {totalSlots} paid
        </span>
        {requireFullPayment && (
          <span className="text-[11px] font-semibold text-amber-400">All-or-nothing</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            percent === 100 ? 'bg-emerald-500' : 'from-brand-500 bg-gradient-to-r to-violet-500'
          )}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={paidSlots}
          aria-valuemin={0}
          aria-valuemax={totalSlots}
          aria-label={`${paidSlots} of ${totalSlots} slots paid`}
        />
      </div>
    </div>
  )
}
