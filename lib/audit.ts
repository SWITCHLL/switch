/**
 * Audit Logging Helper
 *
 * Writes an immutable audit log entry inside the caller's Prisma transaction.
 * Always call this within an existing `db.$transaction(...)` block so the
 * audit write is atomic with the state change it records.
 *
 * Usage:
 *   await db.$transaction(async (tx) => {
 *     // ... state change ...
 *     await writeAuditLog(tx, { entityType: 'RESERVATION', ... })
 *   })
 */
import 'server-only'
import type { PrismaClient } from '@/app/generated/prisma/client'
import type { AuditEntityType, AuditAction } from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'

/**
 * A Prisma interactive-transaction client.
 * Excludes the top-level client methods that are unavailable inside a transaction.
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export interface WriteAuditLogParams {
  /** The type of entity being audited */
  entityType: AuditEntityType
  /** The primary key of the audited record */
  entityId: string
  /** The action that triggered this log entry */
  action: AuditAction
  /** Status value before the change (omit if not a status transition) */
  oldStatus?: string
  /** Status value after the change (omit if not a status transition) */
  newStatus?: string
  /** userId of the acting user, or "system" for background jobs */
  actor: string
  /** Additional context — e.g. reason, adminNote, refundAmount */
  metadata?: Record<string, unknown>
}

/**
 * Write a single audit log entry inside the given Prisma transaction.
 *
 * @param tx     - The interactive transaction client from `db.$transaction`
 * @param params - Log entry fields; see `WriteAuditLogParams`
 */
export async function writeAuditLog(
  tx: PrismaTransactionClient,
  params: WriteAuditLogParams
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      actor: params.actor,
      // Cast required: Prisma's InputJsonValue is narrower than Record<string, unknown>
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  })
}
