import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getWeeklyAnalysis } from '@/lib/analysis'
import { WeeklyReviewChart } from '@/components/charts/weekly-review-chart'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import Link from 'next/link'

export default async function WeeklyReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ week?: string }>
}) {
  const { locale } = await params
  const { week } = await searchParams
  const weekOffset = parseInt(week || '0')

  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const [current, previous] = await Promise.all([
    getWeeklyAnalysis(session.user.id, weekOffset),
    getWeeklyAnalysis(session.user.id, weekOffset + 1),
  ])

  const weekLabel = format(current.weekStart, "dd MMM yyyy", { locale: ar })
  const weekEndLabel = format(current.weekEnd, "dd MMM yyyy", { locale: ar })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5DC]">المراجعة الأسبوعية</h1>
          <p className="text-[#F5F5DC]/50 text-sm mt-1">
            {weekLabel} — {weekEndLabel}
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/weekly-review?week=${weekOffset + 1}`}
            className="px-3 py-1.5 rounded-lg border border-[#1D3461] text-[#F5F5DC]/60 hover:text-[#F5F5DC] hover:bg-[#112240] text-sm transition-colors"
          >
            → الأسبوع السابق
          </Link>
          {weekOffset > 0 && (
            <Link
              href={`/${locale}/weekly-review?week=${weekOffset - 1}`}
              className="px-3 py-1.5 rounded-lg border border-[#1D3461] text-[#F5F5DC]/60 hover:text-[#F5F5DC] hover:bg-[#112240] text-sm transition-colors"
            >
              الأسبوع التالي ←
            </Link>
          )}
          {weekOffset > 0 && (
            <Link
              href={`/${locale}/weekly-review`}
              className="px-3 py-1.5 rounded-lg bg-[#F5F5DC]/10 text-[#F5F5DC]/80 hover:bg-[#F5F5DC]/15 text-sm transition-colors"
            >
              هذا الأسبوع
            </Link>
          )}
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-[#F5F5DC]/50 text-xs mb-1">إجمالي الصفقات</p>
          <p className="text-2xl font-bold text-[#F5F5DC]">{current.totalTrades}</p>
          {previous.totalTrades > 0 && (
            <p className="text-xs text-[#F5F5DC]/30 mt-1">
              الأسبوع الماضي: {previous.totalTrades}
            </p>
          )}
        </div>
        <div className="stat-card">
          <p className="text-[#F5F5DC]/50 text-xs mb-1">معدل الفوز</p>
          <p className={`text-2xl font-bold ${current.overallWinRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
            {(current.overallWinRate * 100).toFixed(1)}%
          </p>
          {previous.totalTrades > 0 && (
            <p className="text-xs text-[#F5F5DC]/30 mt-1">
              الأسبوع الماضي: {(previous.overallWinRate * 100).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="stat-card">
          <p className="text-[#F5F5DC]/50 text-xs mb-1">فوز</p>
          <p className="text-2xl font-bold text-green-400">{current.totalWins}</p>
        </div>
        <div className="stat-card">
          <p className="text-[#F5F5DC]/50 text-xs mb-1">خسارة</p>
          <p className="text-2xl font-bold text-red-400">{current.totalLosses}</p>
        </div>
      </div>

      {current.totalTrades === 0 ? (
        <div className="card-navy p-12 text-center">
          <p className="text-[#F5F5DC]/40 text-lg mb-2">لا توجد صفقات هذا الأسبوع</p>
          <p className="text-[#F5F5DC]/25 text-sm">أضف صفقات مغلقة لترى التحليل</p>
        </div>
      ) : (
        <>
          {/* Keep / Remove Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KEEP */}
            <div className="card-navy p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <h2 className="font-bold text-[#F5F5DC]">قائمة الاحتفاظ</h2>
                <span className="ms-auto text-green-400 text-sm font-semibold">
                  {current.keepList.length} سبب
                </span>
              </div>
              <p className="text-[#F5F5DC]/40 text-xs mb-4">
                هذه هي قواعدك الذهبية — ادخل فقط عند توافرها (معدل فوز {'>'} 70%)
              </p>

              {current.keepList.length === 0 ? (
                <p className="text-[#F5F5DC]/30 text-sm text-center py-4">
                  لا توجد أسباب بمعدل فوز {'>'} 70% هذا الأسبوع
                </p>
              ) : (
                <div className="space-y-2">
                  {current.keepList.map((tag) => {
                    const prev = previous.tags.find((t) => t.tag === tag.tag)
                    const diff = prev
                      ? tag.winRate - prev.winRate
                      : null
                    return (
                      <div
                        key={tag.tag}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-green-500/5 border border-green-500/20"
                      >
                        <div>
                          <span className="text-[#F5F5DC] text-sm font-medium">
                            {tag.tag}
                          </span>
                          <span className="text-[#F5F5DC]/40 text-xs ms-2">
                            {tag.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#F5F5DC]/40 text-xs">
                            {tag.appearances} مرة
                          </span>
                          <span className="text-green-400 font-semibold text-sm">
                            {(tag.winRate * 100).toFixed(0)}%
                          </span>
                          {diff !== null && (
                            <span
                              className={`text-xs ${
                                diff >= 0 ? 'text-green-300' : 'text-red-300'
                              }`}
                            >
                              {diff >= 0 ? '↑' : '↓'}
                              {Math.abs(diff * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* REMOVE */}
            <div className="card-navy p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <h2 className="font-bold text-[#F5F5DC]">قائمة الإزالة</h2>
                <span className="ms-auto text-red-400 text-sm font-semibold">
                  {current.removeList.length} سبب
                </span>
              </div>
              <p className="text-[#F5F5DC]/40 text-xs mb-4">
                هذه إشارات خطر — توقف عن الدخول بناءً على هذه الأسباب (معدل خسارة {'>'} 60%)
              </p>

              {current.removeList.length === 0 ? (
                <p className="text-[#F5F5DC]/30 text-sm text-center py-4">
                  لا توجد أسباب بمعدل خسارة {'>'} 60% هذا الأسبوع
                </p>
              ) : (
                <div className="space-y-2">
                  {current.removeList.map((tag) => {
                    const prev = previous.tags.find((t) => t.tag === tag.tag)
                    const diff = prev
                      ? tag.lossRate - prev.lossRate
                      : null
                    return (
                      <div
                        key={tag.tag}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-red-500/5 border border-red-500/20"
                      >
                        <div>
                          <span className="text-[#F5F5DC] text-sm font-medium">
                            {tag.tag}
                          </span>
                          <span className="text-[#F5F5DC]/40 text-xs ms-2">
                            {tag.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#F5F5DC]/40 text-xs">
                            {tag.appearances} مرة
                          </span>
                          <span className="text-red-400 font-semibold text-sm">
                            {(tag.lossRate * 100).toFixed(0)}%
                          </span>
                          {diff !== null && (
                            <span
                              className={`text-xs ${
                                diff >= 0 ? 'text-red-300' : 'text-green-300'
                              }`}
                            >
                              {diff >= 0 ? '↑' : '↓'}
                              {Math.abs(diff * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-navy p-5">
              <WeeklyReviewChart
                title="أسباب الدخول الفائزة — معدل الفوز %"
                data={current.keepList.length > 0 ? current.keepList : current.tags.filter(t => t.winRate > 0)}
                type="keep"
              />
            </div>
            <div className="card-navy p-5">
              <WeeklyReviewChart
                title="أسباب الدخول الخاسرة — معدل الخسارة %"
                data={current.removeList.length > 0 ? current.removeList : current.tags.filter(t => t.lossRate > 0)}
                type="remove"
              />
            </div>
          </div>

          {/* Neutral tags */}
          {current.neutralList.length > 0 && (
            <div className="card-navy p-5">
              <h2 className="font-bold text-[#F5F5DC] mb-3">
                الأسباب المحايدة ({current.neutralList.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {current.neutralList.map((tag) => (
                  <span
                    key={tag.tag}
                    className="tag-neutral"
                    title={`${tag.appearances} مرة — فوز ${(tag.winRate * 100).toFixed(0)}%`}
                  >
                    {tag.tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
