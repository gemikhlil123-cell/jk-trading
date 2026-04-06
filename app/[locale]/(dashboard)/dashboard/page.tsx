import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { EquityCurve } from '@/components/charts/equity-curve'
import { LucidChallenge } from '@/components/stats/lucid-challenge'
import { StatsAnalysis } from '@/components/stats/stats-analysis'
import { AdvancedStats } from '@/components/stats/advanced-stats'
import { TradovateCSV } from '@/components/stats/tradovate-csv'

const PERIOD_LABELS: Record<string, string> = {
  day: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل',
}

function getDateFilter(period: string): Date | null {
  const now = new Date()
  if (period === 'day') {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d
  }
  if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d
  }
  if (period === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d
  }
  return null
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { locale } = await params
  const { period = 'all' } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const since = getDateFilter(period)

  const trades = await prisma.trade.findMany({
    where: {
      userId: session.user.id,
      isBacktest: false,
      ...(since ? { entryTime: { gte: since } } : {}),
    },
    include: { entryReasons: { include: { entryReason: true } } },
    orderBy: { entryTime: 'desc' },
    take: 200,
  })

  // All trades for equity curve (always all)
  const allTrades = since ? await prisma.trade.findMany({
    where: { userId: session.user.id, isBacktest: false },
    orderBy: { entryTime: 'asc' },
    take: 200,
  }) : trades

  const closedTrades = trades.filter((t) => t.pnl !== null)
  const wins = closedTrades.filter((t) => Number(t.pnl) > 0)
  const losses = closedTrades.filter((t) => Number(t.pnl) <= 0)
  const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl), 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const avgRR = closedTrades.length > 0
    ? closedTrades.reduce((sum, t) => sum + Number(t.rrAchieved || 0), 0) / closedTrades.length
    : 0
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Number(t.pnl), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Number(t.pnl), 0) / losses.length : 0
  const expectancy = closedTrades.length > 0
    ? (winRate / 100) * avgWin + (1 - winRate / 100) * avgLoss
    : 0

  // All-time PnL for Lucid Challenge
  const allTimePnl = allTrades
    .filter(t => t.pnl !== null)
    .reduce((sum, t) => sum + Number(t.pnl), 0)

  const stats = [
    { label: 'WIN RATE', sub: 'نسبة النجاح', value: closedTrades.length > 0 ? `${winRate.toFixed(1)}%` : '—', color: winRate >= 50 ? '#1DB954' : '#E74C3C' },
    { label: 'EXPECTANCY', sub: 'التوقع الرياضي', value: closedTrades.length > 0 ? `$${expectancy.toFixed(1)}` : '—', color: expectancy >= 0 ? '#1DB954' : '#E74C3C' },
    { label: 'P&L', sub: 'الربح / الخسارة', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`, color: totalPnl >= 0 ? '#1DB954' : '#E74C3C' },
    { label: 'TOTAL', sub: 'إجمالي الصفقات', value: String(closedTrades.length), color: '#C8D8EE' },
    { label: 'AVG WIN', sub: 'متوسط الربح', value: wins.length > 0 ? `+$${avgWin.toFixed(0)}` : '—', color: '#1DB954' },
    { label: 'AVG LOSS', sub: 'متوسط الخسارة', value: losses.length > 0 ? `$${avgLoss.toFixed(0)}` : '—', color: '#E74C3C' },
  ]

  return (
    <div className="px-4 pb-4 relative z-[1]">
      {/* Lucid Challenge */}
      <LucidChallenge currentPnl={allTimePnl} target={3000} />

      {/* Tradovate CSV Importer */}
      <TradovateCSV />

      {/* Period tabs */}
      <div className="flex gap-1.5 mt-3 mb-4 bg-[#111D2E] p-1 rounded-xl border border-[rgba(212,175,55,0.12)]">
        {['day', 'week', 'month', 'all'].map((p) => (
          <a
            key={p}
            href={`?period=${p}`}
            className={[
              'flex-1 text-center py-2 rounded-lg text-xs font-bold transition-colors',
              period === p
                ? 'bg-[rgba(212,175,55,0.15)] text-[#D4AF37] border border-[rgba(212,175,55,0.3)]'
                : 'text-[#4A5A7A] hover:text-[#8899BB]',
            ].join(' ')}
          >
            {PERIOD_LABELS[p]}
          </a>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="card-dark p-3.5">
            <p className="text-[10px] font-bold text-[#4A5A7A] tracking-widest uppercase">{s.label}</p>
            <p className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[#4A5A7A] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      {allTrades.filter(t => t.pnl !== null).length > 1 && (
        <div className="card-dark p-4 mb-4">
          <p className="text-[#D4AF37] text-xs font-bold tracking-wide mb-3">منحنى رأس المال</p>
          <EquityCurve
            trades={allTrades.map((t) => ({
              exitTime: t.exitTime?.toISOString() ?? null,
              pnl: t.pnl ? t.pnl.toString() : null,
              symbol: t.symbol,
            }))}
          />
        </div>
      )}

      {/* Performance Analysis */}
      <StatsAnalysis trades={closedTrades.map(t => ({
        pnl: Number(t.pnl),
        rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
        entryReasons: t.entryReasons.map(er => er.entryReason.name),
        direction: t.direction,
      }))} />

      {/* Advanced Statistics */}
      <AdvancedStats trades={closedTrades.map(t => ({
        pnl: Number(t.pnl),
        rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
        entryReasons: t.entryReasons.map(er => er.entryReason.name),
        killzone: t.killzone,
        entryTime: t.entryTime,
        direction: t.direction,
      }))} />

      {/* Recent trades */}
      {trades.length > 0 && (
        <div className="card-dark overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(212,175,55,0.1)]">
            <p className="text-[#D4AF37] text-xs font-bold tracking-wide">آخر الصفقات</p>
          </div>
          {trades.slice(0, 10).map((trade, i) => {
            const pnl = trade.pnl !== null ? Number(trade.pnl) : null
            return (
              <div
                key={trade.id}
                className={[
                  'flex items-center justify-between px-4 py-3',
                  i > 0 ? 'border-t border-[rgba(212,175,55,0.07)]' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2.5">
                  <span className={[
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    trade.direction === 'LONG'
                      ? 'bg-[rgba(29,185,84,0.12)] text-[#1DB954]'
                      : 'bg-[rgba(231,76,60,0.12)] text-[#E74C3C]',
                  ].join(' ')}>
                    {trade.direction === 'LONG' ? 'شراء' : 'بيع'}
                  </span>
                  <span className="text-[#C8D8EE] text-sm font-semibold">{trade.symbol}</span>
                  <span className="text-[#4A5A7A] text-xs">
                    {trade.entryTime.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {trade.rrAchieved && (
                    <span className="text-[#8899BB] text-xs">{Number(trade.rrAchieved).toFixed(1)}R</span>
                  )}
                  {pnl !== null && (
                    <span className={`text-sm font-bold ${pnl >= 0 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {trades.length === 0 && (
        <div className="card-dark p-12 text-center mt-4">
          <p className="text-[#4A5A7A] text-sm">لا توجد صفقات في هذه الفترة</p>
        </div>
      )}
    </div>
  )
}
