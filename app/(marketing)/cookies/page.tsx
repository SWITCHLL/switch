import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Switch uses cookies and similar technologies on its platform.',
  alternates: { canonical: `${siteConfig.url}/cookies` },
}

export default function CookiesPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Suspense>
        <HeaderWithSession />
      </Suspense>

      <main className="flex-1 pt-[60px]">
        <div className="mx-auto max-w-[760px] px-5 py-16 sm:px-8 sm:py-20">
          {/* Header */}
          <div className="border-border/40 mb-10 border-b pb-8">
            <p className="text-muted-foreground mb-2 text-sm font-medium uppercase tracking-widest">
              Legal
            </p>
            <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Cookie Policy
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">Last Updated: August 27, 2026</p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              This Cookie Policy explains how Switch, operated by B&apos;s Technology Limited, uses
              cookies and similar technologies when you visit or use our website and related digital
              services.
            </p>

            <Section title="1. What Are Cookies?">
              <p>
                Cookies are small text files stored on your device when you visit a website. They
                help websites function properly, remember preferences, improve the user experience,
                and help us understand how visitors interact with our digital services.
              </p>
            </Section>

            <Section title="2. How Switch Uses Cookies">
              <h4 className="text-foreground mt-4 mb-2 font-semibold">A. Strictly Necessary Cookies</h4>
              <p>These cookies are essential for the platform to function and cannot be disabled:</p>
              <ul>
                <li>Account login and authentication</li>
                <li>Session management</li>
                <li>Security and fraud prevention</li>
                <li>Load balancing</li>
              </ul>

              <h4 className="text-foreground mt-4 mb-2 font-semibold">B. Functional Cookies</h4>
              <p>These cookies allow the platform to remember choices you make:</p>
              <ul>
                <li>User preferences and language settings</li>
                <li>Session choices and previously selected options</li>
              </ul>

              <h4 className="text-foreground mt-4 mb-2 font-semibold">C. Analytics Cookies</h4>
              <p>These cookies help us understand how users interact with Switch:</p>
              <ul>
                <li>How users navigate Switch and which pages or features are used</li>
                <li>Platform performance and technical errors</li>
                <li>General engagement patterns</li>
              </ul>

              <h4 className="text-foreground mt-4 mb-2 font-semibold">D. Performance and Security Technologies</h4>
              <ul>
                <li>Website performance monitoring</li>
                <li>Suspicious activity detection</li>
                <li>Unauthorized access attempt prevention</li>
                <li>System reliability</li>
              </ul>
            </Section>

            <Section title="3. Third-Party Cookies">
              <p>
                Some third-party services integrated with Switch may place or access cookies or
                similar technologies. These may include providers supporting payments, analytics,
                security, cloud infrastructure and customer support.
              </p>
            </Section>

            <Section title="4. Your Cookie Choices">
              <p>
                You can usually manage cookies through your browser settings. Depending on your
                browser, you may be able to block certain cookies, delete existing cookies, or
                receive notifications before cookies are stored. Disabling essential cookies may
                affect the functionality of Switch.
              </p>
            </Section>

            <Section title="5. Similar Technologies">
              <p>
                In addition to cookies, Switch may use similar technologies such as local storage,
                session storage, pixels, device identifiers and security tokens.
              </p>
            </Section>

            <Section title="6. Changes to This Cookie Policy">
              <p>
                We may update this Cookie Policy periodically to reflect changes in our technology,
                services or legal requirements. The latest version will always be made available on
                the Switch platform.
              </p>
            </Section>

            <Section title="7. Contact Us">
              <p>
                Switch — Operated by B&apos;s Technology Limited
                <br />
                For privacy-related enquiries, please contact us through the Switch platform.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-foreground mb-3 text-xl font-bold">{title}</h2>
      <div className="text-muted-foreground space-y-3 leading-relaxed">{children}</div>
    </div>
  )
}
