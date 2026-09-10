/**
 * JK TRADING — dashboard.
 *
 * Structured the way TradeZella lays out a trader's home screen: headline figures
 * with their visual cue, then score and equity, then the P&L calendar beside the
 * daily bars and the latest trades, then the deeper analysis.
 */
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, Zap } from 'lucide-react'
import { EquityCurve } from '@/components/charts/equity-curve'
import { DailyPnlChart } from '@/components/charts/daily-pnl-chart'
import { LucidChallenge } from '@/components/stats/lucid-challenge'
import { GoalsWidget } from '@/components/stats/goals-widget'
import { CalendarWidget } from '@/components/calendar/calendar-widget'
import { StatsAnalysis } from '@/components/stats/stats-analysis'
import { AdvancedStats } from '@/components/stats/advanced-stats'
import { TradovateCSV } from '@/components/stats/tradovate-csv'
import { PerformanceRadar } from '@/components/stats/performance-radar'
import { TradingCalendar } from '@/components/stats/trading-calendar'
import { SessionAlert } from '@/components/analytics/session-alert'
import { Panel } from '@/components/dashboard/panel'
import { KpiCard, RatioBar, Ring, SemiGauge } from '@/components/dashboard/kpi'
import { computeGoalProgress } from '@/lib/goals'
import { getUpcomingEvents } from '@/lib/economic-calendar'
import { computeMetrics, consistencyPct, dailyTotals, performanceScore, recoveryFactor } from '@/lib/dashboard-metrics'
import { DEFAULT_PNL_UNIT, formatPnl, unitLabel, unitPhrase } from '@/lib/pnl-format'
import { jerusalemDateKey, jerusalemWallToUTC } from '@/lib/timezone'

const UNIT = DEFAULT_PNL_UNIT

