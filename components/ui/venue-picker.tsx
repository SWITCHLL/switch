'use client'

/**
 * VenuePicker — inline venue fields.
 * Renders four plain text inputs and keeps hidden form fields in sync.
 * No external API or map SDK required here.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface VenuePlace {
  name: string
  address: string
  city: string
  state: string
  country: string
  placeId: string
}

interface VenuePickerProps {
  defaultValue?: string
  defaultAddress?: string
  defaultCity?: string
  defaultState?: string
  onSelect?: (place: VenuePlace | null) => void
  className?: string
}

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
)

export function VenuePicker({
  defaultValue = '',
  defaultAddress = '',
  defaultCity = '',
  defaultState = '',
  onSelect,
  className,
}: VenuePickerProps) {
  const [name, setName] = useState(defaultValue)
  const [address, setAddress] = useState(defaultAddress)
  const [city, setCity] = useState(defaultCity)
  const [state, setState] = useState(defaultState)

  function notify(updates: Partial<{ name: string; address: string; city: string; state: string }>) {
    const next = { name, address, city, state, ...updates }
    if (next.name) {
      onSelect?.({
        name: next.name,
        address: next.address,
        city: next.city,
        state: next.state,
        country: 'Nigeria',
        placeId: '',
      })
    } else {
      onSelect?.(null)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Hidden fields submitted with the form */}
      <input type="hidden" name="venue_name" value={name} />
      <input type="hidden" name="venue_address" value={address} />
      <input type="hidden" name="venue_city" value={city} />
      <input type="hidden" name="venue_state" value={state} />

      {/* Venue Name */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">
          Venue Name
        </label>
        <input
          type="text"
          placeholder="e.g. Eko Hotel & Suites"
          value={name}
          onChange={(e) => { setName(e.target.value); notify({ name: e.target.value }) }}
          className={inputCls}
        />
      </div>

      {/* Address */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">
          Address
        </label>
        <input
          type="text"
          placeholder="e.g. Plot 1415, Ozumba Mbadiwe Ave"
          value={address}
          onChange={(e) => { setAddress(e.target.value); notify({ address: e.target.value }) }}
          className={inputCls}
        />
      </div>

      {/* City + State side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">
            City
          </label>
          <input
            type="text"
            placeholder="e.g. Lagos"
            value={city}
            onChange={(e) => { setCity(e.target.value); notify({ city: e.target.value }) }}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">
            State
          </label>
          <input
            type="text"
            placeholder="e.g. Lagos State"
            value={state}
            onChange={(e) => { setState(e.target.value); notify({ state: e.target.value }) }}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
