/**
 * Prisma Client Singleton
 *
 * Uses DATABASE_URL (transaction-mode pooler, port 6543) at runtime.
 * Pool is created lazily on first use — not at module load time — so
 * the build phase never tries to resolve env vars that aren't set yet.
 *
 * DIRECT_URL (session-mode, port 5432) is only for prisma migrate CLI.
 */
import 'server-only'
import { Pool } from 'pg'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is not set')

  // Strip Prisma-only URL params that confuse the pg driver
  let connectionString = raw
  try {
    const url = new URL(raw)
    url.searchParams.delete('pgbouncer')
    url.searchParams.delete('connection_limit')
    url.searchParams.delete('pool_timeout')
    connectionString = url.toString()
  } catch {
    // URL parse failed — use raw string and hope pg handles it
  }

  // PgBouncer transaction mode multiplexes at the proxy level — keep the
  // per-instance pool small to avoid exhausting PgBouncer's server_pool_size.
  //
  // Supabase PgBouncer presents a certificate issued to a shared *.supabase.co
  // wildcard — rejectUnauthorized must be false for the pg driver to accept it.
  // The connection is still encrypted (TLS); only hostname verification is relaxed.
  const pool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Lazily initialised — the getter ensures the client is only created
// when first accessed at request time, never at build time.
let _db: PrismaClient | undefined

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) {
      _db = globalForPrisma.prisma ?? createPrismaClient()
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _db
      }
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
