import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { generateStrategy } from '@/lib/strategy'
import { StrategyView } from '@/components/analytics/strategy-view'
import { AnalyticsSubnav } from '@/components/analytics/analytics-subnav'

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  const userId = session.user!.id as string

  const [liveAnalysis, backtestAnalysis] = await Promise.all([
    getDeepAnalysis(userId, { isBacktest: false }),
    getDeepAnalysis(userId, { isBacktest: true }),
  ])

  const liveStrategy = generateStrategy(liveAnalysis)
  const backtestStrategy = generateStrategy(backtestAnalysis)

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>استراتيجيتك</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          استراتيجية مولّدة تلقائياً من بياناتك — متى تدخل، متى تتجنّب، وكيف تدير حجمك.
        </p>
      </div>
      <StrategyView live={liveStrategy} backtest={backtestStrategy} />
    </div>
  )
}
