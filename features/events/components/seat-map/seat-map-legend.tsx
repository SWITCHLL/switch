'use client'

export function SeatMapLegend() {
  const items = [
    { color: 'bg-surface border-border', label: 'Available' },
    { color: 'bg-brand-600 border-brand-500', label: 'Selected' },
    { color: 'bg-amber-500/15 border-amber-500/40', label: 'Held' },
    { color: 'bg-muted/60 border-border/40', label: 'Sold' },
    { color: 'bg-muted/40 border-border/30', label: 'Blocked' },
  ]

  const types = [
    { dot: 'bg-purple-400', label: 'VVIP' },
    { dot: 'bg-brand-400', label: 'VIP' },
    { dot: 'bg-amber-400', label: 'Premium' },
    { dot: 'bg-emerald-400', label: 'Accessible' },
  ]

  return (
    <div className="border-border/60 mt-8 border-t pt-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-5 w-5 rounded border ${item.color} inline-block`} aria-hidden />
              <span className="text-muted-foreground text-[11.5px]">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-border hidden h-4 w-px md:block" />

        {/* Seat type dots */}
        <div className="flex flex-wrap items-center gap-3">
          {types.map((t) => (
            <div key={t.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${t.dot} inline-block`} aria-hidden />
              <span className="text-muted-foreground text-[11.5px]">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
