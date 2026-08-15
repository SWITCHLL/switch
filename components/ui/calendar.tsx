'use client'

import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-[13.5px] font-semibold',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'absolute left-1 flex h-7 w-7 items-center justify-center rounded-lg border border-border',
          'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'disabled:pointer-events-none disabled:opacity-40'
        ),
        button_next: cn(
          'absolute right-1 flex h-7 w-7 items-center justify-center rounded-lg border border-border',
          'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          'disabled:pointer-events-none disabled:opacity-40'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[11px] font-medium text-muted-foreground pb-1',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 p-0 text-center text-[13px] relative',
        day_button: cn(
          'h-9 w-9 rounded-lg text-[13px] font-normal transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50'
        ),
        selected:
          '[&>button]:bg-brand-600 [&>button]:text-white [&>button]:hover:bg-brand-700 [&>button]:hover:text-white',
        today: '[&>button]:font-semibold [&>button]:text-brand-400',
        outside: '[&>button]:text-muted-foreground [&>button]:opacity-40',
        disabled: '[&>button]:opacity-30 [&>button]:pointer-events-none',
        range_middle:
          '[&>button]:rounded-none [&>button]:bg-brand-600/15 [&>button]:text-foreground',
        range_start: '[&>button]:rounded-r-none',
        range_end: '[&>button]:rounded-l-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
