import { type NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function POST(_req: NextRequest) {
  await deleteSession()
  // Use 303 See Other so the browser follows the redirect as a GET,
  // avoiding the default 307 behaviour that would re-POST to the target URL.
  return NextResponse.redirect(new URL('/', _req.url), { status: 303 })
}
