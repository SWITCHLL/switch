import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/layout/site-footer'
import { HeaderWithSession } from '@/components/layout/header-with-session'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'How refunds, cancellations and event changes are handled on Switch.',
  alternates: { canonical: `${siteConfig.url}/refund-policy` },
}

export default function RefundPolicyPage() {
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
              Refund Policy
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">Last Updated: August 27, 2026</p>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              We want every ticket bought on Switch to feel like a safe decision — so here is exactly
              how refunds work, in plain terms.
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              This Refund Policy explains how refunds, cancellations, transfers and event changes
              are handled for tickets purchased through Switch, a platform operated by B&apos;s
              Technology Limited.
            </p>

            <Section title="1. Scope">
              <p>
                This policy applies to tickets and registrations purchased through the Switch
                platform. It sets out your rights and the general principles Switch applies when
                handling refund requests.
              </p>
            </Section>

            <Section title="2. Organizer Refund Policies">
              <p>
                Each event on Switch may have its own refund policy set by the organizer, specific
                to that event. Where an organizer&apos;s policy is silent on a situation,
                Switch&apos;s general terms below apply.
              </p>
              <p className="mt-3 font-medium text-foreground">
                Always check an event&apos;s refund terms before you buy — they can differ
                meaningfully from one organizer to the next.
              </p>
            </Section>

            <Section title="3. When You're Entitled to a Refund">
              <p>
                Regardless of an organizer&apos;s stated policy, you are generally entitled to a
                refund where:
              </p>
              <ul>
                <li>The event is cancelled by the organizer and not rescheduled</li>
                <li>The event is cancelled by Switch for legal, safety or regulatory reasons</li>
                <li>You were charged in error, or charged more than once for the same ticket</li>
                <li>
                  A ticket was not delivered or could not be validated due to a fault on
                  Switch&apos;s part
                </li>
                <li>
                  Applicable consumer protection law entitles you to a refund, regardless of the
                  organizer&apos;s stated terms
                </li>
              </ul>
            </Section>

            <Section title="4. Event Postponement or Rescheduling">
              <p>
                If an event is postponed or rescheduled, your existing ticket is generally honoured
                for the new date. Where you&apos;re unable to attend the rescheduled date, refund
                or transfer options — and any applicable window to request them — will be
                communicated by the organizer through Switch.
              </p>
            </Section>

            <Section title="5. Requesting a Refund">
              <p>To request a refund:</p>
              <ol>
                <li>Open your ticket or order confirmation in the Switch app or on the Switch website</li>
                <li>Select the event and choose &ldquo;Request Refund&rdquo;</li>
                <li>Follow the prompts to submit your request</li>
              </ol>
              <p className="mt-3">
                Where the event&apos;s terms allow self-service refunds, these are processed
                automatically. Where organizer approval is required, we forward your request and keep
                you updated on its status. Refund requests should be submitted as early as possible,
                and always within any window stated in the event&apos;s refund terms.
              </p>
            </Section>

            <Section title="6. Processing Time">
              <p>
                Once a refund is approved, we initiate it to your original payment method within a
                reasonable period. From there, the time it takes to reflect in your account depends
                on your bank, card issuer or payment provider, and can typically take a few business
                days beyond initiation.
              </p>
            </Section>

            <Section title="7. Fees and Deductions">
              <p>
                Service fees, payment processing charges and any other transaction costs disclosed
                at checkout are non-refundable, except where an event is cancelled outright or
                applicable law requires otherwise. Where a partial refund applies, these amounts may
                be deducted before the balance is returned to you.
              </p>
            </Section>

            <Section title="8. Non-Refundable Circumstances">
              <p>Except as described in Section 3 above, refunds are not generally available where:</p>
              <ul>
                <li>You simply change your mind or are unable to attend</li>
                <li>The refund request falls outside the event&apos;s stated refund window</li>
                <li>The ticket has already been used, transferred, or validated for entry</li>
                <li>The event proceeds as scheduled, even if your personal circumstances change</li>
              </ul>
            </Section>

            <Section title="9. Chargebacks and Disputes">
              <p>
                We encourage you to contact Switch support before initiating a chargeback with your
                bank or card issuer — most issues can be resolved faster this way. Filing a
                chargeback for a ticket that was validly issued and delivered may result in
                restrictions on your Switch account while the dispute is reviewed.
              </p>
            </Section>

            <Section title="10. Ticket Transfers as an Alternative">
              <p>
                Where an event permits it, transferring your ticket to someone else can be a faster
                alternative to a refund. Transfer availability is set by the organizer and shown on
                your ticket where applicable.
              </p>
            </Section>

            <Section title="11. Organizer Obligations">
              <p>
                Organizers using Switch agree to set clear, accurate refund terms, honour approved
                refunds promptly, and communicate any cancellations or changes as early as possible.
                Switch may withhold, adjust or reverse organizer payouts to the extent necessary to
                fund refunds owed to attendees.
              </p>
            </Section>

            <Section title="12. Changes to This Policy">
              <p>
                We may update this Refund Policy from time to time to reflect changes in our
                services or legal requirements. Material changes will be communicated through our
                website, application, email or WhatsApp, as appropriate. The version in effect at
                the time of your purchase governs that transaction.
              </p>
            </Section>

            <Section title="13. Contact Us">
              <p>
                Switch — Operated by B&apos;s Technology Limited
                <br />
                For refund enquiries, please contact us through the Switch platform.
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
