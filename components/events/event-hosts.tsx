import Image from 'next/image'
import { User } from 'lucide-react'
import type { EventDetail } from '@/features/events/types'

interface EventHostsProps {
  speakers: EventDetail['speakers']
}

export function EventHosts({ speakers }: EventHostsProps) {
  if (!speakers || speakers.length === 0) return null

  return (
    <section aria-labelledby="hosts-heading">
      <h2
        id="hosts-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        {buildHeading(speakers)}
      </h2>

      <ul
        className={
          speakers.length === 1
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'
        }
        role="list"
      >
        {speakers.map((speaker) => (
          <li
            key={speaker.id}
            className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]"
          >
            {/* Avatar */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
              {speaker.avatarUrl ? (
                <Image
                  src={speaker.avatarUrl}
                  alt={speaker.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-5 w-5 text-white/30" aria-hidden />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">{speaker.name}</p>
              {speaker.role && (
                <p className="mt-0.5 truncate text-[12px] text-white/50">{speaker.role}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function buildHeading(speakers: { role: string | null }[]): string {
  const seen = new Set<string>()
  const roles: string[] = []
  for (const s of speakers) {
    if (s.role) {
      const n = s.role.trim()
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase())
        roles.push(n)
      }
    }
  }
  if (roles.length === 0) return 'Lineup'
  const pluralised = roles.map((r) => (r.toLowerCase().endsWith('s') ? r : `${r}s`))
  if (pluralised.length === 1) return pluralised[0]
  const last = pluralised.pop()!
  return `${pluralised.join(', ')} & ${last}`
}
