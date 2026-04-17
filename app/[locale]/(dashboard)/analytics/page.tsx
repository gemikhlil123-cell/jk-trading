import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDeepAnalysis } from '@/lib/deep-analysis'
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

  const [live, backtest] = await Promise.all([
    getDeepAnalysis(userId, { isBacktest: false }),
    getDeepAnalysis(userId, { isBacktest: true }),
  ])

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>التحليل الشامل</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          أسبابك الناجحة والفاشلة، أفضل جلساتك، أضعف أيامك — كل شيء مبني على بياناتك.
        </p>
      </div>
      <DeepAnalyticsView live={live} backtest={backtest} />
    </div>
  )
}
