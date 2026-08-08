import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { buildCoachReport, type CoachTrade } from '@/lib/coach'
import { CoachReportView } from '@/components/coach/coach-report'

export const dynamic = 'force-dynamic'

async function loadTrades(userId: string): Promise<CoachTrade[]> {
  const rows = await prisma.trade.findMany({
    where: { userId, pnl: { not: null } },
    include: { entryReasons: { include: { entryReason: true } } },
    orderBy: { entryTime: 'desc' },
    take: 600,
  })
  // Prefer live trades; fall back to all (incl. backtest) if too few live
  const live = rows.filter((t) => !t.isBacktest)
  const use = live.length >= 8 ? live : rows
  return use.map((t) => ({
    pnl: Number(t.pnl),
    rr: t.rrAchieved != null ? Number(t.rrAchieved) : null,
    direction: t.direction,
    symbol: t.symbol,
    killzone: t.killzone,
    cyclePhase: t.cyclePhase,
    entryTime: t.entryTime,
    reasons: t.entryReasons.map((r) => r.entryReason.name),
    selfRating: t.selfRating,
    emotionalState: t.emotionalState,
  }))
}

export default async function CoachPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const trades = await loadTrades(session.user.id as string)
  const report = buildCoachReport(trades)

  return (
    <div style={{ padding: '16px 16px 100px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>المدرّب</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          تحليل آلي لأدائك: الكومبو الرابح، قواعدك الشخصية، وأفضل أوقاتك — مبني على أرقامك الحقيقية.
        </p>
      </div>
      <CoachReportView report={report} />
    </div>
  )
}
