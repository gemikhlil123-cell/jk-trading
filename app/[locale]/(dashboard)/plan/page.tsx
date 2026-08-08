import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PlanEditor } from '@/components/plan/plan-editor'

export const dynamic = 'force-dynamic'

export default async function PlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const plan = await prisma.tradingPlan.findUnique({
    where: { userId: session.user.id as string },
  })

  // Serialize Decimal fields to plain values
  const initialPlan = plan
    ? {
        allowedSessions: plan.allowedSessions,
        allowedSymbols: plan.allowedSymbols,
        maxTradesPerDay: plan.maxTradesPerDay,
        maxDailyLossUsd: plan.maxDailyLossUsd?.toString() ?? null,
        maxRiskPerTradeUsd: plan.maxRiskPerTradeUsd?.toString() ?? null,
        minRR: plan.minRR?.toString() ?? null,
        rules: plan.rules,
        notes: plan.notes,
      }
    : null

  return (
    <div style={{ padding: '16px 16px 24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>خطة التداول</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          الانضباط يبدأ بخطة مكتوبة. حدّد متى وكيف تتداول — والتزم بها.
        </p>
      </div>
      <PlanEditor initialPlan={initialPlan} />
    </div>
  )
}
