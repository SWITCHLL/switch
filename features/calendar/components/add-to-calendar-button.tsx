'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { CalendarPlus, Check, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { addSwitchEventToCalendar, createCalendarAndAddEvent } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarOption {
  id: string
  title: string
  color: string
}

interface AddToCalendarButtonProps {
  switchEventId: string
  calendars: CalendarOption[]
}

const CALENDAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#ea580c',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AddToCalendarButton({ switchEventId, calendars }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'create'>('list')
  const [addedCalIds, setAddedCalIds] = useState<Set<string>>(new Set())
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState(CALENDAR_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  function handleToggle() {
    setOpen((v) => !v)
    if (!open) {
      setView('list')
      setError(null)
      setNewTitle('')
    }
  }

  function handleAddToCalendar(calendarId: string) {
    setError(null)
    startTransition(async () => {
      const result = await addSwitchEventToCalendar(calendarId, switchEventId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setAddedCalIds((prev) => new Set([...prev, calendarId]))
      // Stay open so user can see the checkmark
    })
  }

  function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createCalendarAndAddEvent({
        title: newTitle.trim(),
        color: newColor,
        switchEventId,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setAddedCalIds((prev) => new Set([...prev, result.data.calendarId]))
      setView('list')
      setNewTitle('')
    })
  }

  const allAdded = calendars.length > 0 && calendars.every((c) => addedCalIds.has(c.id))

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Save to calendar"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
          allAdded
            ? 'border-emerald-500/40 text-emerald-400'
            : 'border-white/20 text-white/80 hover:border-white/40 hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
        )}
      >
        {allAdded ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
        )}
        {allAdded ? 'Saved' : 'Save'}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Add to calendar"
            className={cn(
              'absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10',
              'bg-[#1a1a18] shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
            )}
          >
            {view === 'list' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <p className="text-[13px] font-semibold text-white">Add to calendar</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <p className="px-4 py-2 text-[12px] text-red-400">{error}</p>
                )}

                {/* Calendars */}
                {calendars.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-[13px] text-white/60">You have no calendars yet.</p>
                    <p className="mt-0.5 text-[12px] text-white/40">Create one below to save this event.</p>
                  </div>
                ) : (
                  <ul role="list" className="max-h-52 overflow-y-auto py-1">
                    {calendars.map((cal) => {
                      const added = addedCalIds.has(cal.id)
                      return (
                        <li key={cal.id}>
                          <button
                            type="button"
                            onClick={() => !added && handleAddToCalendar(cal.id)}
                            disabled={isPending || added}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                              added
                                ? 'cursor-default text-white/40'
                                : 'text-white/80 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            {/* Color dot */}
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cal.color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-left">{cal.title}</span>
                            {isPending && !added ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30 shrink-0" />
                            ) : added ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Divider + create new */}
                <div className="border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => { setView('create'); setError(null) }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-[13px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/90"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>New calendar</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </>
            ) : (
              /* ── Create calendar form ── */
              <>
                <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="text-white/40 hover:text-white/70 transition-colors"
                    aria-label="Back"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <p className="text-[13px] font-semibold text-white">New calendar</p>
                </div>

                <form onSubmit={handleCreateAndAdd} className="p-4 space-y-3">
                  {error && (
                    <p className="text-[12px] text-red-400">{error}</p>
                  )}

                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-white/50">
                      Name *
                    </label>
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. My Events"
                      required
                      disabled={isPending}
                      className={cn(
                        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2',
                        'text-[13px] text-white placeholder:text-white/25',
                        'focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30',
                        'disabled:opacity-50'
                      )}
                    />
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-medium text-white/50">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CALENDAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          aria-label={c}
                          disabled={isPending}
                          className={cn(
                            'h-6 w-6 rounded-full transition-transform',
                            newColor === c
                              ? 'scale-110 ring-2 ring-white/60 ring-offset-1 ring-offset-[#1a1a18]'
                              : 'hover:scale-105'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !newTitle.trim()}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-semibold text-white transition-opacity',
                      isPending || !newTitle.trim()
                        ? 'cursor-not-allowed bg-violet-700/40 opacity-50'
                        : 'bg-violet-600 hover:bg-violet-500'
                    )}
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create & save event
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
