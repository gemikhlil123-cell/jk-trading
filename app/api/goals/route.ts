import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const METRICS = ['PNL', 'TRADE_COUNT', 'WIN_RATE', 'DISCIPLINE']
const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id as string, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    goals: goals.map((g) => ({ ...g, target: g.target.toString() })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const metric = String(body.metric || '')
  const period = String(body.period || '')
  const target = Number(body.target)
  if (!METRICS.includes(metric) || !PERIODS.includes(period) || Number.isNaN(target)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }
  const goal = await prisma.goal.create({
    data: { userId: session.user.id as string, metric, period, target },
  })
  return NextResponse.json({ goal: { ...goal, target: goal.target.toString() } })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  // ensure ownership
  await prisma.goal.deleteMany({ where: { id, userId: session.user.id as string } })
  return NextResponse.json({ ok: true })
}
