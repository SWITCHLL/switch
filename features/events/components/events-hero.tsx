export function EventsHero() {
  return (
    <section className="pt-[60px]" aria-label="Page hero">
      <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20">
        <h1
          className="text-foreground font-semibold tracking-tight"
          style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
          }}
        >
          Discover events.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-[15px] leading-relaxed">
          Concerts, comedy, culture, nightlife, and everything happening around you.
        </p>
      </div>
    </section>
  )
}
