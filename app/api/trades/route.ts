import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeKillzone, computeCyclePhase } from '@/lib/autoTag'
import { z } from 'zod'

const createTradeSchema = z.object({
  symbol: z.enum(['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  entryTime: z.string().datetime(),
  exitTime: z.string().datetime().optional(),
  pnl: z.number().optional(),
  rrAchieved: z.number().optional(),
  rrPlanned: z.number().optional(),
  isBacktest: z.boolean().default(false),
  screenshotUrl: z.string().url().optional(),
  notes: z.string().optional(),
  chartImages: z.string().optional(),
  selfRating: z.number().int().min(1).max(10).optional(),
  emotionalState: z.string().optional(),
  entryReasonIds: z.array(z.string()).min(1, 'يجب اختيار سبب دخول واحد على الأقل'),
  backtestSessionId: z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const isBacktest = searchParams.get('isBacktest') === 'true'
  const symbol = searchParams.get('symbol')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const trades = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
      isBacktest,
      ...(symbol ? { symbol: symbol as import('@prisma/client').Symbol } : {}),
    },
    include: {
      entryReasons: { include: { entryReason: true } },
      comments: { include: { mentor: true } },
    },
    orderBy: { entryTime: 'desc' },
    take: limit,
    skip: offset,
  })

  return NextResponse.json(trades)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createTradeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const entryDate = new Date(data.entryTime)
  const killzone = computeKillzone(entryDate)
  const cyclePhase = computeCyclePhase(entryDate, killzone)

  const trade = await prisma.trade.create({
    data: {
      userId: session.user.id,
      symbol: data.symbol,
      direction: data.direction,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      entryTime: entryDate,
      exitTime: data.exitTime ? new Date(data.exitTime) : undefined,
      pnl: data.pnl,
      rrAchieved: data.rrAchieved,
      rrPlanned: data.rrPlanned,
      isBacktest: data.isBacktest,
      screenshotUrl: data.screenshotUrl,
      notes: data.notes,
      chartImages: data.chartImages,
      selfRating: data.selfRating,
      emotionalState: data.emotionalState,
      killzone,
      cyclePhase,
      backtestSessionId: data.backtestSessionId,
      entryReasons: {
        create: data.entryReasonIds.map((id) => ({ entryReasonId: id })),
      },
    },
    include: {
      entryReasons: { include: { entryReason: true } },
    },
  })

  return NextResponse.json(trade, { status: 201 })
}
