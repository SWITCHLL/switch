import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSession } from '@/lib/session'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/dashboard')

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader email={session.email} role={session.role} />
        {/* Extra bottom padding on mobile so content clears the bottom nav */}
        <main className="flex-1 px-4 py-5 pb-24 sm:px-8 sm:py-8 sm:pb-8">{children}</main>
      </div>
      <MobileBottomNav role={session.role} />
    </div>
  )
}
