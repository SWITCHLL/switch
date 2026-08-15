import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

// Prisma 7 config files don't auto-load .env — load it explicitly
dotenv.config()

const databaseUrl = process.env.DATABASE_URL
const directUrl = process.env.DIRECT_URL

if (!databaseUrl) throw new Error('DATABASE_URL is not set in .env')

/**
 * Prisma 7 configuration.
 *
 * datasource.url here is used by CLI commands (migrate dev/deploy, db push, studio, etc.)
 *
 * Why DIRECT_URL for migrations:
 *   DATABASE_URL points to the Supabase transaction pooler (PgBouncer, port 6543).
 *   PgBouncer transaction mode does not support DDL statements or the advisory locks that
 *   prisma migrate needs to create/apply migrations.
 *
 *   DIRECT_URL is the session-mode connection (port 5432) that bypasses PgBouncer and lets
 *   Prisma communicate directly with PostgreSQL.
 *
 * The runtime app (lib/db.ts) builds its own pg.Pool from DATABASE_URL via PrismaPg adapter,
 * so this config file's datasource.url does not affect runtime queries at all.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Prefer DIRECT_URL (session-mode, bypasses PgBouncer) for CLI commands.
    // Falls back to DATABASE_URL when DIRECT_URL is not set.
    url: directUrl ?? databaseUrl,
  },
})
