/**
 * One-off script: promote eddyben7@gmail.com to a fully active organizer.
 * Run: npx tsx scripts/make-organizer.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function buildConnectionString(): string {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!raw) throw new Error('Neither DIRECT_URL nor DATABASE_URL is set in .env')
  return raw.replace(/([?&])pgbouncer=true&?/gi, '$1').replace(/[?&]$/, '')
}

const adapter = new PrismaPg({ connectionString: buildConnectionString() })
const db = new PrismaClient({ adapter })

async function main() {
  const userId = 'cmsycj3mt000004lemmd5wd4m'
  const email = 'eddyben7@gmail.com'

  // 1. Ensure user role is ORGANIZER
  const user = await db.user.update({
    where: { id: userId },
    data: { role: 'ORGANIZER' },
    select: { id: true, email: true, role: true },
  })
  console.log('✓ User role:', user)

  // 2. Upsert organizer record with ACTIVE status
  const organizer = await db.organizer.upsert({
    where: { userId },
    create: {
      userId,
      name: 'Eddy Ben',
      slug: 'eddyben7',
      status: 'ACTIVE',
    },
    update: {
      status: 'ACTIVE',
    },
    select: { id: true, name: true, slug: true, status: true },
  })
  console.log('✓ Organizer record:', organizer)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