const PERIODS = [
  { key: 'day', label: 'اليوم' },
  { key: 'week', label: '7 أيام' },
  { key: 'month', label: '30 يوماً' },
  { key: 'all', label: 'الكل' },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

function periodStart(period: PeriodKey): Date | null {
  const now = new Date()
  // "Today" starts at midnight in Israel, where students trade from — not at
  // midnight UTC on the server.
  if (period === 'day') return jerusalemWallToUTC(`${jerusalemDateKey(now)}T00:00`)
  if (period === 'week') return new Date(now.getTime() - 7 * 86_400_000)
  if (period === 'month') return new Date(now.getTime() - 30 * 86_400_000)
  return null
}

const tradeDate = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Jerusalem',
})

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { locale } = await params
  const { period: requested } = await searchParams
  const period: PeriodKey = PERIODS.find((p) => p.key === requested)?.key ?? 'all'
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)
  const userId = session.user.id as string
  const since = periodStart(period)

  const lean = { entryTime: true, exitTime: true, pnl: true } as const

  const [tradovateAccount, activeGoals, allTrades, periodOnly, recentTrades, analysisTrades] = await Promise.all([
    prisma.tradovateAccount.findUnique({ where: { userId }, select: { id: true } }),
    prisma.goal.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'desc' }, take: 4 }),
    // Every closed trade. The old query took 200 in ascending order, which showed a
    // long-standing student their *oldest* 200 trades as "all time".
    prisma.trade.findMany({
      where: { userId, isBacktest: false, pnl: { not: null } },
      select: lean,
      orderBy: { entryTime: 'asc' },
      take: 5000,
    }),
    since
      ? prisma.trade.findMany({
          where: { userId, isBacktest: false, pnl: { not: null }, entryTime: { gte: since } },
          select: lean,
          orderBy: { entryTime: 'asc' },
          take: 5000,
        })
      : Promise.resolve(null),
    prisma.trade.findMany({
      where: { userId, isBacktest: false, ...(since ? { entryTime: { gte: since } } : {}) },
      select: { id: true, symbol: true, direction: true, entryTime: true, pnl: true, rrAchieved: true },
      orderBy: { entryTime: 'desc' },
      take: 8,
    }),
    prisma.trade.findMany({
      where: { userId, isBacktest: false, pnl: { not: null }, ...(since ? { entryTime: { gte: since } } : {}) },
      include: { entryReasons: { include: { entryReason: true } } },
      orderBy: { entryTime: 'desc' },
      take: 500,
    }),
  ])

  // Goal progress is independent of the period filter.
  const widgetGoals =
    activeGoals.length > 0
      ? await (async () => {
          const [goalTrades, journals] = await Promise.all([
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
          const inputs = goalTrades.map((t) => ({ entryTime: t.entryTime, pnl: t.pnl !== null ? Number(t.pnl) : null }))
          return activeGoals.map((g) => {
            const p = computeGoalProgress({ id: g.id, metric: g.metric, period: g.period, target: Number(g.target) }, inputs, journals)
            return { id: g.id, metric: g.metric, period: g.period, target: Number(g.target), current: p.current, pct: p.pct, achieved: p.achieved, unit: p.unit }
          })
        })()
      : []

  // Today's high-impact economic events (Jerusalem day).
  const todayEvents = await (async () => {
    try {
      const { events } = await getUpcomingEvents(3)
      const today = jerusalemDateKey(new Date())
      return events
        .filter((e) => e.impact === 'HIGH' && jerusalemDateKey(new Date(e.date)) === today)
        .map((e) => ({ date: e.date, currency: e.currency, title: e.title, impact: e.impact }))
    } catch {
      return []
    }
  })()

  const toRow = (t: { entryTime: Date; exitTime: Date | null; pnl: { toString(): string } | null }) => ({
    entryTime: t.entryTime,
    exitTime: t.exitTime,
    pnl: t.pnl == null ? null : Number(t.pnl),
  })
  const allRows = allTrades.map(toRow)
  const periodRows = periodOnly ? periodOnly.map(toRow) : allRows

  const m = computeMetrics(periodRows)
  const lifetime = computeMetrics(allRows)
  const consistency = consistencyPct([...dailyTotals(periodRows).values()].map((d) => d.pnl))
  const recovery = recoveryFactor(m.netPnl, lifetime.maxDrawdown)
  const score = performanceScore(m, consistency, recovery)
  const scoreColor = score >= 70 ? '#4E9E7A' : score >= 40 ? '#C29B4A' : '#BB5B5B'

  const fmt = (n: number, compact = false) => formatPnl(n, UNIT, { compact })
  const tone = (n: number): 'win' | 'loss' | 'neutral' => (n > 0 ? 'win' : n < 0 ? 'loss' : 'neutral')
  const pfText = Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : '∞'
  const pfShare = m.grossWins + m.grossLosses > 0 ? m.grossWins / (m.grossWins + m.grossLosses) : 0
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? ''
  const hasTrades = allRows.length > 0
  const word = unitLabel(UNIT)

  const chartTrades = periodRows.map((t) => ({ entryTime: t.entryTime.toISOString(), pnl: t.pnl }))
  const calendarTrades = allRows.map((t) => ({ entryTime: t.entryTime.toISOString(), pnl: t.pnl }))
  const equityTrades = allRows.map((t) => ({
    entryTime: t.entryTime.toISOString(),
    exitTime: t.exitTime ? t.exitTime.toISOString() : null,
    pnl: t.pnl,
  }))

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {/* Title and period */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black leading-tight text-[#EDEBE4] sm:text-[24px]">لوحة التحكم</h1>
          <p className="mt-1 text-[12px] text-[#6B7890]">
            {periodLabel} · {unitPhrase(UNIT)}
          </p>
        </div>
        <nav aria-label="الفترة" className="flex gap-1 rounded-xl p-1" style={{ background: '#0E131C', border: '1px solid rgba(194,155,74,0.12)' }}>
          {PERIODS.map((p) => {
            const active = p.key === period
            return (
              <Link
                key={p.key}
                href={{ pathname: `/${locale}/dashboard`, query: { period: p.key } }}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-8 items-center rounded-lg px-3.5 text-[12px] font-bold transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C29B4A]',
                  active ? 'text-[#E4CE9B]' : 'text-[#6B7890] hover:text-[#DEDAD0]',
                ].join(' ')}
                style={active ? { background: 'rgba(194,155,74,0.16)', boxShadow: 'inset 0 0 0 1px rgba(194,155,74,0.28)' } : undefined}
              >
                {p.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Live session + Tradovate prompt */}
      <div className={`grid gap-3 ${!tradovateAccount ? 'lg:grid-cols-2' : ''}`}>
        <SessionAlert userId={userId} />
        {!tradovateAccount && (
          <Link
            href={`/${locale}/settings`}
            className="dash-panel flex items-center gap-3 px-4 py-3 transition-colors hover:border-[rgba(194,155,74,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C29B4A]"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(194,155,74,0.10)', border: '1px solid rgba(194,155,74,0.24)', color: '#C29B4A' }}
            >
              <Zap size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-[#E4CE9B]">اربط حساب Tradovate</span>
              <span className="mt-0.5 block text-[11px] text-[#8899BB]">صفقاتك تتحدّث تلقائياً في اليومية</span>
            </span>
            <ChevronLeft size={16} className="shrink-0 text-[#4A5A7A]" />
          </Link>
        )}
      </div>

      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          className="col-span-2 md:col-span-1"
          label="صافي الربح والخسارة"
          value={m.trades ? fmt(m.netPnl) : '—'}
          tone={tone(m.netPnl)}
          sub={
            <>
              <span className="num" dir="ltr">{m.trades}</span> صفقة مغلقة · {word}
            </>
          }
        />
        <KpiCard label="الصفقات الرابحة" value={m.trades ? `${m.winRate.toFixed(1)}%` : '—'} visual={<SemiGauge value={m.winRate} wins={m.wins} losses={m.losses} />} />
        <KpiCard label="عامل الربح" value={m.trades ? pfText : '—'} visual={<Ring share={pfShare} />} />
        <KpiCard
          label="الأيام الرابحة"
          value={m.tradingDays ? `${m.dayWinRate.toFixed(0)}%` : '—'}
          visual={<SemiGauge value={m.dayWinRate} wins={m.winDays} losses={m.lossDays} />}
        />
        <KpiCard
          className="md:col-span-2 xl:col-span-1"
          label="متوسط الربح ÷ الخسارة"
          value={m.avgWinLossRatio ? m.avgWinLossRatio.toFixed(2) : '—'}
          visual={<RatioBar win={m.avgWin} loss={m.avgLoss} winText={fmt(m.avgWin, true)} lossText={fmt(m.avgLoss, true)} />}
        />
      </div>

      {hasTrades ? (
        <>
          {/* Score and equity */}
          <div className="grid gap-3 lg:grid-cols-12">
            <Panel
              className="lg:col-span-4"
              title="نتيجة الأداء"
              subtitle="من 100 · من خمسة مكوّنات"
              aside={
                <span className="num rounded-full px-2.5 py-1 text-[12px] font-semibold" dir="ltr" style={{ color: scoreColor, background: 'rgba(255,255,255,0.04)', border: `1px solid ${scoreColor}40` }}>
                  {score}/100
                </span>
              }
            >
              <PerformanceRadar
                winRate={m.winRate}
                profitFactor={Math.min(m.profitFactor, 999)}
                avgRR={m.avgWinLossRatio}
                maxDrawdown={lifetime.maxDrawdown}
                consistency={consistency}
                recovery={recovery}
                score={score}
              />
            </Panel>
            <Panel
              className="lg:col-span-8"
              title="منحنى الرصيد"
              subtitle="تراكمي لكل الفترات، والتراجع من القمة تحته"
              aside={
                <span className="text-[11px] text-[#8899BB]">
                  أقصى تراجع{' '}
                  <span style={{ color: lifetime.maxDrawdown > 0 ? '#D07A7A' : '#8899BB' }}>
                    <span className="num font-semibold" dir="ltr">{fmt(-lifetime.maxDrawdown)}</span> {word}
                  </span>
                </span>
              }
            >
              <EquityCurve trades={equityTrades} unit={UNIT} />
            </Panel>
          </div>

          {/* Calendar beside daily bars and latest trades */}
          <div className="grid gap-3 lg:grid-cols-12">
            <Panel className="lg:col-span-8" title="تقويم الأرباح" subtitle={`كل الفترات · ${unitPhrase(UNIT)}`}>
              <TradingCalendar trades={calendarTrades} unit={UNIT} />
            </Panel>
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-4">
              <Panel title="الربح والخسارة اليومي" subtitle={`آخر 30 يوم تداول · ${periodLabel}`}>
                <DailyPnlChart trades={chartTrades} unit={UNIT} />
              </Panel>
              <Panel title="آخر الصفقات" action={{ href: `/${locale}/trades`, label: 'عرض الكل' }} flush>
                {recentTrades.length === 0 ? (
                  <p className="px-5 py-6 text-center text-[12px] text-[#6B7890]">لا توجد صفقات في هذه الفترة</p>
                ) : (
                  <ul>
                    {recentTrades.map((t) => {
                      const pnl = t.pnl == null ? null : Number(t.pnl)
                      const long = t.direction === 'LONG'
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/${locale}/trades/${t.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-[rgba(194,155,74,0.05)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C29B4A]"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={long ? { background: 'rgba(78,158,122,0.12)', color: '#6FBF98' } : { background: 'rgba(187,91,91,0.12)', color: '#D07A7A' }}
                              >
                                {long ? 'شراء' : 'بيع'}
                              </span>
                              <span className="text-[13px] font-semibold text-[#DEDAD0]">{t.symbol}</span>
                              <span className="truncate text-[11px] text-[#6B7890]">{tradeDate.format(t.entryTime)}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                              {t.rrAchieved != null && (
                                <span className="num text-[11px] text-[#8899BB]" dir="ltr">
                                  {Number(t.rrAchieved).toFixed(1)}R
                                </span>
                              )}
                              {pnl != null ? (
                                <span className="num text-[13px] font-semibold" dir="ltr" style={{ color: pnl > 0 ? '#6FBF98' : pnl < 0 ? '#D07A7A' : '#8899BB' }}>
                                  {fmt(pnl)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#6B7890]">مفتوحة</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-[16px] font-bold text-[#EDEBE4]">ابدأ يوميتك</p>
            <p className="max-w-[42ch] text-[12.5px] leading-relaxed text-[#8899BB]">
              سجّل أول صفقة أو استورد ملفاً من منصتك، وستظهر هنا نتيجتك ومنحنى رصيدك وتقويم أرباحك.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href={`/${locale}/trades/new`} className="btn-brass">إضافة صفقة</Link>
              <Link href={`/${locale}/trades/import`} className="btn-ghost">استيراد ملف</Link>
            </div>
          </div>
        </Panel>
      )}

      {/* Goals and today's news */}
      <div className="dash-cell grid items-start gap-3 lg:grid-cols-2">
        {widgetGoals.length > 0 ? <GoalsWidget goals={widgetGoals} locale={locale} /> : <LucidChallenge currentPnl={lifetime.netPnl} target={3000} />}
        <CalendarWidget events={todayEvents} locale={locale} />
      </div>

      {/* Deeper analysis */}
      {analysisTrades.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="flex items-center gap-3 pt-2">
            <h2 className="text-[15px] font-bold text-[#EDEBE4]">تحليل مفصّل</h2>
            <span className="h-px flex-1" style={{ background: 'rgba(194,155,74,0.12)' }} />
          </div>
          <StatsAnalysis
            trades={analysisTrades.map((t) => ({
              pnl: Number(t.pnl),
              rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
              entryReasons: t.entryReasons.map((er) => er.entryReason.name),
              direction: t.direction,
            }))}
          />
          <AdvancedStats
            trades={analysisTrades.map((t) => ({
              pnl: Number(t.pnl),
              rrAchieved: t.rrAchieved ? Number(t.rrAchieved) : null,
              entryReasons: t.entryReasons.map((er) => er.entryReason.name),
              killzone: t.killzone,
              entryTime: t.entryTime,
              direction: t.direction,
              symbol: t.symbol,
            }))}
          />
        </section>
      )}

      {/* The quick file preview does not save to the journal, so it stays tucked away. */}
      <details className="dash-panel group">
        <summary className="dash-summary flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span>
            <span className="block text-[13.5px] font-bold text-[#DEDAD0]">معاينة سريعة لملف Tradovate</span>
            <span className="mt-1 block text-[11px] text-[#6B7890]">
              لحساب الإحصائيات فقط ولا يحفظ الصفقات في اليومية. للحفظ استخدم «استيراد الصفقات».
            </span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-[#8899BB] transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5">
          <TradovateCSV />
        </div>
      </details>
    </div>
  )
}
