/**
 * Economic calendar endpoint.
 *
 *  GET  → returns upcoming high/medium-impact events (cached, with live/fallback).
 *  POST → refreshes the EconomicEvent cache from FMP. Requires CRON_SECRET header
 *         (called by Netlify Scheduled Function) or a MENTOR session.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUpcomingEvents, refreshEconomicEvents } from '@/lib/economic-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { events, source } = await getUpcomingEvents(14)
  return NextResponse.json({ events, source })
}

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

  const count = await refreshEconomicEvents(21)
  return NextResponse.json({ ok: true, refreshed: count })
}
