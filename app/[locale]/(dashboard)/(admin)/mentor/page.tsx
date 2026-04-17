import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MentorOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const me = await prisma.user.findUnique({ where: { id: session.user.id as string } })
  if (!me || me.role !== 'MENTOR') redirect(`/${locale}/dashboard`)

  // All students (everyone who isn't a mentor)
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      trades: {
        where: { isBacktest: false },
        select: { pnl: true, entryTime: true },
      },
      _count: { select: { trades: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = students.map((s) => {
    const closed = s.trades.filter((t) => t.pnl !== null)
    const wins = closed.filter((t) => Number(t.pnl) > 0)
    const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0
    const lastTradeAt = closed.length > 0
      ? closed.reduce((m, t) => t.entryTime > m ? t.entryTime : m, closed[0].entryTime)
      : null
    return {
      id: s.id,
      name: s.name ?? s.email,
      email: s.email,
      trades: closed.length,
      totalPnl,
      winRate,
      lastTradeAt,
      subscriptionStatus: s.subscriptionStatus,
      isActive: s.isActive,
    }
  })

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '20px 16px 100px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37', marginBottom: 6 }}>لوحة المدرب</h1>
      <p style={{ fontSize: 12, color: '#8899BB', marginBottom: 18 }}>
        إحصائيات جميع طلابك في مكان واحد — اضغط على اسم الطالب لعرض صفقاته والتعليق عليها.
      </p>

      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '10px 12px',
            background: 'rgba(212,175,55,0.06)',
            borderBottom: '1px solid rgba(212,175,55,0.1)',
            fontSize: 11,
            color: '#D4AF37',
            fontWeight: 700,
          }}
        >
          <div>الطالب</div>
          <div style={{ textAlign: 'center' }}>صفقات</div>
          <div style={{ textAlign: 'center' }}>فوز %</div>
          <div style={{ textAlign: 'center' }}>P&amp;L</div>
          <div style={{ textAlign: 'center' }}>آخر صفقة</div>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#4A5A7A', fontSize: 13 }}>
            لا يوجد طلاب بعد
          </div>
        )}

        {rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/${locale}/mentor/${r.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '12px',
              textDecoration: 'none',
              borderTop: i > 0 ? '1px solid rgba(212,175,55,0.07)' : 'none',
              fontSize: 12,
              color: '#C8D8EE',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 2 }}>{r.email}</div>
            </div>
            <div style={{ textAlign: 'center' }}>{r.trades}</div>
            <div
              style={{
                textAlign: 'center',
                color: r.winRate >= 50 ? '#1DB954' : '#E74C3C',
                fontWeight: 700,
              }}
            >
              {r.trades > 0 ? `${r.winRate.toFixed(0)}%` : '—'}
            </div>
            <div
              style={{
                textAlign: 'center',
                color: r.totalPnl >= 0 ? '#1DB954' : '#E74C3C',
                fontWeight: 700,
              }}
            >
              {r.trades > 0 ? `${r.totalPnl >= 0 ? '+' : ''}${r.totalPnl.toFixed(0)}` : '—'}
            </div>
            <div style={{ textAlign: 'center', color: '#8899BB', fontSize: 10 }}>
              {r.lastTradeAt
                ? new Date(r.lastTradeAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
                : '—'}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
