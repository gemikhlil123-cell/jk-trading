import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, TrendingUp, TrendingDown, Target, Activity, BarChart2 } from 'lucide-react'
import { TradeForm } from '@/components/trade/trade-form'
import { BacktestTradeRow } from './backtest-trade-row'

export default async function BacktestSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const bs = await prisma.backtestSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      trades: {
        include: { entryReasons: { include: { entryReason: true } } },
        orderBy: { entryTime: 'asc' },
      },
    },
  })

  if (!bs) notFound()

  // Calculate stats
  const closedTrades = bs.trades.filter((t) => t.pnl !== null)
  const wins = closedTrades.filter((t) => Number(t.pnl) > 0)
  const losses = closedTrades.filter((t) => Number(t.pnl) <= 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl), 0)
  const avgRR =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + Number(t.rrAchieved || 0), 0) / closedTrades.length
      : 0
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Number(t.pnl), 0) / wins.length : 0

  return (
    <div className="px-4 pb-4 space-y-4 relative z-[1]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/backtest`}
          className="p-2 rounded-lg text-[#C8D8EE]/50 hover:text-[#C8D8EE] hover:bg-[#111D2E] transition-colors"
        >
          <ArrowRight size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#C8D8EE]">{bs.name}</h1>
          <p className="text-[#C8D8EE]/50 text-sm mt-0.5">
            {bs.symbol} ·{' '}
            {new Date(bs.startDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
            {' — '}
            {new Date(bs.endDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#C8D8EE]/60 text-xs mb-1">
            <Activity size={13} />
            إجمالي الصفقات
          </div>
          <p className="text-2xl font-bold text-[#C8D8EE]">{bs.trades.length}</p>
          <p className="text-[#C8D8EE]/40 text-xs mt-0.5">{closedTrades.length} مغلقة</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#C8D8EE]/60 text-xs mb-1">
            <Target size={13} />
            معدل الفوز
          </div>
          <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {winRate.toFixed(1)}%
          </p>
          <p className="text-[#C8D8EE]/40 text-xs mt-0.5">{wins.length}W / {losses.length}L</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#C8D8EE]/60 text-xs mb-1">
            <BarChart2 size={13} />
            متوسط RR
          </div>
          <p className={`text-2xl font-bold ${avgRR >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            {avgRR.toFixed(2)}
          </p>
          <p className="text-[#C8D8EE]/40 text-xs mt-0.5">لكل صفقة</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#C8D8EE]/60 text-xs mb-1">
            {totalPnl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            إجمالي PnL
          </div>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}$
          </p>
          <p className="text-[#C8D8EE]/40 text-xs mt-0.5">
            {avgWin > 0 && `متوسط ربح: +${avgWin.toFixed(0)}$`}
          </p>
        </div>
      </div>

      {/* Add trade form */}
      <div className="card-navy p-4">
        <h2 className="text-[#D4AF37] text-xs font-bold tracking-wide mb-3 flex items-center gap-2">
          <Plus size={14} />
          إضافة صفقة للجلسة
        </h2>
        <TradeForm
          isBacktest={true}
          backtestSessionId={bs.id}
          sessionSymbol={bs.symbol as string}
        />
      </div>

      {/* Trades table */}
      <div className="card-navy overflow-hidden">
        <div className="p-4 border-b border-[rgba(212,175,55,0.18)]">
          <h2 className="text-[#C8D8EE] font-semibold">صفقات الجلسة ({bs.trades.length})</h2>
        </div>

        {bs.trades.length === 0 ? (
          <div className="p-12 text-center text-[#C8D8EE]/40">
            لا توجد صفقات بعد — أضف أول صفقة أعلاه
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(212,175,55,0.18)]">
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">الوقت</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">الاتجاه</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">دخول</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">خروج</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">RR</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">PnL</th>
                  <th className="text-right px-4 py-3 text-[#C8D8EE]/50 font-medium">الجلسة</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bs.trades.map((trade) => (
                  <BacktestTradeRow key={trade.id} trade={trade} locale={locale} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
