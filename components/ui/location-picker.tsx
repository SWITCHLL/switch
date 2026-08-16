'use client'

/**
 * LocationPicker
 *
 * State + City/LGA cascading selects backed by Nigerian states data.
 * Emits hidden form fields: venue_state, venue_city
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import statesData from '@/public/states.json'

interface State {
  code: string
  name: string
  capital: string
  cities: string[]
  lgas: string[]
}

const STATES: State[] = statesData as State[]

interface LocationValue {
  state: string
  city: string
}

interface LocationPickerProps {
  defaultState?: string
  defaultCity?: string
  onChange?: (value: LocationValue) => void
  className?: string
  /** If true, also render hidden inputs for form submission */
  withHiddenInputs?: boolean
}

const selectCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
  'appearance-none cursor-pointer'
)

export function LocationPicker({
  defaultState = '',
  defaultCity = '',
  onChange,
  className,
  withHiddenInputs = true,
}: LocationPickerProps) {
  const [selectedState, setSelectedState] = useState(defaultState)
  const [selectedCity, setSelectedCity] = useState(defaultCity)

  const stateData = useMemo(
    () => STATES.find((s) => s.name === selectedState || s.code === selectedState),
    [selectedState]
  )

  // Combine cities and LGAs, deduplicate and sort
  const cityOptions = useMemo(() => {
    if (!stateData) return []
    const all = [...new Set([...stateData.cities, ...stateData.lgas])].sort()
    return all
  }, [stateData])

  function handleStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedState(val)
    setSelectedCity('')
    onChange?.({ state: val, city: '' })
  }

  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedCity(val)
    onChange?.({ state: selectedState, city: val })
  }

  return (
    <div className={cn('space-y-3', className)}>
      {withHiddenInputs && (
        <>
          <input type="hidden" name="venue_state" value={selectedState} />
          <input type="hidden" name="venue_city" value={selectedCity} />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* State */}
        <div className="relative">
          <select
            value={selectedState}
            onChange={handleStateChange}
            aria-label="Select state"
            className={selectCls}
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </div>

        {/* City / LGA */}
        <div className="relative">
          <select
            value={selectedCity}
            onChange={handleCityChange}
            disabled={!selectedState}
            aria-label="Select city or LGA"
            className={cn(selectCls, !selectedState && 'cursor-not-allowed opacity-50')}
          >
            <option value="">{selectedState ? 'Select city / LGA' : 'Select state first'}</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </div>
      </div>

      {selectedState && selectedCity && (
        <p className="text-muted-foreground text-[11.5px]">
          {selectedCity}, {selectedState} · Nigeria
        </p>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg
        className="text-muted-foreground h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
