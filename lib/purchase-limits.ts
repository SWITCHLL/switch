import 'server-only'

import type { PrismaClient } from '@/app/generated/prisma/client'

// The transaction client Prisma passes to $transaction callbacks is a PrismaClient
// instance stripped of lifecycle methods. We use the full type here since the
// generated v7 client does not export a separate TransactionClient type.
type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Enforces per-order and per-user purchase limits for a given ticket type.
 *
 * Must be called inside a Prisma interactive transaction so the counts are
 * consistent with any locks already held by the caller.
 *
 * Throws `Error('LIMIT_MIN:<value>')` if requestedQty < minPerOrder
 * Throws `Error('LIMIT_MAX:<value>')` if requestedQty > maxPerOrder
 * Throws `Error('LIMIT_USER:<value>')` if existing + requestedQty > maxPerUser
 *
 * Null limits are treated as no-ops.
 */
export async function enforcePurchaseLimits(
  tx: TxClient,
  userId: string,
  ticketTypeId: string,
  requestedQty: number,
): Promise<void> {
  const tt = await tx.ticketType.findUniqueOrThrow({ where: { id: ticketTypeId } })

  if (tt.minPerOrder !== null && requestedQty < tt.minPerOrder) {
    throw new Error(`LIMIT_MIN:${tt.minPerOrder}`)
  }

  if (tt.maxPerOrder !== null && requestedQty > tt.maxPerOrder) {
    throw new Error(`LIMIT_MAX:${tt.maxPerOrder}`)
  }

  if (tt.maxPerUser !== null) {
    const existing = await tx.ticket.count({
      where: {
        userId,
        ticketTypeId,
        status: { in: ['ACTIVE', 'USED'] },
      },
    })

    if (existing + requestedQty > tt.maxPerUser) {
      throw new Error(`LIMIT_USER:${tt.maxPerUser}`)
    }
  }
}

// ─── Error parsing ────────────────────────────────────────────────────────────

export type PurchaseLimitErrorType = 'MIN' | 'MAX' | 'USER'

export interface PurchaseLimitError {
  type: PurchaseLimitErrorType
  limit: number
}

/**
 * Parses a thrown error from `enforcePurchaseLimits` into a structured object
 * suitable for mapping to user-facing messages in Server Actions.
 *
 * Returns `null` for any error that is not a purchase-limit error.
 */
export function parseLimitError(err: unknown): PurchaseLimitError | null {
  if (!(err instanceof Error)) return null

  const match = err.message.match(/^LIMIT_(MIN|MAX|USER):(\d+)$/)
  if (!match) return null

  return {
    type: match[1] as PurchaseLimitErrorType,
    limit: parseInt(match[2], 10),
  }
}
