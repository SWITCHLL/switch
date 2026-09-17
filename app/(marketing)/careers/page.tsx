import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Careers — Build What\'s Next With Switch',
  description:
    'Join the Switch team. We\'re building tools that make access simpler, and we\'re looking for curious minds and bold ideas.',
  openGraph: {
    title: 'Careers at Switch',
    description: 'Build What\'s Next With Switch.',
    url: `${siteConfig.url}/careers`,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    type: 'website',
  },
  alternates: { canonical: `${siteConfig.url}/careers` },
}

const whySwitch = [
  {
    title: 'Build Something That Matters',
    description:
      'Your work will help shape how thousands, and eventually millions, of people access experiences.',
  },
  {
    title: 'Take Ownership',
    description:
      'We believe great people do their best work when they\'re trusted to think, contribute and take responsibility.',
  },
  {
    title: 'Move With Purpose',
    description:
      'We\'re ambitious, but ambition works best when it\'s connected to a meaningful mission.',
  },
  {
    title: 'Learn Constantly',
    description:
      'Technology moves quickly, and so do we. We value curiosity, experimentation and people who are always learning.',
  },
  {
    title: 'Build Together',
    description:
      'The best products are rarely built by one person. We believe in collaboration, honest conversation and respect for different perspectives.',
  },
]

const values = [
  { title: 'Think Simply', description: 'Complex problems deserve thoughtful solutions.' },
  { title: 'Move With Intention', description: 'Act with purpose; focus on meaningful impact.' },
  { title: 'Be Reliable', description: 'Trust is earned through consistency.' },
  { title: 'Stay Curious', description: 'Questions lead to better ideas.' },
  { title: 'Put People First', description: 'Technology should serve people.' },
  { title: 'Build for the Future', description: 'Make decisions with tomorrow in mind.' },
]

const teams = [
  'Engineering',
  'Product',
  'Product Design',
  'Customer Experience',
  'Operations',
  'Partnerships',
  'Marketing & Growth',
  'Sales',
  'Finance',
  'Legal & Compliance',
  'Data & Analytics',
  'Event Success',
]

export default function CareersPage() {
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
                Careers
              </p>
              <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Build What&apos;s Next With Switch.
              </h1>
              <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
                At Switch, we&apos;re building tools that make access simpler: connecting people to
                events and experiences today, and to new ways of moving through everyday life
                tomorrow. That takes curious minds, bold ideas, and people who care deeply about
                building things that actually work.
              </p>
              <p className="text-muted-foreground mt-4 text-lg">
                If that sounds like you, we&apos;d love to meet you.
              </p>
            </div>
          </div>
        </section>

        {/* ── Why Switch ── */}
        <section className="py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-12 text-3xl font-bold">Why Work at Switch?</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {whySwitch.map((item) => (
                <div key={item.title} className="border-border bg-surface rounded-2xl border p-6">
                  <h3 className="text-foreground mb-2 font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="bg-surface-2 border-border/40 border-y py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-10 text-3xl font-bold">Our Values</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v) => (
                <div key={v.title} className="flex gap-3">
                  <div className="bg-brand-600 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
                  <div>
                    <p className="text-foreground font-semibold">{v.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Teams ── */}
        <section className="py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-8 text-3xl font-bold">Teams at Switch</h2>
            <div className="flex flex-wrap gap-3">
              {teams.map((team) => (
                <span
                  key={team}
                  className="border-border text-muted-foreground rounded-full border px-4 py-2 text-sm font-medium"
                >
                  {team}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Open Positions ── */}
        <section className="border-border/40 border-t py-20">
          <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
            <h2 className="text-foreground mb-4 text-3xl font-bold">Open Positions</h2>
            <p className="text-muted-foreground mb-10 max-w-lg">
              We&apos;re building our team, and current opportunities will be posted here as they
              become available.
            </p>

            {/* Empty state */}
            <div className="border-border rounded-2xl border border-dashed px-8 py-16 text-center">
              <p className="text-foreground font-semibold">No openings posted yet</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Check back soon — roles will appear here as we grow.
              </p>
            </div>

            {/* Talent network CTA */}
            <div className="border-border mt-12 rounded-2xl border p-8">
              <h3 className="text-foreground mb-2 text-xl font-bold">
                Don&apos;t See the Right Role?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg">
                We&apos;re always interested in exceptional people. Send us your CV and tell us
                who you are, what you do, and what you believe you could help Switch build.
              </p>
              <a
                href="mailto:careers@switchapp.io"
                className="bg-foreground text-background inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-85"
              >
                Join Our Talent Network
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-muted-foreground mt-4 text-sm">
                We care more about your ability to think, learn and contribute than about checking
                every box.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
