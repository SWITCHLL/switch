import Link from 'next/link'
import { getCategories } from '@/features/events'

export async function BrowseByCategorySection() {
  const categories = await getCategories()

  if (!categories.length) return null

  return (
    <section className="bg-surface-2 border-border border-y py-20 sm:py-28">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        {/* ── Header ── */}
        <div className="mb-10">
          <h2 className="text-foreground text-[22px] font-semibold tracking-tight sm:text-[26px]">
            Browse by category
          </h2>
        </div>

        {/* ── Category list ── */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/events"
            className="border-border bg-surface text-foreground hover:border-foreground/30 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition-colors"
          >
            All events
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/events?category=${cat.slug}`}
              className="border-border bg-surface text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
