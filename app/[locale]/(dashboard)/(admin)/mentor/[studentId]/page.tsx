import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDeepAnalysis } from '@/lib/deep-analysis'
import { MentorCommentForm } from '@/components/mentor/mentor-comment-form'
import { formatJerusalemDate, formatJerusalemTime } from '@/lib/timezone'
import { StudentTradeChartImages } from '@/components/mentor/student-trade-chart-images'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function MentorStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; studentId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale, studentId } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1'))
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

  const totalTrades = await prisma.trade.count({
    where: { userId: studentId, isBacktest: false },
  })
  const totalPages = Math.max(1, Math.ceil(totalTrades / PAGE_SIZE))

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
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37' }}>
          جميع صفقات الطالب ({totalTrades})
        </h2>
        <span style={{ fontSize: 11, color: '#4A5A7A' }}>
          صفحة {page} / {totalPages}
        </span>
      </div>

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
          const cleanNotes = t.notes ? t.notes.replace(/__meta:.*$/s, '').trim() : ''
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
                    {formatJerusalemDate(t.entryTime)} · {formatJerusalemTime(t.entryTime)}
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

              {/* Chart images — gallery */}
              {t.chartImages && (
                <StudentTradeChartImages raw={t.chartImages} />
              )}

              {cleanNotes && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#8899BB',
                    marginBottom: 8,
                    padding: 8,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {cleanNotes}
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
                        {c.mentor.name ?? c.mentor.email} · {formatJerusalemDate(c.createdAt)}
                      </div>
                      <div style={{ color: '#C8D8EE', fontSize: 12 }}>{c.body}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <Link
                  href={`/${locale}/trades/${t.id}`}
                  style={{
                    fontSize: 11,
                    color: '#D4AF37',
                    textDecoration: 'none',
                    padding: '6px 10px',
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  عرض التفاصيل الكاملة →
                </Link>
              </div>

              <div style={{ marginTop: 8 }}>
                <MentorCommentForm tradeId={t.id} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {page > 1 && (
            <Link
              href={`/${locale}/mentor/${studentId}?page=${page - 1}`}
              style={{
                padding: '8px 14px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: 10,
                color: '#D4AF37',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              ← السابق
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/${locale}/mentor/${studentId}?page=${page + 1}`}
              style={{
                padding: '8px 14px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: 10,
                color: '#D4AF37',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              التالي →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
