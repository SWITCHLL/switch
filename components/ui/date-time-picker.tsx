'use client'

import * as React from 'react'
import { format, isValid, parse, setHours, setMinutes } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  /** ISO string value (datetime-local format "YYYY-MM-DDTHH:mm") */
  value?: string
  onChange?: (value: string) => void
  /** Forwarded to the hidden <input> for native form submission */
  name?: string
  placeholder?: string
  disabled?: boolean
  /** Earliest selectable date */
  fromDate?: Date
  className?: string
  id?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateTimePicker({
  value,
  onChange,
  name,
  placeholder = 'Pick date & time',
  disabled = false,
  fromDate,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse the ISO/datetime-local string → Date
  const selected = React.useMemo<Date | undefined>(() => {
    if (!value) return undefined
    // "YYYY-MM-DDTHH:mm" or full ISO
    const d = new Date(value)
    return isValid(d) ? d : undefined
  }, [value])

  // Keep time parts as strings so the input is freely editable
  const timeStr = selected ? format(selected, 'HH:mm') : '00:00'

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onChange?.('')
      return
    }
    // Preserve existing time or default to 00:00
    const [hours, minutes] = timeStr.split(':').map(Number)
    const merged = setMinutes(setHours(day, hours ?? 0), minutes ?? 0)
    onChange?.(format(merged, "yyyy-MM-dd'T'HH:mm"))
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value // "HH:mm"
    const base = selected ?? new Date()
    const [hours, minutes] = t.split(':').map(Number)
    const merged = setMinutes(setHours(base, hours ?? 0), minutes ?? 0)
    onChange?.(format(merged, "yyyy-MM-dd'T'HH:mm"))
  }

  const displayLabel = selected ? format(selected, 'EEE, MMM d, yyyy · h:mm a') : placeholder

  return (
    <>
      {/* Hidden native input so the value gets picked up by FormData */}
      {name && <input type="hidden" name={name} value={value ?? ''} readOnly />}

      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-label={placeholder}
            className={cn(
              'border-border bg-surface flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5',
              'text-left text-[14px] transition-colors',
              'hover:border-brand-500/60 focus-visible:ring-brand-500/20 focus-visible:ring-2 focus-visible:outline-none',
              open && 'border-brand-500 ring-brand-500/20 ring-2',
              !selected && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
          >
            <CalendarIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{displayLabel}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleDaySelect}
            disabled={fromDate ? { before: fromDate } : undefined}
            initialFocus
          />

          {/* Time row */}
          <div className="border-border border-t px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Clock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <label className="text-muted-foreground text-[12px]">Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={handleTimeChange}
                className={cn(
                  'border-border bg-muted ml-auto rounded-lg border px-2.5 py-1',
                  'text-foreground text-[13px]',
                  'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2 focus:outline-none',
                  // Style the native time input chrome
                  '[color-scheme:dark]'
                )}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
