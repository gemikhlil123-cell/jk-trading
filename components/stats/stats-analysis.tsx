'use client'

interface Trade {
  pnl: number
  rrAchieved: number | null
  entryReasons: string[]
  direction: string
}

interface Props {
  trades: Trade[]
}

export function StatsAnalysis({ trades }: Props) {
  if (trades.length < 3) return null

  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)
  const winRate = (wins.length / trades.length) * 100
  const avgRR = trades.reduce((s, t) => s + (t.rrAchieved ?? 0), 0) / trades.length

  const keep: string[] = []
  const fix: string[] = []
  const stop: string[] = []

  if (winRate >= 60) keep.push(`معدل فوز ${winRate.toFixed(1)}% ممتاز — حافظ على النهج الحالي`)
  else if (winRate >= 40) fix.push(`معدل الفوز ${winRate.toFixed(1)}% — يمكن تحسينه بتصفية الإعداد`)
  else stop.push(`معدل الفوز ${winRate.toFixed(1)}% منخفض جداً — راجع معايير الدخول`)

  if (avgRR >= 2) keep.push(`متوسط RR ${avgRR.toFixed(2)} ممتاز — استمر في احترام الأهداف`)
  else if (avgRR >= 1) fix.push(`متوسط RR ${avgRR.toFixed(2)} — حاول تحسين نسبة المكافأة`)
  else stop.push(`متوسط RR ${avgRR.toFixed(2)} أقل من 1:1 — خطر عالٍ على رأس المال`)

  if (trades.length > 5) {
    const longs = trades.filter(t => t.direction === 'LONG')
    const shorts = trades.filter(t => t.direction === 'SHORT')
    const longWR = longs.length > 0 ? longs.filter(t => t.pnl > 0).length / longs.length * 100 : 0
    const shortWR = shorts.length > 0 ? shorts.filter(t => t.pnl > 0).length / shorts.length * 100 : 0
    if (longWR > shortWR + 20) keep.push(`أداؤك في الشراء (${longWR.toFixed(0)}%) أفضل من البيع`)
    else if (shortWR > longWR + 20) keep.push(`أداؤك في البيع (${shortWR.toFixed(0)}%) أفضل من الشراء`)
  }

  const allEmpty = keep.length === 0 && fix.length === 0 && stop.length === 0
  if (allEmpty) return null

  return (
    <div className="space-y-2 mb-4">
      <div className="sec-title">تحليل الأداء</div>

      {keep.length > 0 && (
        <div className="rounded-2xl border border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.06)] p-4">
          <p className="text-[#1DB954] text-xs font-bold mb-2 flex items-center gap-1.5">
            <span>✦</span> استمر في هذا
          </p>
          {keep.map((item, i) => (
            <p key={i} className="text-[#8899BB] text-xs mt-1.5 flex gap-2">
              <span className="text-[#1DB954] flex-shrink-0">✓</span>
              {item}
            </p>
          ))}
        </div>
      )}

      {fix.length > 0 && (
        <div className="rounded-2xl border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.06)] p-4">
          <p className="text-[#D4AF37] text-xs font-bold mb-2 flex items-center gap-1.5">
            <span>◈</span> يجب تحسينه
          </p>
          {fix.map((item, i) => (
            <p key={i} className="text-[#8899BB] text-xs mt-1.5 flex gap-2">
              <span className="text-[#D4AF37] flex-shrink-0">→</span>
              {item}
            </p>
          ))}
        </div>
      )}

      {stop.length > 0 && (
        <div className="rounded-2xl border border-[rgba(231,76,60,0.3)] bg-[rgba(231,76,60,0.06)] p-4">
          <p className="text-[#E74C3C] text-xs font-bold mb-2 flex items-center gap-1.5">
            <span>✕</span> توقف عن هذا
          </p>
          {stop.map((item, i) => (
            <p key={i} className="text-[#8899BB] text-xs mt-1.5 flex gap-2">
              <span className="text-[#E74C3C] flex-shrink-0">!</span>
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
