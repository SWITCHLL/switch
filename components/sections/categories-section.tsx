import Link from 'next/link'
import { getCategories } from '@/features/events'

export async function CategoriesSection() {
  const categories = await getCategories()
  if (!categories.length) return null

  // Total live events across all categories
  const totalEvents = categories.reduce((sum, c) => sum + (c._count?.events ?? 0), 0)

  return (
    <section
      className="border-border/50 border-b bg-background py-8 sm:py-14"
      aria-label="Explore by interest"
    >
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Label ── */}
        <p className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.18em] uppercase sm:mb-7">
          Explore by interest
        </p>

        {/* ── Category pill rail on mobile, typography list on desktop ── */}
        {/* Mobile: horizontal scrolling pill chips */}
        <div className="relative -mx-5 sm:hidden">
          <div
            className="pointer-events-none absolute top-0 left-0 z-10 h-full w-8"
            style={{ background: 'linear-gradient(to right, var(--background) 0%, transparent 100%)' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-0 right-0 z-10 h-full w-8"
            style={{ background: 'linear-gradient(to left, var(--background) 0%, transparent 100%)' }}
            aria-hidden
          />
          <nav
            aria-label="Event categories"
            className="flex items-center gap-2 overflow-x-auto px-5 pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <Link
              href="/events"
              className="shrink-0 rounded-full border border-foreground bg-foreground px-4 py-1.5 text-[13px] font-semibold text-background whitespace-nowrap"
            >
              All
              {totalEvents > 0 && <span className="ml-1 opacity-60 text-[11px]">{totalEvents}</span>}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/events?category=${cat.slug}`}
                className="border-border text-muted-foreground shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop: large typographic list */}
        <nav aria-label="Event categories" className="hidden sm:block">
          <ul className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            {/* "All" pill */}
            <li>
              <Link href="/events" className="group inline-flex items-baseline gap-1.5">
                <span
                  className="text-foreground font-semibold transition-colors duration-150 group-hover:text-brand-500"
                  style={{ fontSize: 'clamp(20px, 2.8vw, 32px)', letterSpacing: '-0.03em' }}
                >
                  All
                </span>
                {totalEvents > 0 && (
                  <span className="text-muted-foreground/60 group-hover:text-brand-500/60 text-[11px] font-medium transition-colors duration-150">
                    {totalEvents}
                  </span>
                )}
              </Link>
            </li>

            {categories.map((cat) => {
              const count = cat._count?.events ?? 0
              const hoverColor = cat.color ?? '#6366f1'
              return (
                <li key={cat.id}>
                  <Link
                    href={`/events?category=${cat.slug}`}
                    className="group inline-flex items-baseline gap-1.5"
                    style={{ '--cat-color': hoverColor } as React.CSSProperties}
                  >
                    <span
                      className="text-muted-foreground font-semibold transition-colors duration-150 group-hover:text-[--cat-color]"
                      style={{ fontSize: 'clamp(20px, 2.8vw, 32px)', letterSpacing: '-0.03em' }}
                    >
                      {cat.name}
                    </span>
                    {count > 0 && (
                      <span
                        className="text-[11px] font-medium opacity-0 transition-all duration-150 group-hover:opacity-100"
                        style={{ color: hoverColor }}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </section>
  )
}
