import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeKillzone, computeCyclePhase } from '@/lib/autoTag'
import { analyzeNote, detectProvider } from '@/lib/ai-provider'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const trade = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
    include: {
      entryReasons: { include: { entryReason: true } },
      comments: { include: { mentor: { select: { name: true, image: true } } } },
    },
  })

  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(trade)
}

// Whitelist of fields the user is allowed to edit. Everything else is ignored.
const patchSchema = z.object({
  symbol: z.enum(['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']).optional(),
  direction: z.enum(['LONG', 'SHORT']).optional(),
  entryPrice: z.number().optional(),
  exitPrice: z.number().nullable().optional(),
  entryTime: z.string().datetime().optional(),
  exitTime: z.string().datetime().nullable().optional(),
  pnl: z.number().nullable().optional(),
  rrAchieved: z.number().nullable().optional(),
  rrPlanned: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  chartImages: z.string().nullable().optional(),
  selfRating: z.number().int().min(1).max(10).nullable().optional(),
  emotionalState: z.string().nullable().optional(),
  entryReasonIds: z.array(z.string()).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  // Build update payload (Prisma cannot take undefined keys cleanly — only include set fields)
  const update: Record<string, unknown> = {}
  if (data.symbol !== undefined) update.symbol = data.symbol
  if (data.direction !== undefined) update.direction = data.direction
  if (data.entryPrice !== undefined) update.entryPrice = data.entryPrice
  if (data.exitPrice !== undefined) update.exitPrice = data.exitPrice
  if (data.pnl !== undefined) update.pnl = data.pnl
  if (data.rrAchieved !== undefined) update.rrAchieved = data.rrAchieved
  if (data.rrPlanned !== undefined) update.rrPlanned = data.rrPlanned
  if (data.notes !== undefined) update.notes = data.notes
  if (data.chartImages !== undefined) update.chartImages = data.chartImages
  if (data.selfRating !== undefined) update.selfRating = data.selfRating
  if (data.emotionalState !== undefined) update.emotionalState = data.emotionalState

  // If entryTime changes, re-compute killzone + cyclePhase
  if (data.entryTime !== undefined) {
    const entryDate = new Date(data.entryTime)
    update.entryTime = entryDate
    update.killzone = computeKillzone(entryDate)
    update.cyclePhase = computeCyclePhase(entryDate, update.killzone as ReturnType<typeof computeKillzone>)
  }
  if (data.exitTime !== undefined) {
    update.exitTime = data.exitTime === null ? null : new Date(data.exitTime)
  }

  // Detect notes change for re-analysis
  const notesChanged =
    data.notes !== undefined &&
    (data.notes ?? '').trim() !== (existing.notes ?? '').trim()

  // If notes cleared, wipe the cached analysis
  if (notesChanged && (data.notes === null || (data.notes ?? '').trim().length < 10)) {
    update.notesAnalysis = null
    update.notesAnalysisAt = null
    update.notesAnalysisModel = null
  }

  // Handle entryReasons (replace the full set if provided)
  const trade = await prisma.$transaction(async (tx) => {
    if (data.entryReasonIds) {
      await tx.tradeEntryReason.deleteMany({ where: { tradeId: id } })
      if (data.entryReasonIds.length > 0) {
        await tx.tradeEntryReason.createMany({
          data: data.entryReasonIds.map((erId) => ({ tradeId: id, entryReasonId: erId })),
        })
      }
    }
    return tx.trade.update({
      where: { id },
      data: update,
      include: { entryReasons: { include: { entryReason: true } } },
    })
  })

  // Fire-and-forget re-analysis if notes changed + provider configured + note substantial
  if (
    notesChanged &&
    detectProvider() !== 'none' &&
    typeof data.notes === 'string' &&
    data.notes.trim().length >= 10
  ) {
    const noteText = data.notes.trim()
    void (async () => {
      try {
        const { result, model } = await analyzeNote(noteText)
        await prisma.trade.update({
          where: { id },
          data: {
            notesAnalysis: JSON.stringify(result),
            notesAnalysisAt: new Date(),
            notesAnalysisModel: model,
          },
        })
      } catch (err) {
        console.error('[trades.PATCH] background analyzeNote failed', id, err)
      }
    })()
  }

  return NextResponse.json(trade)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.trade.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
