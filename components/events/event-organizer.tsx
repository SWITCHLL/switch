import Image from 'next/image'
import Link from 'next/link'
import { Building2, ArrowUpRight } from 'lucide-react'
import type { EventDetail } from '@/features/events/types'

interface EventOrganizerProps {
  organizer: EventDetail['organizer']
}

export function EventOrganizer({ organizer }: EventOrganizerProps) {
  return (
    <section aria-labelledby="organizer-heading">
      <h2
        id="organizer-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground"
      >
        Organiser
      </h2>

      <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
        {/* Avatar */}
        <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          {organizer.logoUrl ? (
            <Image
              src={organizer.logoUrl}
              alt={organizer.name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="text-muted-foreground h-6 w-6" aria-hidden />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-foreground truncate text-[14px] font-semibold">{organizer.name}</p>
          <p className="text-muted-foreground mt-0.5 text-[12px]">Event organiser</p>
        </div>

        {/* View profile link */}
        <Link
          href={`/organizers/${organizer.slug}`}
          className="border-border text-muted-foreground hover:border-border/80 hover:text-foreground flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`View ${organizer.name} organiser profile`}
        >
          View
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
