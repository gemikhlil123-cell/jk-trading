import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { generateMindsetTips, getChecklistFor } from '@/lib/mindset'
import { analyzeUserNotes, generateNotesTips } from '@/lib/notes-analysis'
import { MindsetView } from '@/components/analytics/mindset-view'
import { NotesInsights } from '@/components/analytics/notes-insights'
import { AnalyticsSubnav } from '@/components/analytics/analytics-subnav'
import { DailyJournal } from '@/components/analytics/daily-journal'

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
  const [liveAnalysis, notes, journalRows] = await Promise.all([
    getDeepAnalysis(userId, { isBacktest: false }),
    analyzeUserNotes(userId),
    prisma.dailyJournal.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 60,
    }),
  ])
  const tips = generateMindsetTips(liveAnalysis)
  const checklist = getChecklistFor(liveAnalysis)
  const notesTips = generateNotesTips(notes)

  const initialJournals = journalRows.map((j) => ({
    date: j.date.toISOString(),
    disciplineRating: j.disciplineRating,
    mood: j.mood,
    followedPlan: j.followedPlan,
    overtraded: j.overtraded,
    reflection: j.reflection,
  }))

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>العقلية والمخاطرة</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          نصائح ديناميكية تتغير حسب أدائك وملاحظاتك، مع القواعد الذهبية الثابتة.
        </p>
      </div>

      <DailyJournal initialJournals={initialJournals} />

      <NotesInsights notes={notes} tips={notesTips} />

      <MindsetView tips={tips} checklist={checklist} />
    </div>
  )
}
