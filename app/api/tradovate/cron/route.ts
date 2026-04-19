/**
 * Scheduled endpoint — syncs every active Tradovate account.
 * Called by Netlify Scheduled Function (see netlify/functions/tradovate-cron.ts)
 * or manually by a mentor for global refresh.
 *
 * Security: requires CRON_SECRET header to match env var, OR the caller must be a MENTOR.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { syncAllAccounts } from '@/lib/tradovate/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const headerSecret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET

  let authorized = false
  if (expected && headerSecret && headerSecret === expected) {
    authorized = true
  } else {
    const session = await auth()
    if (session?.user?.id) {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { role: true },
      })
      if (me?.role === 'MENTOR') authorized = true
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await syncAllAccounts()
  const totals = Object.values(results).reduce(
    (acc, r) => {
      acc.imported += r.imported
      acc.skipped += r.skipped
      acc.errors += r.errors
      return acc
    },
    { imported: 0, skipped: 0, errors: 0 }
  )

  return NextResponse.json({ ok: true, totals, results })
}

export async function GET(req: Request) {
  // Allow GET as well so Netlify scheduled functions and manual checks both work.
  return POST(req)
}
