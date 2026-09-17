import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarDays, CheckCircle } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getCalendarByShareToken } from '@/features/calendar/queries'
import { acceptShareByToken } from '@/features/calendar/actions'

export const metadata: Metadata = { title: 'Join Calendar' }

// ─── Server action (module-level — required by Next.js 16) ───────────────────

async function acceptShare(formData: FormData) {
  'use server'
  const token = formData.get('token') as string
  const session = await getSession()
  if (!session) redirect(`/login?redirect=/dashboard/calendar/join/${token}`)
  await acceptShareByToken(token)
  redirect('/dashboard/calendar')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JoinCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const session = await getSession()
  const { token } = await params

  if (!session) {
    redirect(`/login?redirect=/dashboard/calendar/join/${token}`)
  }

  const calendar = await getCalendarByShareToken(token)

  if (!calendar) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="text-muted-foreground mb-3 h-12 w-12" />
        <h1 className="text-[20px] font-semibold">Invalid share link</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          This calendar link is invalid or has been revoked.
        </p>
      </div>
    )
  }

  // Owner visiting their own share link
  if (calendar.userId === session.userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="text-muted-foreground mb-3 h-12 w-12" />
        <h1 className="text-[20px] font-semibold">This is your calendar</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Share this link with others so they can follow your calendar.
        </p>
        <a
          href="/dashboard/calendar"
          className="from-brand-600 mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r to-violet-600 px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Calendar
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div className="border-border bg-surface rounded-2xl border p-6 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${calendar.color}20` }}
        >
          <CalendarDays className="h-7 w-7" style={{ color: calendar.color }} />
        </div>
        <h1 className="text-[18px] font-semibold">{calendar.title}</h1>
        {calendar.description && (
          <p className="text-muted-foreground mt-1.5 text-[13px]">{calendar.description}</p>
        )}
        <p className="text-muted-foreground mt-2 text-[12.5px]">
          Shared by{' '}
          <span className="text-foreground font-medium">
            {calendar.user.name ?? calendar.user.email}
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-[12px]">
          {calendar._count.events} event{calendar._count.events !== 1 ? 's' : ''}
        </p>

        <form action={acceptShare} className="mt-5">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="from-brand-600 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r to-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <CheckCircle className="h-4.5 w-4.5" />
            Add to my calendars
          </button>
        </form>
      </div>
    </div>
  )
}
