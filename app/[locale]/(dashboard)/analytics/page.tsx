import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDeepAnalysis, buildTraderNarrative } from '@/lib/deep-analysis'
import { getStrategyAnalysis } from '@/lib/strategy-analysis'
import { DeepAnalyticsView } from '@/components/analytics/deep-analytics-view'
import { AnalyticsSubnav } from '@/components/analytics/analytics-subnav'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  const userId = session.user!.id as string

  const [live, backtest, liveStrategy, backtestStrategy] = await Promise.all([
    getDeepAnalysis(userId, { isBacktest: false }),
    getDeepAnalysis(userId, { isBacktest: true }),
    getStrategyAnalysis(userId, { isBacktest: false }),
    getStrategyAnalysis(userId, { isBacktest: true }),
  ])

  const liveNarrative = buildTraderNarrative(live, liveStrategy.triples)
  const backtestNarrative = buildTraderNarrative(backtest, backtestStrategy.triples)

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>التحليل الشامل</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          تحليل شخصي مبني على تفاصيل صفقاتك الفعلية — نفس الساعات والأسباب التي أدخلتها.
        </p>
      </div>
      <DeepAnalyticsView
        live={live}
        backtest={backtest}
        liveNarrative={liveNarrative}
        backtestNarrative={backtestNarrative}
      />
    </div>
  )
}
