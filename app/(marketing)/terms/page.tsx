import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions governing your use of the Switch platform.',
  alternates: { canonical: `${siteConfig.url}/terms` },
}

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">Last Updated: August 27, 2026</p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Welcome to Switch. These Terms of Service govern your use of Switch&apos;s website,
              mobile applications, WhatsApp ticketing services, event management tools,
              payment-related features, QR check-in technology and other services provided by Switch,
              operated by B&apos;s Technology Limited.
            </p>

            <Section title="1. About Switch">
              <p>
                Switch is a technology platform designed to facilitate event discovery, ticketing,
                registration, event management, ticket validation and related services. Switch may
                enable users to access the platform through web, mobile and messaging channels,
                including WhatsApp.
              </p>
            </Section>

            <Section title="2. Eligibility">
              <p>
                You may only use Switch if you are legally capable of entering into an agreement
                under applicable law. If you use Switch on behalf of an organization, business or
                other entity, you confirm that you have the authority to accept these Terms on its
                behalf.
              </p>
            </Section>

            <Section title="3. Your Switch Account">
              <ul>
                <li>Provide accurate and current information</li>
                <li>Keep your login credentials secure</li>
                <li>Not impersonate another person or organization</li>
                <li>Notify us promptly of suspected unauthorized access</li>
              </ul>
              <p>
                You are responsible for activity carried out through your account, except where
                applicable law provides otherwise.
              </p>
            </Section>

            <Section title="4. Tickets and Event Registrations">
              <ul>
                <li>Tickets are generally subject to the terms communicated by the event organizer.</li>
                <li>You must provide accurate information.</li>
                <li>A ticket may be valid only for the event, date, time and category stated on it.</li>
                <li>Tickets may be delivered electronically, including through email, web, mobile or WhatsApp.</li>
                <li>QR codes may be used to validate entry.</li>
                <li>A ticket may be invalidated after successful use, cancellation, refund or detection of fraud.</li>
              </ul>
            </Section>

            <Section title="5. Ticket Pricing and Payments">
              <p>
                Prices, taxes, service fees and other charges, where applicable, will be displayed
                before you complete a transaction. By submitting a payment, you authorize the
                applicable payment provider to process the transaction. Switch may use third-party
                payment gateways to process payments.
              </p>
            </Section>

            <Section title="6. Refunds, Cancellations and Event Changes">
              <p>
                Unless otherwise required by applicable law, refund eligibility is determined by the
                event organizer&apos;s refund policy, the terms disclosed at the time of purchase,
                and the circumstances surrounding the cancellation or transaction. Please read our{' '}
                <a href="/refund-policy" className="text-brand-600 hover:underline">
                  Refund Policy
                </a>{' '}
                for full details.
              </p>
            </Section>

            <Section title="7. Event Organizer Responsibilities">
              <p>Event organizers using Switch agree to:</p>
              <ul>
                <li>Provide accurate event information</li>
                <li>Honour valid tickets issued through the platform</li>
                <li>Maintain necessary permissions, licenses and approvals</li>
                <li>Clearly communicate event rules and refund policies</li>
                <li>Use attendee information only for lawful and legitimate purposes</li>
                <li>Comply with applicable privacy, consumer protection, tax and other laws</li>
                <li>Not list fraudulent, unlawful or misleading events</li>
                <li>Take responsibility for the actual delivery and operation of your event</li>
              </ul>
            </Section>

            <Section title="8. Payouts and Settlement">
              <p>
                Where Switch provides organizer payment and settlement functionality, payouts may be
                subject to payment verification, fraud and risk checks, identity or business
                verification, applicable processing periods, chargebacks or payment reversals, taxes,
                fees and other lawful deductions.
              </p>
            </Section>

            <Section title="9. Acceptable Use">
              <p>You agree not to:</p>
              <ul>
                <li>Commit fraud or deception</li>
                <li>Sell or distribute unauthorized tickets</li>
                <li>Circumvent ticket limits or access controls</li>
                <li>Create fake accounts or impersonate another person</li>
                <li>Interfere with the platform or its security</li>
                <li>Attempt unauthorized access to systems or user information</li>
                <li>Upload malicious software or harmful code</li>
                <li>Misrepresent an event, organizer or business</li>
                <li>Use the services for unlawful purposes</li>
              </ul>
            </Section>

            <Section title="10. Intellectual Property">
              <p>
                The Switch platform, including its software, branding, designs, interfaces, logos,
                content and technology, is owned by or licensed to Switch and is protected by
                applicable intellectual property laws.
              </p>
            </Section>

            <Section title="11. Third-Party Services">
              <p>
                Switch may integrate with third-party platforms and providers, including payment
                gateways, messaging services, cloud infrastructure and other technology partners.
                Your use of those services may be governed by separate terms and privacy policies.
              </p>
            </Section>

            <Section title="12. Availability of the Services">
              <p>
                We aim to provide a reliable platform but do not guarantee uninterrupted or
                error-free availability. Switch may temporarily suspend or modify parts of the
                services for maintenance, security, system upgrades, technical failures, or legal
                and regulatory requirements.
              </p>
            </Section>

            <Section title="13. Disclaimer">
              <p>
                To the fullest extent permitted by applicable law, Switch provides the services on
                an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of
                any kind, express or implied.
              </p>
            </Section>

            <Section title="14. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, Switch and B&apos;s Technology Limited will
                not be liable for indirect, incidental, special, consequential or punitive damages
                arising from your use of the services. Where liability cannot legally be excluded,
                our liability will be limited to the extent permitted under applicable law.
              </p>
            </Section>

            <Section title="15. Suspension and Termination">
              <p>
                We may suspend or terminate access to Switch where we reasonably believe that you
                have violated these Terms, your activity creates security or legal risk, fraud or
                abuse is suspected, or we are required to do so by law.
              </p>
            </Section>

            <Section title="16. Changes to These Terms">
              <p>
                We may update these Terms from time to time. The updated version will be posted on
                Switch with a revised &ldquo;Last Updated&rdquo; date. We may also provide
                additional notice of material changes.
              </p>
            </Section>

            <Section title="17. Governing Law">
              <p>
                These Terms shall be governed by and interpreted in accordance with the applicable
                laws of the jurisdiction in which B&apos;s Technology Limited is duly incorporated
                and operates, subject to mandatory consumer protection and other applicable laws.
              </p>
            </Section>

            <Section title="18. Contact">
              <p>
                Switch — Operated by B&apos;s Technology Limited
                <br />
                For legal enquiries, please contact us through the Switch platform.
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
