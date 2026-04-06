import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const KILLZONE_AR: Record<string, string> = {
  ASIA: 'آسيا', LONDON: 'لندن', NY_AM: 'NY ص', NY_PM: 'NY م', OFF_HOURS: 'خارج',
}

export default async function TradesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id, isBacktest: false },
    include: { entryReasons: { include: { entryReason: true } } },
    orderBy: { entryTime: 'desc' },
    take: 100,
  })

  if (trades.length === 0) {
    return (
      <div className="px-4 relative z-[1]">
        <div className="card-dark p-16 text-center mt-6">
          <div className="w-14 h-14 rounded-full bg-[#162035] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#4A5A7A" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <p className="text-[#4A5A7A] mb-1">لا توجد صفقات بعد</p>
          <p className="text-[#2A3A5A] text-xs mb-4">ابدأ بتسجيل أول صفقة من تبويب اليومية</p>
          <Link
            href={`/${locale}/trades/new`}
            className="inline-flex items-center gap-2 gold-btn px-5 py-2.5 rounded-xl text-sm"
          >
            + تسجيل صفقة
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 relative z-[1]">
      <div className="flex items-center justify-between mt-4 mb-3">
        <h1 className="text-[#D4AF37] text-sm font-bold tracking-wide">سجل الصفقات ({trades.length})</h1>
        <Link
          href={`/${locale}/trades/new`}
          className="gold-btn px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
        >
          + جديدة
        </Link>
      </div>

      <div className="space-y-2.5">
        {trades.map((trade, i) => {
          const pnl = trade.pnl !== null ? Number(trade.pnl) : null
          const isWin = pnl !== null && pnl > 0
          const rr = trade.rrAchieved ? Number(trade.rrAchieved) : null

          return (
            <div key={trade.id} className="card-dark p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#4A5A7A] text-[10px]">#{trades.length - i}</span>
                  <span className="text-[#C8D8EE] font-bold">{trade.symbol}</span>
                  {pnl !== null && (
                    <span className={`text-sm font-black ${isWin ? 'text-[#1DB954]' : 'text-[#E74C3C]'}`}>
                      {isWin ? '+' : ''}${pnl.toFixed(0)}
                    </span>
                  )}
                </div>
                <span className="text-[#4A5A7A] text-[10px]">
                  {trade.entryTime.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={[
                  'text-[10px] font-bold px-2.5 py-1 rounded-full',
                  trade.direction === 'LONG'
                    ? 'bg-[rgba(29,185,84,0.12)] text-[#1DB954]'
                    : 'bg-[rgba(231,76,60,0.12)] text-[#E74C3C]',
                ].join(' ')}>
                  {trade.direction === 'LONG' ? '▲ شراء' : '▼ بيع'}
                </span>

                {rr !== null && (
                  <span className={[
                    'text-[10px] px-2.5 py-1 rounded-full border',
                    rr >= 1
                      ? 'bg-[rgba(29,185,84,0.08)] border-[rgba(29,185,84,0.3)] text-[#1DB954]'
                      : 'bg-[rgba(231,76,60,0.08)] border-[rgba(231,76,60,0.3)] text-[#E74C3C]',
                  ].join(' ')}>
                    {rr.toFixed(2)}R
                  </span>
                )}

                {trade.killzone && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37]">
                    {KILLZONE_AR[trade.killzone] ?? trade.killzone}
                  </span>
                )}

                {trade.entryReasons.slice(0, 2).map((ter) => (
                  <span key={ter.entryReasonId} className="text-[10px] px-2 py-1 rounded-full bg-[#162035] text-[#8899BB]">
                    {ter.entryReason.name}
                  </span>
                ))}
                {trade.entryReasons.length > 2 && (
                  <span className="text-[10px] text-[#4A5A7A]">+{trade.entryReasons.length - 2}</span>
                )}
              </div>

              {/* Prices */}
              <div className="flex gap-4 text-[10px] text-[#4A5A7A]">
                <span>دخول: <span className="text-[#8899BB] font-mono">{Number(trade.entryPrice).toFixed(2)}</span></span>
                {trade.exitPrice && (
                  <span>خروج: <span className="text-[#8899BB] font-mono">{Number(trade.exitPrice).toFixed(2)}</span></span>
                )}
              </div>

              {trade.notes && (
                <p className="text-[#4A5A7A] text-xs mt-2 leading-relaxed line-clamp-2">{trade.notes}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
