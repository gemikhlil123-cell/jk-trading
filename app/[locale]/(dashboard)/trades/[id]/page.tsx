import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { TradeDetailView } from '@/components/trade/trade-detail-view'
import { detectSentimentsInText } from '@/lib/notes-analysis'

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  // Mentors can view any student's trade; students only see their own
  const me = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { role: true },
  })
  const whereClause =
    me?.role === 'MENTOR'
      ? { id }
      : { id, userId: session.user.id as string }

  const trade = await prisma.trade.findFirst({
    where: whereClause,
    include: {
      entryReasons: { include: { entryReason: true } },
      comments: { include: { mentor: { select: { name: true } } } },
    },
  })

  if (!trade) notFound()

  // Serialize Decimal/Date fields to plain JSON for client component
  const serialized = {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: Number(trade.entryPrice),
    exitPrice: trade.exitPrice !== null ? Number(trade.exitPrice) : null,
    entryTime: trade.entryTime.toISOString(),
    exitTime: trade.exitTime ? trade.exitTime.toISOString() : null,
    pnl: trade.pnl !== null ? Number(trade.pnl) : null,
    rrAchieved: trade.rrAchieved !== null ? Number(trade.rrAchieved) : null,
    rrPlanned: trade.rrPlanned !== null ? Number(trade.rrPlanned) : null,
    killzone: trade.killzone,
    cyclePhase: trade.cyclePhase,
    notes: trade.notes,
    chartImages: trade.chartImages,
    selfRating: trade.selfRating,
    emotionalState: trade.emotionalState,
    isBacktest: trade.isBacktest,
    entryReasons: trade.entryReasons.map((er) => ({
      id: er.entryReason.id,
      name: er.entryReason.name,
      category: er.entryReason.category,
    })),
    comments: trade.comments.map((c) => ({
      id: c.id,
      body: c.body,
      mentorName: c.mentor?.name ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    sentiments: trade.notes ? detectSentimentsInText(trade.notes) : [],
  }

  return (
    <div className="px-4 relative z-[1] pb-20">
      <div className="flex items-center justify-between mt-4 mb-3">
        <Link
          href={`/${locale}/trades`}
          className="text-[#D4AF37] text-xs font-bold flex items-center gap-1"
        >
          ← الرجوع للسجل
        </Link>
        <h1 className="text-[#D4AF37] text-sm font-bold tracking-wide">تفاصيل الصفقة</h1>
      </div>
      <TradeDetailView trade={serialized} locale={locale} />
    </div>
  )
}
