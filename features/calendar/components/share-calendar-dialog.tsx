'use client'

import { useState, useTransition } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { shareCalendar, removeCalendarShare } from '../actions'
import type { CalendarWithEvents } from '../types'

interface ShareCalendarDialogProps {
  calendar: CalendarWithEvents
}

export function ShareCalendarDialog({ calendar }: ShareCalendarDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/calendar/join/${calendar.shareToken}`
      : `/dashboard/calendar/join/${calendar.shareToken}`

  function copyLink() {
    void navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const formData = new FormData(e.currentTarget)
    formData.set('calendarId', calendar.id)

    startTransition(async () => {
      const result = await shareCalendar(formData)
      if (result.success) {
        setSuccess('Calendar shared successfully')
        ;(e.target as HTMLFormElement).reset()
      } else {
        setError(result.error)
      }
    })
  }

  function handleRemove(shareId: string) {
    setRemovingId(shareId)
    startTransition(async () => {
      await removeCalendarShare(shareId)
      setRemovingId(null)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Share calendar">
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{calendar.title}&quot;</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-5">
          {/* Share link */}
          <div>
            <p className="mb-2 text-[13px] font-medium">Share link</p>
            <div className="flex items-center gap-2">
              <div className="border-border bg-muted flex-1 truncate rounded-lg border px-3 py-2 font-mono text-[11.5px]">
                {shareUrl}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={copyLink}
                aria-label="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground mt-1.5 text-[11.5px]">
              Anyone with this link can add your calendar to theirs.
            </p>
          </div>

          {/* Share by email */}
          <div>
            <p className="mb-2 text-[13px] font-medium">Share by email</p>
            <form onSubmit={handleShare} className="flex gap-2">
              <Input
                name="email"
                type="email"
                placeholder="user@example.com"
                required
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Sharing…' : 'Share'}
              </Button>
            </form>
            {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
            {success && <p className="mt-1.5 text-[12px] text-emerald-400">{success}</p>}
          </div>

          {/* Current shares */}
          {calendar.shares.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium">Shared with</p>
              <ul className="space-y-2">
                {calendar.shares.map((s) => (
                  <li
                    key={s.id}
                    className="border-border flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-[13px] font-medium">
                        {s.sharedWith.name ?? s.sharedWith.email}
                      </p>
                      {s.sharedWith.name && (
                        <p className="text-muted-foreground text-[11.5px]">
                          {s.sharedWith.email}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={removingId === s.id}
                      onClick={() => handleRemove(s.id)}
                      aria-label="Remove share"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
