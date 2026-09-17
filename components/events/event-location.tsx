'use client'

import { ExternalLink } from 'lucide-react'

interface EventLocationProps {
  venueName?: string | null
  venueAddress?: string | null
  venueCity?: string | null
  venueState?: string | null
  /** Fallback venue from FK relation (legacy) */
  venue?: {
    name: string
    address?: string | null
    city: string
    state?: string | null
    country: string
  } | null
}

export function EventLocation({
  venueName,
  venueAddress,
  venueCity,
  venueState,
  venue,
}: EventLocationProps) {
  // Prefer inline fields, fall back to FK venue
  const name = venueName || venue?.name
  const address = venueAddress || venue?.address
  const city = venueCity || venue?.city
  const state = venueState || venue?.state
  const country = venue?.country ?? 'Nigeria'

  if (!name) return null

  // Build a search query for Google Maps embed
  const parts = [name, address, city, state, country].filter(Boolean)
  const query = encodeURIComponent(parts.join(', '))

  // Directions link — opens Google Maps in a new tab
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`

  // Google Maps embed URL (no API key required for basic embeds)
  const embedUrl = `https://maps.google.com/maps?q=${query}&z=15&output=embed`

  return (
    <section aria-labelledby="location-heading">
      <h2
        id="location-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground"
      >
        Location
      </h2>

      <div className="border-border overflow-hidden rounded-2xl border">
        {/* Google Maps iframe */}
        <div className="relative h-[200px] w-full">
          <iframe
            title={`Map of ${name}`}
            src={embedUrl}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full"
          />
        </div>

        {/* Venue info bar */}
        <div className="bg-surface flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-foreground text-[14px] font-semibold">{name}</p>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              {[address, city, state].filter(Boolean).join(', ')}
            </p>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border text-muted-foreground hover:border-border/80 hover:text-foreground flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors"
            aria-label={`Get directions to ${name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Directions
          </a>
        </div>
      </div>
    </section>
  )
}
