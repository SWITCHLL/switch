import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'About SWITCH',
  description:
    'Switch is building a simpler, smarter way to discover, buy, manage and experience tickets. The better way to experience what\'s next.',
  openGraph: {
    title: 'About SWITCH',
    description: 'The better way to experience what\'s next.',
    url: `${siteConfig.url}/about`,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    type: 'website',
  },
  alternates: { canonical: `${siteConfig.url}/about` },
}

const values = [
  {
    title: 'Think Simply',
    description: 'Complex problems deserve thoughtful solutions, not unnecessarily complicated ones.',
  },
  {
    title: 'Move With Intention',
    description: 'We act with purpose and focus on what creates meaningful impact.',
  },
  {
    title: 'Be Reliable',
    description: 'Trust is earned through consistency.',
  },
  {
    title: 'Stay Curious',
    description: 'Questions lead to better ideas.',
  },
  {
    title: 'Put People First',
    description: 'Technology should serve people, not make life harder.',
  },
  {
    title: 'Build for the Future',
    description: 'We make decisions with tomorrow in mind.',
  },
]

const features = [
  { title: 'Create', description: 'Build and publish your event with clear details, ticket categories and pricing.' },
  { title: 'Sell', description: 'Reach audiences through a seamless digital ticketing experience.' },
  { title: 'Manage', description: 'Track sales, attendees and event activity from one central dashboard.' },
  { title: 'Check In', description: 'Validate tickets quickly with secure QR code technology.' },
  { title: 'Understand', description: 'Access meaningful insights into your audience and event performance.' },
  { title: 'Grow', description: 'Build stronger, more connected experiences with technology that scales with you.' },
]

export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1 pt-[60px]">
        {/* ── Hero ── */}
        <section className="border-border/40 border-b py-20 sm:py-28">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-brand-600 mb-4 text-sm font-semibold tracking-widest uppercase">
                About Switch
              </p>
              <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The Better Way to Experience What&apos;s Next.
              </h1>
              <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
                Switch is building a simpler, smarter way to discover, buy, manage and experience
                tickets. We believe access to great experiences should feel effortless — whether
                it&apos;s a concert, a conference, a worship service, a festival, a comedy show, a
                campus event or a cultural gathering.
              </p>
            </div>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <h2 className="text-foreground mb-4 text-2xl font-bold">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To become one of Africa&apos;s most trusted digital access and ticketing
                  platforms — connecting people to the experiences, places and opportunities that
                  matter to them.
                </p>
              </div>
              <div>
                <h2 className="text-foreground mb-4 text-2xl font-bold">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To remove friction from how people access experiences, by building simple,
                  reliable and intelligent technology for ticketing and beyond.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Built for organizers ── */}
        <section className="bg-surface-2 border-border/40 border-y py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="mb-12">
              <h2 className="text-foreground text-3xl font-bold">
                Built for Organizers. Designed for People.
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Switch brings the entire ticketing journey together in one seamless experience.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-surface border-border rounded-xl border p-6"
                >
                  <h3 className="text-foreground mb-2 font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="mb-12">
              <h2 className="text-foreground text-3xl font-bold">Our Values</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v) => (
                <div key={v.title} className="flex gap-4">
                  <div className="bg-brand-600 mt-1 h-2 w-2 flex-shrink-0 rounded-full" />
                  <div>
                    <h3 className="text-foreground mb-1 font-semibold">{v.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Where we're going ── */}
        <section className="bg-surface-2 border-border/40 border-y py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <h2 className="text-foreground mb-4 text-3xl font-bold">Where We&apos;re Going</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Switch begins with event ticketing, but we see a much bigger future. As we grow,
                we plan to extend the idea of digital access beyond events — into transportation
                and other everyday experiences.
              </p>
              <p className="text-foreground font-medium">
                One trusted platform. Multiple ways to move.
              </p>
              <p className="text-muted-foreground mt-6 text-sm">
                Switch is a product of B&apos;s Technology Limited, built with a long-term vision
                for technology that solves real problems and creates meaningful connections.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
