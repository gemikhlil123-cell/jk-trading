import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FlaskConical, ChevronLeft } from 'lucide-react'
import { DeleteSessionButton } from './delete-session-button'

export default async function BacktestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const sessions = await prisma.backtestSession.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { trades: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-4 pb-4 space-y-4 relative z-[1]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#C8D8EE]">الباكتيست</h1>
          <p className="text-[#C8D8EE]/50 text-sm mt-0.5">اختبر استراتيجيتك على بيانات تاريخية</p>
        </div>
        <Link
          href={`/${locale}/backtest/new`}
          className="flex items-center gap-2 gold-btn text-[#080C14] px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-colors"
        >
          <Plus size={16} />
          جلسة جديدة
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card-navy p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#111D2E] flex items-center justify-center mx-auto">
            <FlaskConical size={28} className="text-[#C8D8EE]/30" />
          </div>
          <div>
            <p className="text-[#C8D8EE]/60 mb-1">لا توجد جلسات باكتيست</p>
            <p className="text-[#C8D8EE]/30 text-sm">ابدأ بإنشاء جلسة لاختبار استراتيجيتك</p>
          </div>
          <Link
            href={`/${locale}/backtest/new`}
            className="inline-flex items-center gap-2 gold-btn text-[#080C14] px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-colors"
          >
            <Plus size={14} />
            إنشاء جلسة
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const winRate = s.winRate ? Number(s.winRate).toFixed(1) : null
            const avgRR = s.avgRR ? Number(s.avgRR).toFixed(2) : null

            return (
              <div key={s.id} className="card-navy p-5 space-y-4 hover:border-[#F5F5DC]/20 border border-transparent transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#C8D8EE] truncate">{s.name}</h3>
                    <p className="text-[#C8D8EE]/50 text-xs mt-0.5">{s.symbol}</p>
                  </div>
                  <DeleteSessionButton sessionId={s.id} locale={locale} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#111D2E] rounded-lg p-2">
                    <p className="text-[#C8D8EE]/50 text-xs">صفقات</p>
                    <p className="text-[#C8D8EE] font-bold text-lg">{s._count.trades}</p>
                  </div>
                  <div className="bg-[#111D2E] rounded-lg p-2">
                    <p className="text-[#C8D8EE]/50 text-xs">فوز%</p>
                    <p className={`font-bold text-lg ${winRate && Number(winRate) >= 50 ? 'text-green-400' : 'text-[#C8D8EE]/60'}`}>
                      {winRate ?? '—'}
                      {winRate && '%'}
                    </p>
                  </div>
                  <div className="bg-[#111D2E] rounded-lg p-2">
                    <p className="text-[#C8D8EE]/50 text-xs">متوسط RR</p>
                    <p className="text-[#C8D8EE] font-bold text-lg">{avgRR ?? '—'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#C8D8EE]/40">
                  <span>
                    {new Date(s.startDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(s.endDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <Link
                  href={`/${locale}/backtest/${s.id}`}
                  className="flex items-center justify-center gap-2 w-full border border-[rgba(212,175,55,0.18)] hover:border-[#F5F5DC]/30 text-[#C8D8EE]/70 hover:text-[#C8D8EE] rounded-lg py-2 text-sm transition-colors"
                >
                  عرض الجلسة
                  <ChevronLeft size={14} />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
