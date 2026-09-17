'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { upsertEventSession, deleteEventSession } from '../actions'
import { SessionInclusionMode } from '@/app/generated/prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventSession {
  id: string
  title: string
  facilitator: string | null
  startsAt: Date | string
  endsAt: Date | string
  inclusionMode: string
  capacity: number | null
  price: number
  currency: string
  enrolmentCount?: number
}

interface SessionConfigTabProps {
  eventId: string
  sessions: EventSession[]
}

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50'

const selectCls = inputCls + ' [color-scheme:dark]'

const labelCls = 'block text-[11.5px] font-medium text-zinc-400 mb-1'

const INCLUSION_LABELS: Record<string, string> = {
  INCLUDED: 'Included (auto-enrolled)',
  OPTIONAL_FREE: 'Optional — Free',
  OPTIONAL_PAID: 'Optional — Paid',
  CAPACITY_LIMITED: 'Capacity-limited (free)',
}

function toLocalISO(d: Date | string): string {
  const date = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionConfigTab({ eventId, sessions: initial }: SessionConfigTabProps) {
  const [sessions, setSessions] = useState(initial)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({
    title: '', facilitator: '', description: '',
    startsAt: '', endsAt: '',
    inclusionMode: 'INCLUDED' as string,
    capacity: '', price: '0',
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setEditingId('new')
    setForm({ title: '', facilitator: '', description: '', startsAt: '', endsAt: '', inclusionMode: 'INCLUDED', capacity: '', price: '0' })
    setError(null)
  }

  function openEdit(s: EventSession) {
    setEditingId(s.id)
    setForm({
      title: s.title, facilitator: s.facilitator ?? '', description: '',
      startsAt: toLocalISO(s.startsAt), endsAt: toLocalISO(s.endsAt),
      inclusionMode: s.inclusionMode,
      capacity: s.capacity != null ? String(s.capacity) : '',
      price: String(s.price),
    })
    setError(null)
  }

  function closeForm() { setEditingId(null); setError(null) }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await upsertEventSession({
        eventId,
        ...(editingId !== 'new' ? { sessionId: editingId! } : {}),
        title: form.title,
        facilitator: form.facilitator || null,
        description: form.description || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        inclusionMode: form.inclusionMode as SessionInclusionMode,
        capacity: form.capacity !== '' ? Number(form.capacity) : null,
        price: Number(form.price),
      })

      if (!result.success) { setError(result.error); return }

      const updated: EventSession = {
        id: result.sessionId,
        title: form.title,
        facilitator: form.facilitator || null,
        startsAt: new Date(form.startsAt),
        endsAt: new Date(form.endsAt),
        inclusionMode: form.inclusionMode,
        capacity: form.capacity !== '' ? Number(form.capacity) : null,
        price: Number(form.price),
        currency: 'NGN',
        enrolmentCount: editingId !== 'new' ? (sessions.find((s) => s.id === editingId)?.enrolmentCount ?? 0) : 0,
      }

      if (editingId === 'new') setSessions((prev) => [...prev, updated].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()))
      else setSessions((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
      closeForm()
    })
  }

  function handleDelete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteEventSession(id, eventId)
      if (!result.success) { setError(result.error) }
      else { setSessions((prev) => prev.filter((s) => s.id !== id)) }
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-zinc-300">Sessions</h3>
        <button type="button" onClick={openNew} disabled={isPending || editingId !== null}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600/10 border border-violet-500/30 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 hover:bg-violet-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="h-3.5 w-3.5" /> Add Session
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">{error}</p>}

      {/* Inline form */}
      {editingId !== null && (
        <form onSubmit={handleSave} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold text-zinc-200">{editingId === 'new' ? 'New Session' : 'Edit Session'}</p>
            <button type="button" onClick={closeForm} disabled={isPending} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Title *</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Session title" disabled={isPending} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Facilitator / Speaker</label>
              <input className={inputCls} value={form.facilitator} onChange={(e) => setForm((p) => ({ ...p, facilitator: e.target.value }))} placeholder="e.g. John Doe" disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Starts At *</label>
              <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} required disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Ends At *</label>
              <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} required disabled={isPending} />
            </div>
            <div>
              <label className={labelCls}>Inclusion Mode</label>
              <select className={selectCls} value={form.inclusionMode} onChange={(e) => setForm((p) => ({ ...p, inclusionMode: e.target.value }))} disabled={isPending}>
                {Object.entries(INCLUSION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Capacity (blank = unlimited)</label>
              <input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Unlimited" disabled={isPending} />
            </div>
            {form.inclusionMode === 'OPTIONAL_PAID' && (
              <div>
                <label className={labelCls}>Price (kobo)</label>
                <input type="number" min={0} className={inputCls} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} disabled={isPending} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={closeForm} disabled={isPending} className="text-[13px] text-zinc-400 hover:text-zinc-200 px-3 py-1.5">Cancel</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
        </form>
      )}

      {/* Session list */}
      {sessions.length === 0 && editingId === null ? (
        <p className="text-[13px] text-zinc-500 text-center py-6">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const hasEnrolments = (s.enrolmentCount ?? 0) > 0
            const modeLabel = INCLUSION_LABELS[s.inclusionMode] ?? s.inclusionMode
            return (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="truncate text-[13px] font-medium text-zinc-100">{s.title}</p>
                  <p className="text-[11.5px] text-zinc-500">
                    {modeLabel}
                    {s.facilitator ? ` · ${s.facilitator}` : ''}
                    {hasEnrolments ? ` · ${s.enrolmentCount} enrolled` : ''}
                    {s.capacity != null ? ` / ${s.capacity}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => openEdit(s)} disabled={isPending || editingId !== null} aria-label={`Edit ${s.title}`} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {deleteConfirmId === s.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <span className="text-[11px] text-zinc-400">Delete?</span>
                      <button type="button" onClick={() => handleDelete(s.id)} disabled={isPending} className="rounded px-2 py-0.5 text-[11px] bg-red-600 text-white hover:bg-red-500 disabled:opacity-50">Yes</button>
                      <button type="button" onClick={() => setDeleteConfirmId(null)} disabled={isPending} className="rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setDeleteConfirmId(s.id)} disabled={isPending || hasEnrolments}
                      title={hasEnrolments ? 'Cannot delete — enrolments exist' : 'Delete'}
                      aria-label={`Delete ${s.title}`}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
