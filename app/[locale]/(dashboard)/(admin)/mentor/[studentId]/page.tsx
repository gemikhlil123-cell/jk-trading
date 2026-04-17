import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { MentorCommentForm } from '@/components/mentor/mentor-comment-form'

export default async function MentorStudentPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>
}) {
  const { locale, studentId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const me = await prisma.user.findUnique({ where: { id: session.user.id as string } })
  if (!me || me.role !== 'MENTOR') redirect(`/${locale}/dashboard`)

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, subscriptionStatus: true },
  })
  if (!student) redirect(`/${locale}/mentor`)

  const analysis = await getDeepAnalysis(studentId, { isBacktest: false })

  const trades = await prisma.trade.findMany({
    where: { userId: studentId, isBacktest: false },
    include: {
      entryReasons: { include: { entryReason: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { mentor: { select: { name: true, email: true } } },
      },
    },
    orderBy: { entryTime: 'desc' },
    take: 30,
  })

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '20px 16px 100px' }}>
      <Link
        href={`/${locale}/mentor`}
        style={{ color: '#8899BB', fontSize: 12, textDecoration: 'none' }}
      >
        ← رجوع للطلاب
      </Link>

      <div style={{ marginTop: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37' }}>
          {student.name ?? student.email}
        </h1>
        <p style={{ fontSize: 11, color: '#4A5A7A', marginTop: 2 }}>{student.email}</p>
      </div>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'صفقات', value: analysis.totalTrades, color: '#C8D8EE' },
          {
            label: 'فوز %',
            value: analysis.totalTrades > 0 ? `${(analysis.winRate * 100).toFixed(0)}%` : '—',
            color: analysis.winRate >= 0.5 ? '#1DB954' : '#E74C3C',
          },
          {
            label: 'P&L',
            value: `${analysis.totalPnl >= 0 ? '+' : ''}${analysis.totalPnl.toFixed(0)}`,
            color: analysis.totalPnl >= 0 ? '#1DB954' : '#E74C3C',
          },
          {
            label: 'PF',
            value: analysis.profitFactor === Infinity ? '∞' : analysis.profitFactor.toFixed(2),
            color: '#D4AF37',
          },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(212,175,55,0.1)',
              borderRadius: 12,
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: s.color, fontSize: 16, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: '#8899BB', fontSize: 10, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', marginBottom: 10 }}>
        أحدث صفقات الطالب
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trades.length === 0 && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(212,175,55,0.1)',
              borderRadius: 12,
              color: '#4A5A7A',
              fontSize: 12,
            }}
          >
            لا يوجد صفقات
          </div>
        )}
        {trades.map(t => {
          const pnl = t.pnl !== null ? Number(t.pnl) : null
          return (
            <div
              key={t.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: t.direction === 'LONG' ? 'rgba(29,185,84,0.15)' : 'rgba(231,76,60,0.15)',
                      color: t.direction === 'LONG' ? '#1DB954' : '#E74C3C',
                    }}
                  >
                    {t.direction === 'LONG' ? 'شراء' : 'بيع'}
                  </span>
                  <span style={{ color: '#C8D8EE', fontWeight: 700, fontSize: 13 }}>{t.symbol}</span>
                  <span style={{ color: '#4A5A7A', fontSize: 11 }}>
                    {t.entryTime.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {pnl !== null && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: pnl >= 0 ? '#1DB954' : '#E74C3C',
                    }}
                  >
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)} نقطة
                  </span>
                )}
              </div>

              {t.entryReasons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {t.entryReasons.map(r => (
                    <span
                      key={r.entryReasonId}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 8,
                        background: 'rgba(212,175,55,0.08)',
                        color: '#D4AF37',
                      }}
                    >
                      {r.entryReason.name}
                    </span>
                  ))}
                </div>
              )}

              {t.notes && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#8899BB',
                    marginBottom: 8,
                    padding: 8,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                  }}
                >
                  {t.notes}
                </div>
              )}

              {/* Existing comments */}
              {t.comments.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {t.comments.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: 8,
                        background: 'rgba(212,175,55,0.06)',
                        borderRadius: 8,
                        borderRight: '3px solid #D4AF37',
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontSize: 10, color: '#D4AF37', fontWeight: 700, marginBottom: 4 }}>
                        {c.mentor.name ?? c.mentor.email} ·{' '}
                        {new Date(c.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ color: '#C8D8EE', fontSize: 12 }}>{c.body}</div>
                    </div>
                  ))}
                </div>
              )}

              <MentorCommentForm tradeId={t.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
