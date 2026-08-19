'use client'

import { useState, useTransition, useRef, useId } from 'react'
import Image from 'next/image'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveSpeaker, deleteSpeaker } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpeakerItem {
  id: string
  name: string
  role: string | null
  avatarUrl: string | null
  position: number
}

interface SpeakersManagerProps {
  eventId: string
  initialSpeakers: SpeakerItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpeakersManager({ eventId, initialSpeakers }: SpeakersManagerProps) {
  const [speakers, setSpeakers] = useState<SpeakerItem[]>(initialSpeakers)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [globalError, setGlobalError] = useState('')

  function openNew() {
    setEditingId('new')
  }

  function closeEditor() {
    setEditingId(null)
  }

  function handleSaved(speaker: SpeakerItem) {
    setSpeakers((prev) => {
      const idx = prev.findIndex((s) => s.id === speaker.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = speaker
        return next
      }
      return [...prev, speaker]
    })
    setEditingId(null)
    setGlobalStatus('success')
    setTimeout(() => setGlobalStatus('idle'), 3000)
  }

  function handleDeleted(id: string) {
    setSpeakers((prev) => prev.filter((s) => s.id !== id))
    setGlobalStatus('success')
    setTimeout(() => setGlobalStatus('idle'), 3000)
  }

  function handleError(msg: string) {
    setGlobalStatus('error')
    setGlobalError(msg)
  }

  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-500/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Users className="text-brand-400 h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold">Speakers / Guests / Performers</h2>
            <p className="text-muted-foreground text-[12px]">
              Add people featured at this event — speakers, DJs, guests, hosts, etc.
            </p>
          </div>
        </div>

        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="from-brand-600 flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r to-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Feedback */}
      {globalStatus === 'success' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Saved successfully.
        </div>
      )}
      {globalStatus === 'error' && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Add / edit form */}
      {editingId !== null && (
        <SpeakerForm
          eventId={eventId}
          speaker={editingId === 'new' ? null : (speakers.find((s) => s.id === editingId) ?? null)}
          onSaved={handleSaved}
          onCancel={closeEditor}
          onError={handleError}
        />
      )}

      {/* Speaker list */}
      {speakers.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {speakers.map((s) => (
            <SpeakerRow
              key={s.id}
              speaker={s}
              eventId={eventId}
              onEdit={() => setEditingId(s.id)}
              onDeleted={() => handleDeleted(s.id)}
              onError={handleError}
            />
          ))}
        </ul>
      ) : editingId === null ? (
        <p className="text-muted-foreground py-6 text-center text-[13px]">
          No speakers added yet. Click <strong className="text-foreground">Add</strong> to get
          started.
        </p>
      ) : null}
    </section>
  )
}

// ─── Speaker Row ──────────────────────────────────────────────────────────────

function SpeakerRow({
  speaker,
  eventId,
  onEdit,
  onDeleted,
  onError,
}: {
  speaker: SpeakerItem
  eventId: string
  onEdit: () => void
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Remove "${speaker.name}" from this event?`)) return
    startTransition(async () => {
      const result = await deleteSpeaker(speaker.id, eventId)
      if (result.success) {
        onDeleted()
      } else {
        onError(result.error)
      }
    })
  }

  return (
    <li className="border-border flex items-center gap-3 rounded-xl border px-4 py-3">
      {/* Avatar */}
      <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        {speaker.avatarUrl ? (
          <Image
            src={speaker.avatarUrl}
            alt={speaker.name}
            fill
            className="object-cover"
            sizes="40px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="text-muted-foreground h-5 w-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{speaker.name}</p>
        {speaker.role && (
          <p className="text-muted-foreground truncate text-[12px]">{speaker.role}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
          aria-label={`Edit ${speaker.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-lg p-1.5 text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          aria-label={`Remove ${speaker.name}`}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </li>
  )
}

// ─── Speaker Form ─────────────────────────────────────────────────────────────

function SpeakerForm({
  eventId,
  speaker,
  onSaved,
  onCancel,
  onError,
}: {
  eventId: string
  speaker: SpeakerItem | null
  onSaved: (s: SpeakerItem) => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [avatarUrl, setAvatarUrl] = useState(speaker?.avatarUrl ?? '')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isEditing = speaker !== null

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setIsUploading(true)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/upload/speaker-avatars', { method: 'POST', body: fd })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || json.error) {
        setUploadError(json.error ?? 'Upload failed')
      } else {
        setAvatarUrl(json.url ?? '')
      }
    } catch {
      setUploadError('Network error — could not upload image.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('eventId', eventId)
    if (isEditing) formData.set('speakerId', speaker.id)
    if (avatarUrl) formData.set('avatarUrl', avatarUrl)
    else formData.delete('avatarUrl')

    startTransition(async () => {
      const result = await saveSpeaker(formData)
      if (result.success) {
        // Reconstruct the speaker object to pass back
        onSaved({
          id: result.data.id,
          name: (formData.get('name') as string) || '',
          role: (formData.get('role') as string) || null,
          avatarUrl: avatarUrl || null,
          position: speaker?.position ?? 999,
        })
      } else {
        onError(result.error)
      }
    })
  }

  return (
    <div className="border-border mb-4 rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold">{isEditing ? 'Edit person' : 'Add person'}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            className="bg-muted relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            aria-label="Upload avatar"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar preview"
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                {isUploading ? (
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="text-muted-foreground h-4 w-4" />
                  </>
                )}
              </div>
            )}
            {/* Hover overlay */}
            {avatarUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Upload className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium">Photo (optional)</p>
            <p className="text-muted-foreground mt-0.5 text-[11.5px]">JPEG, PNG, WebP · max 4 MB</p>
            {uploadError && <p className="mt-1 text-[11.5px] text-red-500">{uploadError}</p>}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="text-muted-foreground hover:text-foreground mt-1 text-[11.5px] underline"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            aria-hidden="true"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={speaker?.name ?? ''}
            placeholder="e.g. Burna Boy"
            className={inputCls}
          />
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium">Role</label>
          <input
            name="role"
            maxLength={80}
            defaultValue={speaker?.role ?? ''}
            placeholder="e.g. Headliner, Speaker, Guest DJ, Host…"
            className={inputCls}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground border-border hover:bg-muted rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-opacity',
              isPending || isUploading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
            )}
          >
            {(isPending || isUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save changes' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
)
