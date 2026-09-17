import { format } from 'date-fns'
import { Clock, User } from 'lucide-react'

interface ScheduleItem {
  id: string
  title: string
  description: string | null
  hostName: string | null
  startsAt: Date | string | null
  endsAt: Date | string | null
  position: number
}

interface EventProgrammeProps {
  items: ScheduleItem[]
}

function formatTimeRange(
  startsAt: Date | string | null,
  endsAt: Date | string | null
): string | null {
  if (!startsAt) return null
  const fmt = (d: Date | string) => format(new Date(d), 'h:mm a')
  return endsAt ? `${fmt(startsAt)} – ${fmt(endsAt)}` : fmt(startsAt)
}

export function EventProgramme({ items }: EventProgrammeProps) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="programme-heading">
      <h2
        id="programme-heading"
        className="mb-6 text-[20px] font-semibold tracking-tight text-foreground"
      >
        Programme
      </h2>

      <ol className="relative space-y-0">
        {items.map((item, idx) => {
          const timeStr = formatTimeRange(item.startsAt, item.endsAt)
          const isLast = idx === items.length - 1

          return (
            <li key={item.id} className="relative flex gap-4 pb-6">
              {/* Timeline line */}
              {!isLast && (
                <span
                  aria-hidden
                  className="bg-border absolute left-[15px] top-8 bottom-0 w-px"
                />
              )}

              {/* Step circle */}
              <div className="border-border bg-surface text-muted-foreground relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold">
                {idx + 1}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-foreground text-[15px] font-semibold">{item.title}</p>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {item.hostName && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-[13px]">
                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {item.hostName}
                    </span>
                  )}
                  {timeStr && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-[13px]">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {timeStr}
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
