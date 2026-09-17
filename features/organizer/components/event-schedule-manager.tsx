'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { upsertScheduleItem, deleteScheduleItem } from '../actions'
import { format } from 'date-fns'
import { DateTimePicker } from '@/components/ui/date-time-picker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleItemData {
  id: string
  title: string
  description: string | null
  hostName: string | null
  speakerId: string | null
  startsAt: Date | string | null
  endsAt: Date | string | null
  position: number
}

export interface SpeakerOption {
  id: string
  name: string
  role: string | null
  avatarUrl: string | null
}

interface EventScheduleManagerProps {
  eventId: string
  initialItems: ScheduleItemData[]
  speakers: SpeakerOption[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
)

const labelCls = 'block text-[13px] font-medium mb-1.5'

function toLocalISO(d: Date | string | null): string {
  if (!d) return ''
  const date = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function formatTimeRange(
  startsAt: Date | string | null,
  endsAt: Date | string | null
): string | null {
  if (!startsAt) return null
  const fmt = (d: Date | string) =>
    format(new Date(d), 'h:mm a')
  return endsAt ? `${fmt(startsAt)} – ${fmt(endsAt)}` : fmt(startsAt)
}

// ─── Default form state ───────────────────────────────────────────────────────

interface FormState {
  title: string
  description: string
  hostName: string
  speakerId: string
  startsAt: string
  endsAt: string
}

function defaultForm(item?: ScheduleItemData): FormState {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    hostName: item?.hostName ?? '',
    speakerId: item?.speakerId ?? '',
    startsAt: toLocalISO(item?.startsAt ?? null),
    endsAt: toLocalISO(item?.endsAt ?? null),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventScheduleManager({
  eventId,
  initialItems,
  speakers,
}: EventScheduleManagerProps) {
  const [items, setItems] = useState<ScheduleItemData[]>(
    [...initialItems].sort((a, b) => a.position - b.position)
  )
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setEditingId('new')
    setForm(defaultForm())
    setError(null)
  }

  function openEdit(item: ScheduleItemData) {
    setEditingId(item.id)
    setForm(defaultForm(item))
    setError(null)
  }

  function closeForm() {
    setEditingId(null)
    setError(null)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // When a speaker is selected, auto-fill hostName from their name if empty
  function handleSpeakerChange(speakerId: string) {
    setField('speakerId', speakerId)
    if (speakerId) {
      const sp = speakers.find((s) => s.id === speakerId)
      if (sp && !form.hostName) {
        setField('hostName', sp.name)
      }
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const nextPosition =
      editingId === 'new'
        ? items.length
        : (items.find((i) => i.id === editingId)?.position ?? items.length)

    startTransition(async () => {
      const result = await upsertScheduleItem({
        eventId,
        scheduleItemId: editingId !== 'new' ? editingId! : undefined,
        title: form.title,
        description: form.description || undefined,
        hostName: form.hostName || undefined,
        speakerId: form.speakerId || null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        position: nextPosition,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const updated: ScheduleItemData = {
        id: result.scheduleItemId,
        title: form.title,
        description: form.description || null,
        hostName: form.hostName || null,
        speakerId: form.speakerId || null,
        startsAt: form.startsAt ? new Date(form.startsAt) : null,
        endsAt: form.endsAt ? new Date(form.endsAt) : null,
        position: nextPosition,
      }

      if (editingId === 'new') {
        setItems((prev) => [...prev, updated])
      } else {
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
      }

      closeForm()
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteScheduleItem(id, eventId)
      if (!result.success) {
        setError(result.error)
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }
      setDeleteConfirmId(null)
    })
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold">Event Programme</h2>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            Add agenda items like opening prayer, keynote, breaks, etc.
          </p>
        </div>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            disabled={isPending}
            className="from-brand-600 flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r to-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {error}
        </p>
      )}

      {/* Inline form */}
      {editingId !== null && (
        <form
          onSubmit={handleSave}
          className="border-border mb-4 rounded-xl border p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-semibold">
              {editingId === 'new' ? 'New programme item' : 'Edit item'}
            </p>
            <button
              type="button"
              onClick={closeForm}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>
              Item <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
              placeholder="e.g. Opening Prayer, Keynote Address, Lunch Break…"
              disabled={isPending}
            />
          </div>

          {/* Host — speaker picker + free text */}
          <div>
            <label className={labelCls}>Host / Lead</label>

            {speakers.length > 0 && (
              <div className="mb-2">
                <select
                  value={form.speakerId}
                  onChange={(e) => handleSpeakerChange(e.target.value)}
                  disabled={isPending}
                  className={inputCls}
                >
                  <option value="">— select from speakers —</option>
                  {speakers.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}{sp.role ? ` (${sp.role})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground mt-1 text-[11.5px]">
                  Or type a name below if they're not in your speakers list.
                </p>
              </div>
            )}

            <input
              className={inputCls}
              value={form.hostName}
              onChange={(e) => setField('hostName', e.target.value)}
              placeholder={speakers.length > 0 ? 'Or enter a name manually' : 'e.g. Pastor John, Dr. Ada Obi'}
              disabled={isPending}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start time</label>
              <DateTimePicker
                value={form.startsAt}
                onChange={(v) => setField('startsAt', v)}
                placeholder="Pick start time"
                disabled={isPending}
              />
            </div>
            <div>
              <label className={labelCls}>End time</label>
              <DateTimePicker
                value={form.endsAt}
                onChange={(v) => setField('endsAt', v)}
                placeholder="Pick end time"
                fromDate={form.startsAt ? new Date(form.startsAt) : undefined}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={2}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Any extra details visible to attendees"
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground border-border hover:bg-muted rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.title.trim()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-opacity',
                isPending || !form.title.trim()
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
              )}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId === 'new' ? 'Add to programme' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* Programme list */}
      {items.length === 0 && editingId === null ? (
        <p className="text-muted-foreground py-6 text-center text-[13px]">
          No programme items yet. Click <strong className="text-foreground">Add item</strong> to build your agenda.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, idx) => {
            const timeStr = formatTimeRange(item.startsAt, item.endsAt)
            const hostDisplay = item.hostName

            return (
              <li
                key={item.id}
                className="border-border flex items-start gap-3 rounded-xl border px-4 py-3"
              >
                {/* Position indicator */}
                <span className="text-muted-foreground mt-0.5 shrink-0 text-[12px] font-medium tabular-nums w-5 text-center">
                  {idx + 1}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">{item.title}</p>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
                    {hostDisplay && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {hostDisplay}
                      </span>
                    )}
                    {timeStr && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeStr}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    disabled={isPending || editingId !== null}
                    aria-label={`Edit ${item.title}`}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors disabled:opacity-30"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {deleteConfirmId === item.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <span className="text-muted-foreground text-[11px]">Remove?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="rounded px-2 py-0.5 text-[11px] bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-foreground rounded px-2 py-0.5 text-[11px]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      disabled={isPending || editingId !== null}
                      aria-label={`Remove ${item.title}`}
                      className="rounded-lg p-1.5 text-red-500/60 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
