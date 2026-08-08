import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GoalsManager } from '@/components/goals/goals-manager'
import { computeGoalProgress } from '@/lib/goals'

export const dynamic = 'force-dynamic'

export default async function GoalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)
  const userId = session.user.id as string

  const [goals, trades, journals] = await Promise.all([
    prisma.goal.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.trade.findMany({
      where: { userId, isBacktest: false },
      select: { entryTime: true, pnl: true },
      orderBy: { entryTime: 'desc' },
      take: 500,
    }),
    prisma.dailyJournal.findMany({
      where: { userId },
      select: { date: true, disciplineRating: true },
      orderBy: { date: 'desc' },
      take: 90,
    }),
  ])

  const tradeInputs = trades.map((t) => ({ entryTime: t.entryTime, pnl: t.pnl !== null ? Number(t.pnl) : null }))

  const initialGoals = goals.map((g) => {
    const goalInput = { id: g.id, metric: g.metric, period: g.period, target: Number(g.target) }
    const progress = computeGoalProgress(goalInput, tradeInputs, journals)
    return {
      id: g.id,
      metric: g.metric,
      period: g.period,
      target: g.target.toString(),
      progress: { current: progress.current, pct: progress.pct, achieved: progress.achieved, unit: progress.unit },
    }
  })

  return (
    <div style={{ padding: '16px 16px 24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>الأهداف</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          المتداول الرابح يقيس تقدّمه. حدّد أهدافاً واقعية وتابعها.
        </p>
      </div>
      <GoalsManager initialGoals={initialGoals} />
    </div>
  )
}
