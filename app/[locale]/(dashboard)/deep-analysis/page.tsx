import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDeepAggregate } from '@/lib/deep-analysis-aggregator'
import { getStrategyAnalysis } from '@/lib/strategy-analysis'
import { checkDeepAccess, canViewDeepAnalysisFor } from '@/lib/deep-analysis-guard'
import { AnalyticsSubnav } from '@/components/analytics/analytics-subnav'
import { DeepAnalysisView } from '@/components/deep-analysis/deep-analysis-view'

export const dynamic = 'force-dynamic'

export default async function DeepAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ studentId?: string }>
}) {
  const { locale } = await params
  const { studentId } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const viewerId = session.user.id as string

  // Resolve target user: studentId query (mentor view) or self.
  const targetUserId = studentId ?? viewerId

  // Access guard
  const canView = await canViewDeepAnalysisFor(viewerId, targetUserId)
  if (!canView) {
    return (
      <div style={{ padding: '20px 14px', direction: 'rtl' }}>
        <AnalyticsSubnav locale={locale} />
        <div
          style={{
            background: '#111D2E',
            border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
            color: '#E74C3C',
            fontSize: 13,
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          🔒 التحليل العميق متاح فقط للمدرب ومشتركي PRO.
          <div style={{ marginTop: 8, color: '#8899BB', fontSize: 11 }}>
            للترقية تواصل مع JK أو راجع صفحة الأسعار.
          </div>
        </div>
      </div>
    )
  }

  const self = await checkDeepAccess(viewerId)
  const isMentor = self.allowed && self.role === 'MENTOR'

  // Load target user info for header
  const targetUser =
    targetUserId !== viewerId
      ? await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { name: true, email: true },
        })
      : null

  const [aggregate, strategy] = await Promise.all([
    getDeepAggregate(targetUserId, { limit: 500 }),
    // include both live + backtest via default (isBacktest omitted → live only).
    // We want the triple combos across all live trades.
    getStrategyAnalysis(targetUserId, { isBacktest: false }),
  ])

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      <AnalyticsSubnav locale={locale} />
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37' }}>التحليل العميق</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          تحليل ذكي للملاحظات (عربي / عبري / إنجليزي) — يستخرج الفريمات، الـ confluences، الجلسات،
          والأوقات التي تستخدمها فعلاً.
        </p>
      </div>

      {!hasApiKey && (
        <div
          style={{
            background: 'rgba(231,76,60,0.08)',
            border: '1px solid rgba(231,76,60,0.3)',
            color: '#E74C3C',
            fontSize: 11,
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          ⚠️ مفتاح Anthropic API غير مضبوط في Netlify. التحليل الذكي معطّل حتى تتم إضافة
          ANTHROPIC_API_KEY.
        </div>
      )}

      <DeepAnalysisView
        initial={aggregate}
        triples={strategy.triples}
        targetUserId={targetUserId}
        isMentor={isMentor}
        studentName={targetUser?.name ?? targetUser?.email ?? null}
      />
    </div>
  )
}
