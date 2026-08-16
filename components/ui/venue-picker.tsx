'use client'

/**
 * VenuePicker
 *
 * Text input backed by Google Places Autocomplete (New).
 * On selection it populates hidden form fields:
 *   venue_name, venue_address, venue_city, venue_state, venue_country, venue_place_id
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY with:
 *   - Maps JavaScript API
 *   - Places API (New)
 * both enabled in Google Cloud Console.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPin, X, Loader2 } from 'lucide-react'
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
  /** Pre-populated value (edit mode) */
  defaultValue?: string
  onSelect?: (place: VenuePlace | null) => void
  className?: string
}

// Extract a specific address component type from the Places result
// Places API (New) uses longText/shortText instead of long_name/short_name
function extractComponent(components: google.maps.places.AddressComponent[], type: string): string {
  return components.find((c) => c.types.includes(type))?.longText ?? ''
}

export function VenuePicker({ defaultValue, onSelect, className }: VenuePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState(defaultValue ?? '')
  const [selected, setSelected] = useState<VenuePlace | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiReady, setApiReady] = useState(false)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [open, setOpen] = useState(false)
  // Computed once on mount — safe to derive directly from env
  const [apiKeyMissing] = useState(() => !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  // Load the Maps JS SDK once — runs only on client
  useEffect(() => {
    if (apiKeyMissing) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

    setOptions({ key: apiKey })

    importLibrary('places')
      .then(() => {
        setApiReady(true)
        sessionToken.current = new google.maps.places.AutocompleteSessionToken()
      })
      .catch(console.error)
  }, [apiKeyMissing])

  // Fetch suggestions whenever input changes
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!apiReady || input.length < 3) {
        setSuggestions([])
        setOpen(false)
        return
      }

      try {
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: sessionToken.current ?? undefined,
            // Bias toward establishment and geocode types (venues, not just roads)
            includedPrimaryTypes: [
              'establishment',
              'stadium',
              'event_venue',
              'cultural_center',
              'performing_arts_theater',
              'concert_hall',
              'convention_center',
              'banquet_hall',
            ],
          })
        setSuggestions(results ?? [])
        setOpen((results?.length ?? 0) > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    },
    [apiReady]
  )

  // Debounce the API call
  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleSelectSuggestion(suggestion: google.maps.places.AutocompleteSuggestion) {
    setOpen(false)
    setLoading(true)

    try {
      const placePrediction = suggestion.placePrediction
      if (!placePrediction) return

      const place = placePrediction.toPlace()
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'id'],
      })

      const components = place.addressComponents ?? []
      const resolved: VenuePlace = {
        name: place.displayName ?? placePrediction.mainText?.toString() ?? '',
        address: place.formattedAddress ?? '',
        city:
          extractComponent(components, 'locality') ||
          extractComponent(components, 'administrative_area_level_2'),
        state: extractComponent(components, 'administrative_area_level_1'),
        country: extractComponent(components, 'country'),
        placeId: place.id ?? '',
      }

      setInputValue(resolved.name)
      setSelected(resolved)
      onSelect?.(resolved)

      // Refresh session token after a completed selection
      sessionToken.current = new google.maps.places.AutocompleteSessionToken()
    } catch (err) {
      console.error('[VenuePicker] fetchFields error', err)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setInputValue('')
    setSelected(null)
    setSuggestions([])
    setOpen(false)
    onSelect?.(null)
    inputRef.current?.focus()
  }

  // Render plain text input if API key is missing (determined client-side)
  if (apiKeyMissing) {
    return (
      <input
        type="text"
        placeholder="Enter venue name and address"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className={cn(
          'border-border bg-surface w-full rounded-xl border px-3.5 py-2.5',
          'text-foreground placeholder:text-muted-foreground text-[14px]',
          'focus:border-brand-500 focus:ring-brand-500/20 transition-colors outline-none focus:ring-2',
          className
        )}
      />
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* ── Hidden fields submitted with the form ── */}
      <input type="hidden" name="venue_name" value={selected?.name ?? ''} />
      <input type="hidden" name="venue_address" value={selected?.address ?? ''} />
      <input type="hidden" name="venue_city" value={selected?.city ?? ''} />
      <input type="hidden" name="venue_state" value={selected?.state ?? ''} />
      <input type="hidden" name="venue_country" value={selected?.country ?? ''} />
      <input type="hidden" name="venue_place_id" value={selected?.placeId ?? ''} />

      {/* ── Visible input ── */}
      <div className="relative flex items-center">
        <MapPin className="text-muted-foreground absolute left-3.5 h-4 w-4 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Search for a venue"
          placeholder={apiReady ? 'Search for a venue…' : 'Loading Maps…'}
          disabled={!apiReady}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (selected) {
              setSelected(null)
              onSelect?.(null)
            }
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className={cn(
            'border-border bg-surface w-full rounded-xl border py-2.5 pr-10 pl-10',
            'text-foreground placeholder:text-muted-foreground text-[14px]',
            'transition-colors outline-none',
            'focus:border-brand-500 focus:ring-brand-500/20 focus:ring-2',
            selected && 'border-emerald-500/50 bg-emerald-500/5',
            !apiReady && 'cursor-wait opacity-60'
          )}
        />

        {/* Right adornment */}
        <div className="absolute right-3 flex items-center">
          {loading && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
          {!loading && selected && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear venue"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Confirmed venue chip ── */}
      {selected && (
        <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-[12px]">
          <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
          <span className="truncate">{selected.address}</span>
        </p>
      )}

      {/* ── Suggestions dropdown ── */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Venue suggestions"
          className="border-border bg-surface absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-xl border shadow-xl"
        >
          {suggestions.map((s, i) => {
            const pred = s.placePrediction
            if (!pred) return null
            const main = pred.mainText?.toString() ?? ''
            const secondary = pred.secondaryText?.toString() ?? ''
            return (
              <li key={i}>
                <button
                  type="button"
                  role="option"
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left',
                    'hover:bg-muted/60 transition-colors',
                    i < suggestions.length - 1 && 'border-border border-b'
                  )}
                  onMouseDown={(e) => {
                    // Prevent blur before click fires
                    e.preventDefault()
                    handleSelectSuggestion(s)
                  }}
                >
                  <MapPin className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13.5px] leading-tight font-medium">{main}</p>
                    {secondary && (
                      <p className="text-muted-foreground mt-0.5 truncate text-[12px]">
                        {secondary}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
          <li className="border-border border-t px-4 py-2">
            <p className="text-muted-foreground text-[10.5px]">Powered by Google Maps</p>
          </li>
        </ul>
      )}
    </div>
  )
}
