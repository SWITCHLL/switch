'use client'

import { CheckCircle, Clock, LockKeyholeOpen, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/features/events/utils'
import type { GroupSlot } from '../types'
import type { GroupSlotStatus } from '@/app/generated/prisma/client'

interface SlotListProps {
  slots: GroupSlot[]
  currentUserId?: string
  onClaim?: (slotId: string) => void
  /** Id of the slot currently being claimed (shows loading state) */
  claimingSlotId?: string | null
}

const STATUS_CONFIG: Record<
  GroupSlotStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  OPEN: {
    label: 'Open',
    icon: LockKeyholeOpen,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  HELD: {
    label: 'Claimed',
    icon: UserCheck,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  PAID: {
    label: 'Paid',
    icon: CheckCircle,
    className: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  },
  RELEASED: {
    label: 'Released',
    icon: Clock,
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  },
}

export function SlotList({ slots, currentUserId, onClaim, claimingSlotId }: SlotListProps) {
  return (
    <ul className="space-y-3">
      {slots.map((slot) => {
        const config = STATUS_CONFIG[slot.status]
        const Icon = config.icon
        const isOpen = slot.status === 'OPEN'
        const isMySlot = slot.claimedBy === currentUserId
        const isClaiming = claimingSlotId === slot.id

        return (
          <li
            key={slot.id}
            className="border-border bg-surface flex items-center gap-3 rounded-xl border p-3.5"
          >
            {/* Status icon */}
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                config.className
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Label + seat info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">
                {slot.label ??
                  (slot.seat
                    ? `${slot.seat.rowLabel}${slot.seat.label}`
                    : (slot.ticketTypeName ?? 'Ticket'))}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11.5px]">
                {slot.status === 'OPEN' && 'Available'}
                {slot.status === 'HELD' &&
                  (slot.claimer?.name ? `Reserved by ${slot.claimer.name}` : 'Being claimed…')}
                {slot.status === 'PAID' &&
                  (slot.claimer?.name ? `Paid by ${slot.claimer.name}` : 'Confirmed')}
                {slot.status === 'RELEASED' && 'Released'}
              </p>
            </div>

            {/* Price */}
            <p className="shrink-0 text-[13px] font-bold">{formatPrice(slot.price)}</p>

            {/* Claim button */}
            {isOpen && onClaim && !isMySlot && (
              <button
                onClick={() => onClaim(slot.id)}
                disabled={isClaiming}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                  'bg-brand-600 hover:bg-brand-500 text-white',
                  isClaiming && 'cursor-not-allowed opacity-60'
                )}
              >
                {isClaiming ? 'Claiming…' : 'Claim'}
              </button>
            )}

            {/* "Your slot" badge */}
            {isMySlot && slot.status === 'HELD' && (
              <span className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                Yours
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
