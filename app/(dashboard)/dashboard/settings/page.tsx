import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { AccountSettingsForm } from '@/features/account/components/account-settings-form'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-[640px] space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Manage your profile and account preferences.
        </p>
      </div>

      <AccountSettingsForm user={user} />
    </div>
  )
}
