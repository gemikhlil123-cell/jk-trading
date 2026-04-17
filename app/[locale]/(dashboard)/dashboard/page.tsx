import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EquityCurve } from '@/components/charts/equity-curve'
import { DailyPnlChart } from '@/components/charts/daily-pnl-chart'
import { LucidChallenge } from '@/components/stats/lucid-challenge'
import { StatsAnalysis } from '@/components/stats/stats-analysis'
import { AdvancedStats } from '@/components/stats/advanced-stats'
import { TradovateCSV } from '@/components/stats/tradovate-csv'
import { PerformanceRadar } from '@/components/stats/performance-radar'
import { TradingCalendar } from '@/components/stats/trading-calendar'
import { SessionAlert } from '@/components/analytics/session-alert'

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
  }) : [...trades].reverse()

  const closedTrades = trades.filter((t) => t.pnl !== null)
  const wins = closedTrades.filter((t) => Number(t.pnl) > 0)
  const losses = closedTrades.filter((t) => Number(t.pnl) <= 0)
  const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl), 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Number(t.pnl), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Number(t.pnl), 0) / losses.length : 0

  // All-time PnL for Lucid Challenge
  const allTimePnl = allTrades
    .filter(t => t.pnl !== null)
    .reduce((sum, t) => sum + Number(t.pnl), 0)

  // ─── Win days ────────────────────────────────────────────────────────────────
  const tradingDaysSet = new Set(closedTrades.map(t => t.entryTime.toISOString().split('T')[0]))
  const dayPnlMap: Record<string, number> = {}
  closedTrades.forEach(t => {
    const day = t.entryTime.toISOString().split('T')[0]
    dayPnlMap[day] = (dayPnlMap[day] ?? 0) + Number(t.pnl)
  })
  const winDaysCount = Object.values(dayPnlMap).filter(p => p > 0).length
  const totalDays = tradingDaysSet.size
  const winDaysRate = totalDays > 0 ? (winDaysCount / totalDays) * 100 : 0

  // ─── Profit Factor ───────────────────────────────────────────────────────────
  const grossWins = wins.reduce((s, t) => s + Number(t.pnl), 0)
  const grossLosses = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0

  // ─── Avg Win/Loss ratio ──────────────────────────────────────────────────────
  const avgWinLossRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

  // ─── Max Drawdown ────────────────────────────────────────────────────────────
  let peak = 0, maxDD = 0, running = 0
  allTrades.filter(t => t.pnl !== null).forEach(t => {
    running += Number(t.pnl)
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })

  // ─── Consistency ────────────────────────────────────────────────────────────
  const dailyPnls = Object.values(dayPnlMap)
  const avgDailyPnl = dailyPnls.length > 0 ? dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length : 0
  const consistentDays = dailyPnls.filter(p => Math.abs(p) <= Math.abs(avgDailyPnl * 2.5)).length
  const consistency = dailyPnls.length > 0 ? (consistentDays / dailyPnls.length) * 100 : 0

  // ─── Recovery factor ────────────────────────────────────────────────────────
  const recoveryFactor = maxDD > 0 ? totalPnl / maxDD : totalPnl > 0 ? 5 : 0

  // ─── Score (0-100) ───────────────────────────────────────────────────────────
  const score = Math.min(100, Math.round(
    winRate * 0.3 +
    Math.min(profitFactor / 3, 1) * 100 * 0.25 +
    Math.min(avgWinLossRatio / 3, 1) * 100 * 0.2 +
    consistency * 0.15 +
    Math.min(Math.max(recoveryFactor / 5, 0), 1) * 100 * 0.1
  ))

  // Trades for charts (need ISO strings)
  const tradesForCharts = closedTrades.map(t => ({
    entryTime: t.entryTime.toISOString(),
    pnl: t.pnl !== null ? Number(t.pnl) : null,
  }))

  // Stat cards data
  const pnlColor = totalPnl >= 0 ? '#1DB954' : '#E74C3C'
  const winRateColor = winRate >= 50 ? '#1DB954' : '#E74C3C'
  const winDaysColor = winDaysRate >= 50 ? '#1DB954' : '#E74C3C'
  const rrColor = avgWinLossRatio >= 1 ? '#1DB954' : '#E74C3C'

  const pfLabel = profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)

  return (
    <div style={{ padding: '0 16px 24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Session Alert — live session performance */}
      <SessionAlert userId={session.user.id as string} />

      {/* Lucid Challenge */}
      <LucidChallenge currentPnl={allTimePnl} target={3000} />

      {/* Tradovate CSV Importer */}
      <TradovateCSV />

      {/* Period tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 12,
          marginBottom: 16,
          background: '#111D2E',
          padding: 4,
          borderRadius: 12,
          border: '1px solid rgba(212,175,55,0.12)',
        }}
      >
        {['day', 'week', 'month', 'all'].map((p) => (
          <a
            key={p}
            href={`?period=${p}`}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
              background: period === p ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: period === p ? '#D4AF37' : '#4A5A7A',
              border: period === p ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            {PERIOD_LABELS[p]}
          </a>
        ))}
      </div>

      {/* ─── Top Row: 4 Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {/* أيام رابحة */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '14px 14px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: '#4A5A7A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            أيام رابحة
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: winDaysColor, lineHeight: 1 }}>
            {totalDays > 0 ? `${winDaysRate.toFixed(0)}%` : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }}>
            {winDaysCount} من {totalDays} يوم
          </div>
        </div>

        {/* نسبة النجاح */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '14px 14px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: '#4A5A7A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            نسبة النجاح
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: winRateColor, lineHeight: 1 }}>
            {closedTrades.length > 0 ? `${winRate.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }}>
            {wins.length} ر / {losses.length} خ
          </div>
        </div>

        {/* نسبة ربح/خسارة */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '14px 14px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: '#4A5A7A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            نسبة ربح/خسارة
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: rrColor, lineHeight: 1 }}>
            {avgWinLossRatio > 0 ? avgWinLossRatio.toFixed(2) : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }}>
            عامل الربح: {pfLabel}
          </div>
        </div>

        {/* P&L + إجمالي */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '14px 14px 12px',
          }}
        >
          <div style={{ fontSize: 10, color: '#4A5A7A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            P&amp;L الإجمالي
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: pnlColor, lineHeight: 1 }}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)} <span style={{ fontSize: 11 }}>نقطة</span>
          </div>
          <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }}>
            {closedTrades.length} صفقة
          </div>
        </div>
      </div>

      {/* ─── Middle Row: Radar + Daily PnL + Equity ───────────────────────── */}
      {closedTrades.length > 0 && (
        <>
          {/* Performance Radar */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '14px 14px 10px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700 }}>نقاط الأداء</div>
              <div
                style={{
                  fontSize: 11,
                  color: score >= 70 ? '#1DB954' : score >= 40 ? '#D4AF37' : '#E74C3C',
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
              >
                {score}/100
              </div>
            </div>
            <PerformanceRadar
              winRate={winRate}
              profitFactor={profitFactor}
              avgRR={avgWinLossRatio}
              maxDrawdown={maxDD}
              consistency={consistency}
              recovery={recoveryFactor}
              score={score}
            />
          </div>

          {/* Daily PnL Chart */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '14px 14px 10px',
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, marginBottom: 8 }}>
              ربح/خسارة يومي
            </div>
            <DailyPnlChart trades={tradesForCharts} />
          </div>

          {/* Equity Curve */}
          {allTrades.filter(t => t.pnl !== null).length > 1 && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '14px 14px 10px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700 }}>منحنى الرأس المال</div>
                <div style={{ fontSize: 10, color: '#8899BB' }}>
                  عامل الربح: {pfLabel}
                </div>
              </div>
              <EquityCurve
                trades={allTrades.map((t) => ({
                  exitTime: t.exitTime?.toISOString() ?? null,
                  pnl: t.pnl ? t.pnl.toString() : null,
                  symbol: t.symbol,
                }))}
              />
            </div>
          )}
        </>
      )}

      {/* ─── Bottom Row: Calendar + Recent Trades ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {/* Monthly Calendar */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '14px 14px 12px',
          }}
        >
          <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, marginBottom: 12 }}>
            التقويم الشهري
          </div>
          <TradingCalendar trades={tradesForCharts} />
        </div>

        {/* Recent Trades */}
        {trades.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(212,175,55,0.1)',
              }}
            >
              <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700 }}>آخر الصفقات</span>
            </div>
            {trades.slice(0, 10).map((trade, i) => {
              const pnl = trade.pnl !== null ? Number(trade.pnl) : null
              return (
                <Link
                  key={trade.id}
                  href={`/${locale}/trades/${trade.id}`}
                  className="hover:bg-[rgba(212,175,55,0.05)] transition-colors"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderTop: i > 0 ? '1px solid rgba(212,175,55,0.07)' : 'none',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: trade.direction === 'LONG'
                          ? 'rgba(29,185,84,0.12)'
                          : 'rgba(231,76,60,0.12)',
                        color: trade.direction === 'LONG' ? '#1DB954' : '#E74C3C',
                      }}
                    >
                      {trade.direction === 'LONG' ? 'شراء' : 'بيع'}
                    </span>
                    <span style={{ color: '#C8D8EE', fontSize: 14, fontWeight: 600 }}>
                      {trade.symbol}
                    </span>
                    <span style={{ color: '#4A5A7A', fontSize: 11 }}>
                      {trade.entryTime.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {trade.rrAchieved && (
                      <span style={{ color: '#8899BB', fontSize: 11 }}>
                        {Number(trade.rrAchieved).toFixed(1)}R
                      </span>
                    )}
                    {pnl !== null && (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: pnl >= 0 ? '#1DB954' : '#E74C3C',
                        }}
                      >
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)} نقطة
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Performance Analysis */}
      <div style={{ marginTop: 10 }}>
        <StatsAnalysis trades={closedTrades.map(t => ({
          pnl: Number(t.pnl),
          rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
          entryReasons: t.entryReasons.map(er => er.entryReason.name),
          direction: t.direction,
        }))} />
      </div>

      {/* Advanced Statistics */}
      <div style={{ marginTop: 10 }}>
        <AdvancedStats trades={closedTrades.map(t => ({
          pnl: Number(t.pnl),
          rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
          entryReasons: t.entryReasons.map(er => er.entryReason.name),
          killzone: t.killzone,
          entryTime: t.entryTime,
          direction: t.direction,
        }))} />
      </div>

      {trades.length === 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '48px 16px',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <p style={{ color: '#4A5A7A', fontSize: 14 }}>لا توجد صفقات في هذه الفترة</p>
        </div>
      )}
    </div>
  )
}
