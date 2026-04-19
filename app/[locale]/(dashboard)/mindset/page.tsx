import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { generateMindsetTips, getChecklistFor } from '@/lib/mindset'
import { analyzeUserNotes, generateNotesTips } from '@/lib/notes-analysis'
import { MindsetView } from '@/components/analytics/mindset-view'
import { NotesInsights } from '@/components/analytics/notes-insights'
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
  const [liveAnalysis, notes] = await Promise.all([
    getDeepAnalysis(userId, { isBacktest: false }),
    analyzeUserNotes(userId),
  ])
  const tips = generateMindsetTips(liveAnalysis)
  const checklist = getChecklistFor(liveAnalysis)
  const notesTips = generateNotesTips(notes)

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>العقلية والمخاطرة</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          نصائح ديناميكية تتغير حسب أدائك وملاحظاتك، مع القواعد الذهبية الثابتة.
        </p>
      </div>

      <NotesInsights notes={notes} tips={notesTips} />

      <MindsetView tips={tips} checklist={checklist} />
    </div>
  )
}
