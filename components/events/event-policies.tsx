'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Policy {
  id: string
  title: string
  content: string
}

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'refund',
    title: 'Refund policy',
    content:
      'All ticket sales are final. Refunds are only issued for cancelled or significantly changed events. For postponed events, tickets remain valid for the new date. To request a refund for a cancelled event, contact our support team within 14 days of the cancellation announcement.',
  },
  {
    id: 'terms',
    title: 'Terms & conditions',
    content:
      'By purchasing a ticket, you agree to the event terms and conditions. Tickets are non-transferable unless stated otherwise. The event organiser reserves the right to refuse entry. SWITCH acts as a ticketing platform and is not responsible for event cancellations or changes made by the organiser.',
  },
  {
    id: 'age',
    title: 'Age restrictions',
    content:
      'This event may have age restrictions set by the organiser. Please check the event description for specific age requirements. Valid government-issued photo ID may be required for entry. SWITCH is not responsible for denied entry due to age verification.',
  },
  {
    id: 'entry',
    title: 'Entry requirements',
    content:
      'Present your e-ticket (digital or printed) at the venue for scanning. Arrive at least 30 minutes before the event start time to avoid queues. The organiser reserves the right to refuse entry to anyone who appears intoxicated or disruptive.',
  },
]

interface EventPoliciesProps {
  /** Custom policies can be passed in; falls back to defaults */
  policies?: Policy[]
}

export function EventPolicies({ policies = DEFAULT_POLICIES }: EventPoliciesProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <section aria-labelledby="policies-heading">
      <h2
        id="policies-heading"
        className="mb-5 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40"
      >
        Event Policies
      </h2>

      <dl className="divide-y divide-white/8 rounded-2xl border border-white/8">
        {policies.map((policy) => {
          const isOpen = openId === policy.id
          return (
            <div key={policy.id}>
              <dt>
                <button
                  onClick={() => setOpenId(isOpen ? null : policy.id)}
                  aria-expanded={isOpen}
                  aria-controls={`policy-${policy.id}`}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 px-5 py-4',
                    'text-left text-[14px] font-medium text-white/80 transition-colors',
                    'hover:text-white focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-white/20',
                    isOpen && 'text-white'
                  )}
                >
                  <span>{policy.title}</span>
                  <span className="shrink-0 text-white/40" aria-hidden>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
              </dt>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.dd
                    id={`policy-${policy.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[13.5px] leading-[1.75] text-white/55">
                      {policy.content}
                    </p>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
