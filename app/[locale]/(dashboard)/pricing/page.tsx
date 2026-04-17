import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const PLANS = [
  {
    id: 'monthly',
    name: 'شهري',
    price: 29,
    period: 'شهر',
    yearly: false,
    highlight: false,
    badge: null as string | null,
  },
  {
    id: 'yearly',
    name: 'سنوي',
    price: 290,
    period: 'سنة',
    yearly: true,
    highlight: true,
    badge: 'وفّر 58$',
  },
] as const

const FEATURES = [
  'سجل صفقات احترافي مع صور الشارت',
  'تحليل شامل: أسبابك الناجحة والفاشلة',
  'استراتيجية مولّدة تلقائياً من بياناتك',
  'نصائح عقلية وإدارة مخاطر ديناميكية',
  'جلسات الكيل زون ودورات 90 دقيقة',
  'لوحة تحيز ولوحة باكتيست متقدمة',
  'ملاحظات المدرب وتعليقات شخصية',
  'دعم عربي 100% بتصميم فاخر',
]

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const me = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { subscriptionStatus: true, trialEndsAt: true, subscriptionTier: true },
  })

  const trialDaysLeft = me?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / (86400 * 1000)))
    : null

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '24px 16px 120px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#D4AF37', marginBottom: 8 }}>
          استثمر في أدائك
        </h1>
        <p style={{ fontSize: 13, color: '#8899BB', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          ابدأ بتجربة مجانية 7 أيام. استرجع قيمة اشتراكك من صفقة واحدة محسّنة.
        </p>
      </div>

      {/* Current status */}
      {me?.subscriptionStatus === 'trial' && trialDaysLeft !== null && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, color: '#D4AF37', fontWeight: 800, marginBottom: 2 }}>
            أنت في التجربة المجانية
          </div>
          <div style={{ fontSize: 11, color: '#8899BB' }}>
            متبقي {trialDaysLeft} يوم — اختر خطتك قبل الانتهاء
          </div>
        </div>
      )}
      {me?.subscriptionStatus === 'active' && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(29,185,84,0.1), rgba(29,185,84,0.03))',
            border: '1px solid rgba(29,185,84,0.3)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, color: '#1DB954', fontWeight: 800 }}>✦ اشتراكك فعّال</div>
        </div>
      )}

      {/* Plans */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto 28px',
        }}
      >
        {PLANS.map((p) => (
          <div
            key={p.id}
            style={{
              background: p.highlight
                ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))'
                : 'rgba(255,255,255,0.03)',
              border: p.highlight
                ? '1px solid rgba(212,175,55,0.4)'
                : '1px solid rgba(212,175,55,0.15)',
              borderRadius: 18,
              padding: '24px 20px',
              position: 'relative',
              boxShadow: p.highlight ? '0 8px 32px rgba(212,175,55,0.12)' : 'none',
            }}
          >
            {p.badge && (
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  right: 20,
                  background: 'linear-gradient(135deg, #A07D1C, #D4AF37)',
                  color: '#080C14',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 20,
                }}
              >
                {p.badge}
              </div>
            )}

            <div style={{ fontSize: 14, color: '#D4AF37', fontWeight: 800, marginBottom: 8 }}>
              {p.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: '#C8D8EE' }}>${p.price}</span>
              <span style={{ fontSize: 13, color: '#4A5A7A' }}>/ {p.period}</span>
            </div>
            <div style={{ fontSize: 11, color: '#8899BB', marginBottom: 18 }}>
              {p.yearly ? 'يعادل $24/شهر' : 'يُجدّد شهرياً'}
            </div>

            <form action="/api/billing/checkout" method="POST">
              <input type="hidden" name="plan" value={p.id} />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: p.highlight
                    ? 'linear-gradient(135deg, #A07D1C, #D4AF37)'
                    : 'rgba(212,175,55,0.1)',
                  color: p.highlight ? '#080C14' : '#D4AF37',
                  border: p.highlight ? 'none' : '1px solid rgba(212,175,55,0.35)',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif',
                }}
              >
                {me?.subscriptionStatus === 'active' ? 'تغيير للخطة' : 'ابدأ الآن'}
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* Features */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: 14,
          padding: 20,
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', marginBottom: 14 }}>
          ما تحصل عليه في كل خطة
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {FEATURES.map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'start', gap: 8, fontSize: 12, color: '#C8D8EE' }}>
              <span style={{ color: '#D4AF37', fontSize: 14, lineHeight: 1 }}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 24,
          color: '#4A5A7A',
          fontSize: 11,
        }}
      >
        <div style={{ marginBottom: 8 }}>طرق الدفع المقبولة</div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>Visa</span>
          <span>Mastercard</span>
          <span>PayPal</span>
          <span>Mada</span>
          <span>Apple Pay</span>
        </div>
      </div>
    </div>
  )
}
