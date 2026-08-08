import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { RiskCalculator } from '@/components/tools/risk-calculator'

export const dynamic = 'force-dynamic'

export default async function ToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  return (
    <div style={{ padding: '16px 16px 100px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>حاسبة المخاطرة</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          إدارة المخاطر هي أساس الربحية. احسب حجم صفقتك الصحيح قبل كل دخول — لا تخاطر أبداً بأكثر من خطتك.
        </p>
      </div>
      <RiskCalculator />
    </div>
  )
}
