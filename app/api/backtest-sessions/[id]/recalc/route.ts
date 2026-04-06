import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const bs = await prisma.backtestSession.findFirst({
    where: { id, userId: session.user.id },
    include: { trades: true },
  })
  if (!bs) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const closedTrades = bs.trades.filter((t) => t.pnl !== null)
  const wins = closedTrades.filter((t) => Number(t.pnl) > 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : null
  const avgRR =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + Number(t.rrAchieved || 0), 0) / closedTrades.length
      : null

  const updated = await prisma.backtestSession.update({
    where: { id },
    data: {
      totalTrades: bs.trades.length,
      winRate: winRate !== null ? winRate : undefined,
      avgRR: avgRR !== null ? avgRR : undefined,
    },
  })

  return NextResponse.json(updated)
}
