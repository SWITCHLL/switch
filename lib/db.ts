/**
 * Prisma Client Singleton
 *
 * Passes the connection string directly to PrismaPg so it manages its own
 * internal pool. This is the recommended pattern for Supabase — fewer moving
 * parts than wiring up a pg.Pool manually.
 *
 * URL priority:
 *   DIRECT_URL  → session-mode pooler (port 5432) — preferred for driver adapter
 *   DATABASE_URL → transaction-mode pooler (port 6543) — fallback
 *
 * ?pgbouncer=true is stripped — it's a Prisma engine hint, not a valid pg param.
 */
import 'server-only'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function buildConnectionString(): string {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!raw) throw new Error('Neither DIRECT_URL nor DATABASE_URL is set in .env')
  // Strip ?pgbouncer=true — only meaningful to the legacy Prisma query engine
  return raw.replace(/([?&])pgbouncer=true&?/gi, '$1').replace(/[?&]$/, '')
}

function createPrismaClient(): PrismaClient {
  const connectionString = buildConnectionString()
  // Pass a config object (not a string) so we can control pool size.
  // PrismaPg will create a pg.Pool internally from this config.
  const adapter = new PrismaPg({
    connectionString,
    max: 2, // small pool — Supabase free tier ~20 connection limit
    idleTimeoutMillis: 10_000, // release idle connections before server-side timeout
    connectionTimeoutMillis: 10_000,
  })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
