'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { GroupCountdown } from '@/features/group-booking/components/group-countdown'
import { GroupProgress } from '@/features/group-booking/components/group-progress'
import { SlotList } from '@/features/group-booking/components/slot-list'
import { CopyLink } from '@/features/group-booking/components/copy-link'
import { claimSlot } from '@/features/group-booking/actions'
import type { GroupOrderDetail } from '@/features/group-booking/types'
import { cn } from '@/lib/utils'

interface GroupJoinClientProps {
  order: GroupOrderDetail
  currentUserId: string | null
  joinUrl: string
}

export function GroupJoinClient({ order, currentUserId, joinUrl }: GroupJoinClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [claimingSlotId, setClaimingSlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  const isClosed =
    order.status === 'COMPLETE' ||
    order.status === 'CANCELLED' ||
    order.status === 'EXPIRED' ||
    expired

  const handleClaim = useCallback(
    (slotId: string) => {
      if (!currentUserId) {
        router.push(`/login?next=/group/${order.code}`)
        return
      }
      setError(null)
      setClaimingSlotId(slotId)
      startTransition(async () => {
        const result = await claimSlot({ slotId })
        setClaimingSlotId(null)
        if (!result.success) {
          setError(result.error)
          return
        }
        // Redirect to checkout with pre-filled group slot context
        router.push(
          `/checkout/group-slot?slotId=${result.slotId}&amount=${result.amount}&currency=${result.currency}&code=${order.code}`
        )
      })
    },
    [currentUserId, order.code, router]
  )

  if (order.status === 'COMPLETE') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-500/10 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-[15px] font-semibold text-emerald-400">Group complete!</p>
        <p className="text-muted-foreground text-[13px]">
          All {order.totalSlots} tickets have been paid. Everyone&apos;s going! 🎉
        </p>
      </div>
    )
  }

  if (order.status === 'CANCELLED' || order.status === 'EXPIRED' || expired) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-500/10 p-6 text-center">
        <XCircle className="h-10 w-10 text-red-400" />
        <p className="text-[15px] font-semibold text-red-400">
          {order.status === 'CANCELLED' ? 'Group cancelled' : 'Group expired'}
        </p>
        <p className="text-muted-foreground text-[13px]">
          {order.status === 'CANCELLED'
            ? 'The organiser cancelled this group booking.'
            : 'The deadline passed before all members paid.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Timer + progress */}
      <div className="border-border bg-surface space-y-4 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold">Payment deadline</p>
          <GroupCountdown expiresAt={order.expiresAt} onExpired={() => setExpired(true)} />
        </div>
        <GroupProgress
          paidSlots={order.paidSlots}
          totalSlots={order.totalSlots}
          requireFullPayment={order.requireFullPayment}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-400">{error}</p>
      )}

      {/* Not logged in nudge */}
      {!currentUserId && (
        <p className="text-muted-foreground rounded-xl bg-zinc-800/50 px-4 py-3 text-[13px]">
          <a
            href={`/login?next=/group/${order.code}`}
            className="text-brand-400 font-semibold underline"
          >
            Sign in
          </a>{' '}
          to claim a spot in this group.
        </p>
      )}

      {/* Slot list */}
      <SlotList
        slots={order.slots}
        currentUserId={currentUserId ?? undefined}
        onClaim={isClosed || isPending ? undefined : handleClaim}
        claimingSlotId={claimingSlotId}
      />

      {/* Share link (always visible) */}
      <div>
        <p className="text-muted-foreground mb-2 text-[12px] font-medium">Share with your group</p>
        <CopyLink url={joinUrl} />
      </div>

      {/* Cancel button — only for initiator, only when no slots paid */}
      {currentUserId === order.initiator.id &&
        order.paidSlots === 0 &&
        order.status === 'PENDING' && <CancelGroupButton groupOrderId={order.id} />}
    </div>
  )
}

// ─── Cancel button (initiator only) ──────────────────────────────────────────

function CancelGroupButton({ groupOrderId }: { groupOrderId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleCancel() {
    if (!confirmOpen) {
      setConfirmOpen(true)
      return
    }
    setError(null)
    startTransition(async () => {
      const { cancelGroupOrder } = await import('@/features/group-booking/actions')
      const result = await cancelGroupOrder({ groupOrderId })
      if (!result.success) {
        setError(result.error)
        setConfirmOpen(false)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-2 pt-2">
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={isPending}
        className={cn(
          'w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all',
          confirmOpen
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {isPending ? 'Cancelling…' : confirmOpen ? 'Confirm cancel group' : 'Cancel group booking'}
      </button>
    </div>
  )
}
