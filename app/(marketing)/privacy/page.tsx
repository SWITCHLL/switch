import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Switch collects, uses, and protects your personal information.',
  alternates: { canonical: `${siteConfig.url}/privacy` },
}

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">Last Updated: August 27, 2026</p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Switch, operated by B&apos;s Technology Limited (&ldquo;Switch,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us&rdquo; or &ldquo;our&rdquo;), is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, share, and protect your personal information
              when you use the Switch platform and related services.
            </p>

            <Section title="1. Information We Collect">
              <p>We collect information you provide directly and information collected automatically when you use our services.</p>
              <h4 className="text-foreground mt-4 mb-2 font-semibold">A. Account Information</h4>
              <p>Name, email address, phone number, and credentials you provide when registering.</p>
              <h4 className="text-foreground mt-4 mb-2 font-semibold">B. Transaction Information</h4>
              <p>Ticket purchases, event registrations, payment details, and order history.</p>
              <h4 className="text-foreground mt-4 mb-2 font-semibold">C. Automatically Collected Information</h4>
              <ul>
                <li>IP address, device type, browser type, operating system</li>
                <li>Log data, pages or features accessed</li>
                <li>Time and date of activity, device identifiers</li>
                <li>General location derived from technical information</li>
                <li>Cookies and similar technologies</li>
              </ul>
              <h4 className="text-foreground mt-4 mb-2 font-semibold">D. WhatsApp Information</h4>
              <p>
                Where you interact with Switch through WhatsApp, we may process information provided
                through that interaction, including your phone number, messages, event selections and
                transaction-related information necessary to provide our ticketing services.
              </p>
            </Section>

            <Section title="2. How We Use Your Information">
              <ul>
                <li>Create and manage your Switch account</li>
                <li>Process ticket purchases and registrations</li>
                <li>Issue and deliver tickets; generate and validate QR codes</li>
                <li>Process payments and settlements</li>
                <li>Provide customer support</li>
                <li>Send transactional notifications and confirmations</li>
                <li>Enable organizers to manage their events</li>
                <li>Improve the performance, security and functionality of our services</li>
                <li>Monitor and prevent fraud, abuse and unauthorized activity</li>
                <li>Analyse platform usage and event performance</li>
                <li>Comply with legal and regulatory obligations</li>
              </ul>
              <p className="mt-3">We process your information only where we have a lawful basis to do so.</p>
            </Section>

            <Section title="3. Payment Information">
              <p>
                Switch may use third-party payment providers to process payments. Switch does not
                necessarily store your complete payment card details; processing is handled through
                authorized payment partners and infrastructure. By making a payment through Switch,
                you may also be subject to the terms and privacy policies of the applicable payment
                provider.
              </p>
            </Section>

            <Section title="4. How We Share Information">
              <p><strong>Event Organizers.</strong> If you purchase or register for an event, relevant information may be made available to the event organizer to enable event administration, attendance management and customer support.</p>
              <p><strong>Service Providers.</strong> We may work with trusted providers supporting cloud hosting, payment processing, messaging and notifications, WhatsApp integrations, analytics, security, fraud prevention and customer support.</p>
              <p><strong>Legal and Regulatory Authorities.</strong> We may disclose information where required by law or reasonably necessary to comply with legal obligations, respond to valid requests, protect rights and safety, or prevent fraud and unlawful activity.</p>
              <p className="font-medium">We do not sell personal information.</p>
            </Section>

            <Section title="5. Data Security">
              <p>
                We use reasonable technical, administrative and organizational measures designed to
                protect your information. Switch&apos;s architecture includes security measures such
                as authentication controls, rate limiting, secure communications and encrypted
                database protections. However, no digital platform or method of transmission is
                completely secure. You are responsible for maintaining the confidentiality of your
                account credentials and protecting access to your devices.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain personal information only for as long as reasonably necessary to provide
                the services, complete transactions, maintain legitimate business records, resolve
                disputes, enforce our agreements, and comply with legal and regulatory requirements.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <ul>
                <li>Request access to your personal information</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of certain information</li>
                <li>Object to or restrict certain processing</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>Request information about how your data is processed</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us through the contact information provided on the
                Switch platform.
              </p>
            </Section>

            <Section title="8. Children's Privacy">
              <p>
                Switch is not intended for children below the minimum age required to independently
                use the services under applicable law. Where a minor attends or is registered for an
                event, information relating to that individual may be processed through a parent,
                guardian, school, institution or other authorized party, as appropriate.
              </p>
            </Section>

            <Section title="9. International Data Processing">
              <p>
                Switch may use service providers or infrastructure located in different jurisdictions.
                As a result, your information may be processed or stored outside the country in which
                you originally provided it, subject to appropriate safeguards and applicable law.
              </p>
            </Section>

            <Section title="10. Changes to This Privacy Policy">
              <p>
                We may update this Privacy Policy from time to time. Where material changes are made,
                we may provide notice through our website, application, email, WhatsApp or another
                appropriate communication channel.
              </p>
            </Section>

            <Section title="11. Contact Us">
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
