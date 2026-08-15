'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateProfile } from '../actions'

interface AccountSettingsFormProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
    createdAt: Date
  }
}

const inputCls = cn(
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5',
  'text-[14px] text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

export function AccountSettingsForm({ user }: AccountSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.success) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMsg(result.error)
      }
    })
  }

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      {/* ── Profile section ── */}
      <div className="border-border bg-surface rounded-2xl border p-6">
        <h2 className="mb-5 text-[14px] font-semibold">Profile</h2>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="border-border flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-[18px] font-bold">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? user.email}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-[14px] font-medium">{user.name ?? '—'}</p>
            <p className="text-muted-foreground text-[12.5px]">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback */}
          {status === 'success' && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-500">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Profile updated successfully.
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={user.name ?? ''}
              placeholder="Your name"
              required
              maxLength={100}
              className={inputCls}
            />
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium">Email Address</label>
            <input type="email" value={user.email} readOnly disabled className={inputCls} />
            <p className="text-muted-foreground text-[11.5px]">
              Email is tied to your login and cannot be changed here.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-opacity',
                isPending
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'from-brand-600 bg-gradient-to-r to-violet-600 hover:opacity-90'
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* ── Account info ── */}
      <div className="border-border bg-surface rounded-2xl border p-6">
        <h2 className="mb-4 text-[14px] font-semibold">Account Details</h2>
        <dl className="space-y-3">
          <Row
            label="Account ID"
            value={<code className="font-mono text-[12px]">{user.id}</code>}
          />
          <Row
            label="Role"
            value={
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  user.role === 'ADMIN'
                    ? 'bg-amber-500/10 text-amber-500'
                    : user.role === 'ORGANIZER'
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-zinc-500/10 text-zinc-400'
                )}
              >
                {user.role}
              </span>
            }
          />
          <Row label="Member since" value={format(new Date(user.createdAt), 'MMMM d, yyyy')} />
        </dl>
      </div>

      {/* ── Danger zone ── */}
      <div className="border-border rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="mb-1 text-[14px] font-semibold text-red-500">Danger Zone</h2>
        <p className="text-muted-foreground mb-4 text-[13px]">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          type="button"
          disabled
          title="Contact support to delete your account"
          className="cursor-not-allowed rounded-xl border border-red-500/30 px-4 py-2 text-[13px] font-medium text-red-500 opacity-50"
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-[13px]">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  )
}
