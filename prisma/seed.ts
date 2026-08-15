/**
 * Database Seed
 *
 * Run with:  npm run db:seed
 *
 * Idempotent — uses upsert so re-running is safe.
 */
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL / DIRECT_URL is not set')

const adapter = new PrismaPg({ connectionString, max: 1 })
const db = new PrismaClient({ adapter })

// ─── Categories ───────────────────────────────────────────────────────────────
// Colours match the gradient start stops used in BrowseByCategorySection.
const categories = [
  {
    name: 'Music',
    slug: 'music',
    color: '#8b5cf6', // violet-500
    imageUrl: null,
  },
  {
    name: 'Technology',
    slug: 'technology',
    color: '#3b82f6', // blue-500
    imageUrl: null,
  },
  {
    name: 'Arts & Culture',
    slug: 'arts',
    color: '#ec4899', // pink-500
    imageUrl: null,
  },
  {
    name: 'Comedy',
    slug: 'comedy',
    color: '#f59e0b', // amber-500
    imageUrl: null,
  },
  {
    name: 'Sports',
    slug: 'sports',
    color: '#10b981', // emerald-500
    imageUrl: null,
  },
  {
    name: 'Theatre',
    slug: 'theatre',
    color: '#f43f5e', // rose-500
    imageUrl: null,
  },
  {
    name: 'Spoken Word',
    slug: 'spoken-word',
    color: '#6366f1', // indigo-500
    imageUrl: null,
  },
  {
    name: 'Film & Cinema',
    slug: 'film',
    color: '#64748b', // slate-500
    imageUrl: null,
  },
]

async function main() {
  console.log('🌱  Seeding categories…')

  for (const cat of categories) {
    await db.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, color: cat.color },
      create: cat,
    })
    console.log(`   ✓  ${cat.name} (${cat.slug})`)
  }

  console.log(`\n✅  Seeded ${categories.length} categories.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
