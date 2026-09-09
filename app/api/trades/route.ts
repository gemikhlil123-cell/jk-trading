import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeKillzone, computeCyclePhase } from '@/lib/autoTag'
import { analyzeNote, detectProvider } from '@/lib/ai-provider'
import { checkTradeRules } from '@/lib/jk-rules-server'
import { z } from 'zod'

const createTradeSchema = z.object({
  symbol: z.enum(['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().default(0),
  exitPrice: z.number().optional(),
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
  entryReasonIds: z.array(z.string()).default([]), // optional now — reduces friction

  // ─── JK model fields. All optional: an empty field leaves its rule unchecked
  // rather than counting as compliant (see lib/jk-rules.ts).
  stopPrice: z.number().optional(),
  targetPrice: z.number().optional(),
  quantity: z.number().int().positive().optional(),
  riskAmount: z.number().nonnegative().optional(),
  fees: z.number().nonnegative().optional(),
  maeR: z.number().optional(),
  mfeR: z.number().optional(),
  setupFamily: z.enum(['LIQUIDITY_SWEEP', 'SMT']).optional(),
  liquiditySource: z
    .enum(['ASIA_HIGH', 'ASIA_LOW', 'LONDON_HIGH', 'LONDON_LOW', 'PDH', 'PDL', 'PWH', 'PWL', 'PMH', 'PML', 'OTHER'])
    .optional(),
  mssConfirmed: z.boolean().optional(),
  entryTrigger: z.enum(['FVG', 'IFVG', 'CISD']).optional(),
  entryTimeframe: z.enum(['M1', 'M3', 'M5']).optional(),
  fvgContextTf: z.enum(['M5', 'M15', 'H1', 'H4', 'H6', 'D1', 'W1']).optional(),
  cisdRetested: z.boolean().optional(),
  grade: z.enum(['A', 'B', 'C']).optional(),
  exitTrigger: z.enum(['TARGET', 'STOP', 'MANUAL_EARLY', 'TRAIL', 'TIME_STOP', 'PANIC', 'END_OF_DAY']).optional(),
  entryTiming: z.enum(['EARLY', 'ON_TIME', 'LATE', 'CHASED']).optional(),
  movedStop: z.boolean().optional(),
  addedToLoser: z.boolean().optional(),
  emotion: z
    .enum(['CALM', 'FOCUSED', 'ANXIOUS', 'FOMO', 'REVENGE', 'OVERCONFIDENT', 'BORED', 'TIRED', 'PRESSURED'])
    .optional(),
  focusRating: z.number().int().min(1).max(5).optional(),
  backtestSessionId: z.string().optional(),
}).refine((d) => d.pnl != null || d.rrAchieved != null, {
  message: 'أدخل نتيجة الصفقة — النقاط أو R',
  path: ['pnl'],
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

  // Discipline is derived, not self-reported: seven of the JK model's nine rules
  // are decided from entry time, planned risk and target alone.
  const { persist: ruleCheck } = await checkTradeRules({
    userId: session.user.id,
    entryTime: entryDate,
    isBacktest: data.isBacktest,
    input: {
      direction: data.direction,
      entryPrice: data.entryPrice,
      stopPrice: data.stopPrice,
      targetPrice: data.targetPrice,
      riskAmount: data.riskAmount,
      entryTrigger: data.entryTrigger,
      cisdRetested: data.cisdRetested,
      mssConfirmed: data.mssConfirmed,
    },
  })

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
      stopPrice: data.stopPrice,
      targetPrice: data.targetPrice,
      quantity: data.quantity,
      riskAmount: data.riskAmount,
      fees: data.fees,
      maeR: data.maeR,
      mfeR: data.mfeR,
      setupFamily: data.setupFamily,
      liquiditySource: data.liquiditySource,
      mssConfirmed: data.mssConfirmed,
      entryTrigger: data.entryTrigger,
      entryTimeframe: data.entryTimeframe,
      fvgContextTf: data.fvgContextTf,
      cisdRetested: data.cisdRetested,
      grade: data.grade,
      exitTrigger: data.exitTrigger,
      entryTiming: data.entryTiming,
      movedStop: data.movedStop,
      addedToLoser: data.addedToLoser,
      emotion: data.emotion,
      focusRating: data.focusRating,
      followedPlan: ruleCheck.followedPlan,
      ruleViolations: ruleCheck.ruleViolations,
      rulesCheckedAt: ruleCheck.rulesCheckedAt,
      backtestSessionId: data.backtestSessionId,
      entryReasons: {
        create: data.entryReasonIds.map((id) => ({ entryReasonId: id })),
      },
    },
    include: {
      entryReasons: { include: { entryReason: true } },
    },
  })

  // Fire-and-forget AI note analysis (Gemini free tier by default, Claude fallback).
  // Does NOT block the response — errors are swallowed to keep trade creation reliable.
  if (
    detectProvider() !== 'none' &&
    typeof data.notes === 'string' &&
    data.notes.trim().length >= 10
  ) {
    const noteText = data.notes.trim()
    const tradeId = trade.id
    void (async () => {
      try {
        const { result, model } = await analyzeNote(noteText)
        await prisma.trade.update({
          where: { id: tradeId },
          data: {
            notesAnalysis: JSON.stringify(result),
            notesAnalysisAt: new Date(),
            notesAnalysisModel: model,
          },
        })
      } catch (err) {
        console.error('[trades.POST] background analyzeNote failed', tradeId, err)
      }
    })()
  }

  return NextResponse.json(trade, { status: 201 })
}
