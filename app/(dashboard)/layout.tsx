import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSession } from '@/lib/session'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/dashboard')

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader email={session.email} role={session.role} />
        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
