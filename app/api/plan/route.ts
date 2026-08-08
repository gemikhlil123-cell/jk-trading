import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const plan = await prisma.tradingPlan.findUnique({
    where: { userId: session.user.id as string },
  })
  return NextResponse.json({ plan })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id as string

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const toNum = (v: unknown): number | null =>
    v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v)
  const toJson = (v: unknown): string | null =>
    Array.isArray(v) ? JSON.stringify(v) : null

  const data = {
    allowedSessions: toJson(body.allowedSessions),
    allowedSymbols: toJson(body.allowedSymbols),
    maxTradesPerDay: body.maxTradesPerDay === '' || body.maxTradesPerDay == null
      ? null
      : Math.trunc(Number(body.maxTradesPerDay)) || null,
    maxDailyLossUsd: toNum(body.maxDailyLossUsd),
    maxRiskPerTradeUsd: toNum(body.maxRiskPerTradeUsd),
    minRR: toNum(body.minRR),
    rules: Array.isArray(body.rules) ? JSON.stringify(body.rules) : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  }

  const plan = await prisma.tradingPlan.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })

  return NextResponse.json({ plan })
}
