import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { generateMindsetTips, getChecklistFor } from '@/lib/mindset'
import { MindsetView } from '@/components/analytics/mindset-view'
import { AnalyticsSubnav } from '@/components/analytics/analytics-subnav'

export const dynamic = 'force-dynamic'

export default async function MindsetPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  const userId = session.user!.id as string

  // Use live trades for mindset tips (backtest trades don't reflect real psychology)
  const liveAnalysis = await getDeepAnalysis(userId, { isBacktest: false })
  const tips = generateMindsetTips(liveAnalysis)
  const checklist = getChecklistFor(liveAnalysis)

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>العقلية والمخاطرة</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          نصائح ديناميكية تتغير حسب أدائك، مع القواعد الذهبية الثابتة.
        </p>
      </div>
      <MindsetView tips={tips} checklist={checklist} />
    </div>
  )
}
