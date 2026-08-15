import { type NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(_req: NextRequest) {
  await deleteSession()
  return NextResponse.redirect(new URL('/', _req.url))
}
