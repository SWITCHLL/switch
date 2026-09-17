import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ArrowRight, Download } from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Pressroom — News, Announcements & Brand Resources',
  description:
    'Official Switch news, press releases, company information and media resources for journalists and partners.',
  openGraph: {
    title: 'Switch Pressroom',
    description: 'News, Announcements & Brand Resources.',
    url: `${siteConfig.url}/press`,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    type: 'website',
  },
  alternates: { canonical: `${siteConfig.url}/press` },
}

const pressReleases = [
  {
    title: 'Switch Announces Its Mission to Simplify Access to Experiences',
    category: 'Company News',
    description:
      'Switch introduces its vision for a simpler, more connected future of digital ticketing.',
  },
  {
    title: 'Switch Introduces a New Digital Ticketing Experience for Modern Events',
    category: 'Product News',
    description:
      'A closer look at how Switch approaches ticket sales, organizer tools and attendee access.',
  },
  {
    title: 'Switch Begins Building for the Future of Conversational Ticketing',
    category: 'Innovation',
    description:
      'Exploring a future where event access happens through the communication channels people already use every day.',
  },
]

const brandResources = [
  'Switch Logo',
  'Brand Guidelines',
  'Product Screenshots',
  'Founder and Leadership Profiles',
  'Company Boilerplate',
  'Press Images',
]

export default function PressPage() {
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
              Pressroom
            </p>
            <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
              News, Announcements &amp; Brand Resources.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg">
              Welcome to the official Switch Pressroom — where journalists, media organizations,
              partners and industry observers can find official news, company information and media
              resources about Switch.
            </p>
          </div>
        </section>

        {/* ── About Switch (boilerplate) ── */}
        <section className="border-border/40 border-b py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
              <div>
                <h2 className="text-foreground mb-4 text-2xl font-bold">About Switch</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Switch is a technology platform operated by B&apos;s Technology Limited, designed
                  to simplify how people discover, purchase, manage and access tickets. The platform
                  is being built to support a connected ticketing experience across digital channels,
                  with features designed for attendees and event organizers alike. Switch&apos;s
                  long-term vision extends beyond event ticketing, toward a broader future of digital
                  access.
                </p>
              </div>
              <div className="border-border bg-surface-2 rounded-2xl border p-6">
                <h3 className="text-foreground mb-3 font-semibold">Media Contact</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For press enquiries, interviews, company information or official statements:
                </p>
                <p className="text-foreground mt-3 text-sm font-medium">Press Team — Switch</p>
                <a
                  href="mailto:press@switchapp.io"
                  className="text-brand-600 hover:underline mt-1 block text-sm"
                >
                  press@switchapp.io
                </a>
                <p className="text-muted-foreground mt-4 text-xs">
                  Please include your name and media organization, deadline, topic of enquiry, and
                  the person or department you&apos;d like to speak with.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Press Releases ── */}
        <section className="py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-10 text-3xl font-bold">Press Releases</h2>
            <div className="space-y-5">
              {pressReleases.map((release) => (
                <article
                  key={release.title}
                  className="border-border group flex flex-col gap-2 rounded-2xl border p-6 transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:justify-between sm:gap-8"
                >
                  <div className="flex-1">
                    <span className="text-brand-600 mb-1.5 block text-xs font-semibold tracking-wide uppercase">
                      {release.category}
                    </span>
                    <h3 className="text-foreground font-bold">{release.title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                      {release.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
                      Read Release
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Brand Resources ── */}
        <section className="bg-surface-2 border-border/40 border-y py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h2 className="text-foreground mb-4 text-3xl font-bold">Brand Resources</h2>
                <div className="flex flex-wrap gap-2">
                  {brandResources.map((res) => (
                    <span
                      key={res}
                      className="border-border text-muted-foreground rounded-full border px-3.5 py-1.5 text-sm"
                    >
                      {res}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground mt-6 max-w-lg text-sm leading-relaxed">
                  Members of the media and approved partners may use Switch brand assets for
                  editorial and informational purposes, provided such use does not suggest
                  endorsement where none exists, misrepresent Switch or its products, modify
                  official logos in a misleading manner, or associate Switch&apos;s brand with
                  unlawful or harmful content.
                </p>
                <p className="text-muted-foreground mt-3 text-sm">
                  For partnership or commercial brand usage, please contact the Switch team for
                  approval.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  className="bg-foreground text-background inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-85"
                >
                  <Download className="h-4 w-4" />
                  Download Media Kit
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Company Boilerplate ── */}
        <section className="py-16">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-4 text-2xl font-bold">Company Boilerplate</h2>
            <div className="border-border-l-4 bg-surface-2 rounded-xl border p-6">
              <p className="text-muted-foreground leading-relaxed italic">
                Switch is a technology platform operated by B&apos;s Technology Limited, built to
                simplify how people discover, purchase, manage and access tickets. Starting with
                events, Switch is developing a connected ecosystem for modern digital access across
                web, mobile and messaging channels.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
