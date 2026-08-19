'use client'

import { MapPin, ExternalLink } from 'lucide-react'
import type { EventDetail } from '@/features/events/types'

interface EventLocationProps {
  venue: EventDetail['venue']
}

export function EventLocation({ venue }: EventLocationProps) {
  if (!venue) return null

  const address = [venue.name, venue.city, venue.state, venue.country].filter(Boolean).join(', ')

  const mapsQuery = encodeURIComponent(address)
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  // Static map image via a public embed-friendly API
  const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${mapsQuery}&zoom=14&size=800x280&scale=2&style=element:geometry%7Ccolor:0x1a1a1a&style=element:labels.text.fill%7Ccolor:0x757575&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3Kro`

  return (
    <section aria-labelledby="location-heading">
      <h2
        id="location-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        Location
      </h2>

      {/* Map placeholder — lazy loaded */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
        {/* Static map image with loading="lazy" */}
        <div className="relative h-[180px] w-full bg-white/[0.03]">
          {/* Fallback map grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Pin marker */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
              <MapPin className="h-5 w-5 text-black" aria-hidden />
            </div>
          </div>
        </div>

        {/* Venue info */}
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[14px] font-semibold text-white">{venue.name}</p>
            <p className="mt-0.5 text-[13px] text-white/50">
              {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
            </p>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[12.5px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
            aria-label={`Get directions to ${venue.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Directions
          </a>
        </div>
      </div>
    </section>
  )
}
