'use client'

import { useState, useTransition } from 'react'
import { enrolInSession } from '../actions'
import type { EventSessionWithEnrolmentCount } from '../types'
import { SessionInclusionMode } from '@/app/generated/prisma/client'

interface SessionSelectorProps {
  ticketId: string
  sessions: EventSessionWithEnrolmentCount[]
  /** Called on successful enrolment */
  onEnrolled?: () => void
}

function formatTimeRange(startsAt: Date | string, endsAt: Date | string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price / 100)
}

function isSessionFull(session: EventSessionWithEnrolmentCount): boolean {
  return session.remaining !== null && session.remaining <= 0
}

function isIncluded(session: EventSessionWithEnrolmentCount): boolean {
  return session.inclusionMode === SessionInclusionMode.INCLUDED
}

function isSelectable(session: EventSessionWithEnrolmentCount): boolean {
  return (
    !isIncluded(session) &&
    !isSessionFull(session) &&
    session.inclusionMode !== SessionInclusionMode.OPTIONAL_PAID
  )
}

export function SessionSelector({ ticketId, sessions, onEnrolled }: SessionSelectorProps) {
  // Pre-select all INCLUDED sessions (non-interactive) and nothing else
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(sessions.filter(isIncluded).map((s) => s.id))
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleSession(session: EventSessionWithEnrolmentCount) {
    if (!isSelectable(session)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(session.id)) {
        next.delete(session.id)
      } else {
        next.add(session.id)
      }
      return next
    })
    setError(null)
  }

  const selectableSelectedIds = [...selectedIds].filter((id) => {
    const sess = sessions.find((s) => s.id === id)
    return sess && !isIncluded(sess)
  })

  function handleEnrol() {
    if (selectableSelectedIds.length === 0) return

    startTransition(async () => {
      setError(null)
      const result = await enrolInSession({ ticketId, sessionIds: selectableSelectedIds })

      if (!result.success) {
        setError(result.error)
        return
      }

      onEnrolled?.()
    })
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No sessions are available for this event.</p>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-200">Sessions</h3>

      {/* Session checklist */}
      <div
        className="space-y-3"
        role="group"
        aria-label="Available sessions"
      >
        {sessions.map((session) => {
          const included = isIncluded(session)
          const full = isSessionFull(session)
          const selectable = isSelectable(session)
          const isPaid = session.inclusionMode === SessionInclusionMode.OPTIONAL_PAID
          const checked = selectedIds.has(session.id)
          const isDisabled = !selectable || isPending

          return (
            <div
              key={session.id}
              className={[
                'relative flex items-start gap-3 rounded-xl border p-4 transition-all',
                full || isPaid || included
                  ? 'cursor-default border-zinc-800 bg-zinc-900/40'
                  : checked
                    ? 'cursor-pointer border-violet-500 bg-violet-500/10'
                    : 'cursor-pointer border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800',
                (full || isPaid) ? 'opacity-60' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Checkbox */}
              <div className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  id={`session-${session.id}`}
                  checked={checked}
                  disabled={isDisabled || included || full || isPaid}
                  onChange={() => toggleSession(session)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 disabled:cursor-not-allowed"
                  aria-describedby={`session-${session.id}-desc`}
                />
              </div>

              {/* Content */}
              <label
                htmlFor={`session-${session.id}`}
                className={[
                  'flex flex-1 cursor-pointer flex-col gap-1',
                  (isDisabled || included || full || isPaid) ? 'cursor-default' : '',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{session.title}</span>

                  {/* Badges */}
                  {included && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Included
                    </span>
                  )}
                  {full && (
                    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                      Full
                    </span>
                  )}
                  {isPaid && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                      Paid add-on
                    </span>
                  )}
                </div>

                {/* Facilitator */}
                {session.facilitator && (
                  <span className="text-xs text-zinc-400">
                    Facilitated by {session.facilitator}
                  </span>
                )}

                {/* Date & time */}
                <span className="text-xs text-zinc-400">
                  {formatDate(session.startsAt)} &middot;{' '}
                  {formatTimeRange(session.startsAt, session.endsAt)}
                </span>

                {/* Price + capacity */}
                <div
                  id={`session-${session.id}-desc`}
                  className="flex items-center gap-3"
                >
                  <span
                    className={[
                      'text-xs font-medium',
                      session.price === 0 ? 'text-emerald-400' : 'text-zinc-300',
                    ].join(' ')}
                  >
                    {formatPrice(session.price, session.currency)}
                  </span>

                  {session.remaining !== null && (
                    <span
                      className={[
                        'text-xs',
                        full
                          ? 'text-red-400'
                          : session.remaining <= 5
                            ? 'text-amber-400'
                            : 'text-zinc-500',
                      ].join(' ')}
                    >
                      {full
                        ? 'No spots left'
                        : session.remaining === 1
                          ? '1 spot left'
                          : `${session.remaining} spots left`}
                    </span>
                  )}
                </div>
              </label>
            </div>
          )
        })}
      </div>

      {/* Enrol button — only shown when at least one selectable session is checked */}
      {selectableSelectedIds.length > 0 && (
        <button
          type="button"
          onClick={handleEnrol}
          disabled={isPending}
          className="w-full rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-busy={isPending}
        >
          {isPending
            ? 'Enrolling…'
            : `Enrol in ${selectableSelectedIds.length} session${selectableSelectedIds.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  )
}
