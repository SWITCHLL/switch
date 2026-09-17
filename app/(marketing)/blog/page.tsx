import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Blog — Ideas, Insights & Everything in Between',
  description:
    'Conversations about events, technology, culture, ticketing and the future of access.',
  openGraph: {
    title: 'Switch Blog',
    description: 'Ideas, Insights & Everything in Between.',
    url: `${siteConfig.url}/blog`,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    type: 'website',
  },
  alternates: { canonical: `${siteConfig.url}/blog` },
}

const posts = [
  {
    title: 'The Future of Ticketing Is Closer Than You Think',
    category: 'Technology & Innovation',
    slug: 'future-of-ticketing',
    description:
      'How technology is changing the way people discover, access and experience events — from mobile-first design to conversational ticketing, the future of access is becoming faster, more connected and more personal.',
  },
  {
    title: 'How to Create an Event People Actually Want to Attend',
    category: 'For Organizers',
    slug: 'create-event-people-want-to-attend',
    description:
      'Great events begin long before the doors open. Discover practical principles for building an experience that connects with people — from your idea and audience, to communication, ticketing and the moment itself.',
  },
  {
    title: 'Beyond the QR Code: Rethinking the Event Check-In Experience',
    category: 'Event Technology',
    slug: 'rethinking-event-check-in',
    description:
      'Check-in should feel like part of the experience, not the obstacle before it. A look at how smarter validation systems help organizers reduce friction and improve the arrival experience.',
  },
  {
    title: 'Why Community Is the New Audience',
    category: 'Culture & Community',
    slug: 'community-is-the-new-audience',
    description:
      'The strongest events don\'t just attract attendees — they build communities.',
  },
  {
    title: 'Selling Tickets Shouldn\'t Be Complicated',
    category: 'For Organizers',
    slug: 'selling-tickets-shouldnt-be-complicated',
    description:
      'For organizers, ticketing should create clarity, not more work. A look at the tools and experiences helping modern event creators spend less time managing systems and more time creating memorable moments.',
  },
]

const categories = [
  'Product Updates',
  'For Organizers',
  'Event Technology',
  'Culture & Community',
  'Industry Insights',
  'Behind Switch',
]

export default function BlogPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1 pt-[60px]">
        {/* ── Hero ── */}
        <section className="border-border/40 border-b py-20 sm:py-24">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <p className="text-brand-600 mb-4 text-sm font-semibold tracking-widest uppercase">
              Switch Blog
            </p>
            <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
              Ideas, Insights &amp; Everything in Between.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg">
              Conversations about events, technology, culture, ticketing and the future of access.
            </p>
          </div>
        </section>

        {/* ── Categories ── */}
        <div className="border-border/40 border-b">
          <div className="mx-auto max-w-[1120px] px-5 py-4 sm:px-8">
            <div className="flex flex-wrap gap-2">
              <span className="bg-foreground text-background rounded-full px-3.5 py-1.5 text-xs font-medium">
                All
              </span>
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Posts grid ── */}
        <section className="py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="border-border bg-surface group flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md"
                >
                  <span className="text-brand-600 mb-3 text-xs font-semibold tracking-wide uppercase">
                    {post.category}
                  </span>
                  <h2 className="text-foreground mb-3 text-lg font-bold leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                    {post.description}
                  </p>
                  <div className="mt-5">
                    <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
                      Read More
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-border/40 bg-surface-2 border-t py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="max-w-lg">
              <h2 className="text-foreground mb-2 text-2xl font-bold">Have a Story Worth Sharing?</h2>
              <p className="text-muted-foreground mb-6">
                We&apos;re always interested in the people, ideas and experiences shaping the future.
              </p>
              <Link
                href="mailto:press@switchapp.io"
                className="bg-foreground text-background inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-85"
              >
                Submit a Story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
