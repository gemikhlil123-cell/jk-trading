interface Trade {
  pnl: number | null
  rrAchieved: number | null
  entryReasons: string[]
  killzone: string | null
  entryTime: Date
  direction: string
  symbol: string
}

interface Props {
  trades: Trade[]
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const KZ_LABELS: Record<string, string> = {
  ASIA:   'آسيا',
  LONDON: 'لندن',
  NY_AM:  'نيويورك صباح',
  NY_PM:  'نيويورك مساء',
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : ''}$${n.toFixed(0)}`
}

export function AdvancedStats({ trades }: Props) {
  if (trades.length < 5) return null

  const closed = trades.filter((t) => t.pnl !== null) as (Trade & { pnl: number })[]

  // ─── Section 1: Entry Reasons ─────────────────────────────────────────────
  const reasonMap: Record<string, { wins: number; losses: number; pnlSum: number }> = {}
  for (const t of closed) {
    for (const r of t.entryReasons) {
      if (!reasonMap[r]) reasonMap[r] = { wins: 0, losses: 0, pnlSum: 0 }
      if (t.pnl > 0) reasonMap[r].wins++
      else reasonMap[r].losses++
      reasonMap[r].pnlSum += t.pnl
    }
  }

  const reasonStats = Object.entries(reasonMap)
    .map(([name, d]) => {
      const total = d.wins + d.losses
      return {
        name,
        total,
        wins: d.wins,
        losses: d.losses,
        winRate: total > 0 ? (d.wins / total) * 100 : 0,
        totalPnl: d.pnlSum,
        avgPnl: total > 0 ? d.pnlSum / total : 0,
      }
    })
    .filter((r) => r.total >= 3)

  // Best reasons: repeat ≥3 times AND winRate ≥ 60% AND positive PnL
  // Ranked by a quality score that combines win rate, sample size, and avg PnL
  const topReasons = reasonStats
    .filter((r) => r.winRate >= 60 && r.avgPnl > 0)
    .map((r) => ({ ...r, score: (r.winRate / 100) * Math.min(r.total, 10) * Math.max(r.avgPnl, 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const topNames = new Set(topReasons.map((r) => r.name))

  // Worst reasons: repeat ≥3 times AND (winRate ≤ 45% OR negative total PnL)
  // Must not overlap with top — sorted by most-harmful first
  const worstReasons = reasonStats
    .filter((r) => !topNames.has(r.name) && (r.winRate <= 45 || r.totalPnl < 0))
    .map((r) => ({ ...r, harm: (1 - r.winRate / 100) * r.total + Math.max(-r.totalPnl, 0) / 50 }))
    .sort((a, b) => b.harm - a.harm)
    .slice(0, 3)

  // Neutral reasons (between 45% and 60% winRate) — need more data
  const neutralReasons = reasonStats
    .filter((r) => !topNames.has(r.name) && !worstReasons.find((w) => w.name === r.name))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  // ─── Section 2: Killzones ─────────────────────────────────────────────────
  const kzMap: Record<string, { wins: number; total: number; pnlSum: number }> = {}
  for (const t of closed) {
    const kz = t.killzone ?? 'OFF_HOURS'
    if (!kzMap[kz]) kzMap[kz] = { wins: 0, total: 0, pnlSum: 0 }
    kzMap[kz].total++
    kzMap[kz].pnlSum += t.pnl
    if (t.pnl > 0) kzMap[kz].wins++
  }

  const kzStats = ['ASIA', 'LONDON', 'NY_AM', 'NY_PM'].map((kz) => {
    const d = kzMap[kz] ?? { wins: 0, total: 0, pnlSum: 0 }
    return {
      kz,
      label: KZ_LABELS[kz],
      wins: d.wins,
      total: d.total,
      pnlSum: d.pnlSum,
      winRate: d.total > 0 ? (d.wins / d.total) * 100 : 0,
    }
  })

  // ─── Section 3: Day of Week ───────────────────────────────────────────────
  const dayMap: Record<number, { wins: number; total: number; pnlSum: number }> = {}
  for (const t of closed) {
    const day = new Date(t.entryTime).getDay()
    if (!dayMap[day]) dayMap[day] = { wins: 0, total: 0, pnlSum: 0 }
    dayMap[day].total++
    dayMap[day].pnlSum += t.pnl
    if (t.pnl > 0) dayMap[day].wins++
  }

  const dayStats = [0, 1, 2, 3, 4, 5, 6]
    .map((d) => ({
      day: d,
      label: DAY_NAMES[d],
      ...( dayMap[d] ?? { wins: 0, total: 0, pnlSum: 0 }),
      winRate: dayMap[d] ? (dayMap[d].wins / dayMap[d].total) * 100 : 0,
    }))
    .filter((d) => d.total >= 2)

  // ─── Section 4: Performance by Symbol ─────────────────────────────────────
  const symMap: Record<string, { wins: number; total: number; pnlSum: number }> = {}
  for (const t of closed) {
    const sym = (t.symbol || '').trim().toUpperCase() || 'غير محدد'
    if (!symMap[sym]) symMap[sym] = { wins: 0, total: 0, pnlSum: 0 }
    symMap[sym].total++
    symMap[sym].pnlSum += t.pnl
    if (t.pnl > 0) symMap[sym].wins++
  }

  const symStats = Object.entries(symMap)
    .map(([sym, d]) => ({
      sym,
      wins: d.wins,
      total: d.total,
      pnlSum: d.pnlSum,
      winRate: d.total > 0 ? (d.wins / d.total) * 100 : 0,
    }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.pnlSum - a.pnlSum)

  // ─── Section 5: Consecutive Losses ───────────────────────────────────────
  const sorted = [...closed].sort(
    (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
  )

  let maxStreak = 0
  let currentStreak = 0
  let timesTwo = 0
  let timesThreePlus = 0
  let inStreak = false

  for (const t of sorted) {
    if (t.pnl < 0) {
      currentStreak++
      if (!inStreak) inStreak = true
    } else {
      if (currentStreak >= 3) timesThreePlus++
      if (currentStreak >= 2) timesTwo++
      if (currentStreak > maxStreak) maxStreak = currentStreak
      currentStreak = 0
      inStreak = false
    }
  }
  // flush last streak
  if (currentStreak >= 3) timesThreePlus++
  if (currentStreak >= 2) timesTwo++
  if (currentStreak > maxStreak) maxStreak = currentStreak

  const revengeWarning = timesThreePlus > 0

  return (
    <div className="space-y-1 mt-1">
      {/* ─── Section 1: Entry Reasons ─── */}
      {reasonStats.length > 0 && (
        <>
          <div className="sec-title">أفضل وأسوأ أسباب الدخول</div>
          <div className="card-dark p-3">
            {topReasons.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#4E9E7A', marginBottom: 8, letterSpacing: '0.06em' }}>
                  ⭐ نجوم الدخول
                </p>
                <div className="space-y-1.5">
                  {topReasons.map((r) => (
                    <div
                      key={r.name}
                      style={{
                        background: 'rgba(78,158,122,0.07)',
                        border: '1px solid rgba(78,158,122,0.2)',
                        borderRadius: 8,
                        padding: '7px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C8D8EE', flex: 1 }}>{r.name}</span>
                      <span style={{ fontSize: 10, color: '#4E9E7A', fontWeight: 800 }}>{r.winRate.toFixed(0)}%</span>
                      <span style={{ fontSize: 10, color: '#8899BB' }}>{r.total} صفقة</span>
                      <span style={{ fontSize: 10, color: r.avgPnl >= 0 ? '#4E9E7A' : '#BB5B5B', fontWeight: 700 }}>
                        {fmt(r.avgPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {worstReasons.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#BB5B5B', marginTop: 12, marginBottom: 8, letterSpacing: '0.06em' }}>
                  ⚠ تجنب هذه — أسباب خاسرة
                </p>
                <div className="space-y-1.5">
                  {worstReasons.map((r) => (
                    <div
                      key={r.name}
                      style={{
                        background: 'rgba(187,91,91,0.07)',
                        border: '1px solid rgba(187,91,91,0.2)',
                        borderRadius: 8,
                        padding: '7px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C8D8EE', flex: 1 }}>{r.name}</span>
                      <span style={{ fontSize: 10, color: '#BB5B5B', fontWeight: 800 }}>{r.winRate.toFixed(0)}%</span>
                      <span style={{ fontSize: 10, color: '#8899BB' }}>{r.total} صفقة</span>
                      <span style={{ fontSize: 10, color: r.avgPnl >= 0 ? '#4E9E7A' : '#BB5B5B', fontWeight: 700 }}>
                        {fmt(r.avgPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {neutralReasons.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#C29B4A', marginTop: 12, marginBottom: 8, letterSpacing: '0.06em' }}>
                  🔍 تحتاج بيانات أكثر
                </p>
                <div className="space-y-1.5">
                  {neutralReasons.map((r) => (
                    <div
                      key={r.name}
                      style={{
                        background: 'rgba(194,155,74,0.05)',
                        border: '1px solid rgba(194,155,74,0.18)',
                        borderRadius: 8,
                        padding: '7px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C8D8EE', flex: 1 }}>{r.name}</span>
                      <span style={{ fontSize: 10, color: '#C29B4A', fontWeight: 800 }}>{r.winRate.toFixed(0)}%</span>
                      <span style={{ fontSize: 10, color: '#8899BB' }}>{r.total} صفقة</span>
                      <span style={{ fontSize: 10, color: r.avgPnl >= 0 ? '#4E9E7A' : '#BB5B5B', fontWeight: 700 }}>
                        {fmt(r.avgPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {topReasons.length === 0 && worstReasons.length === 0 && (
              <p style={{ fontSize: 11, color: '#8899BB', textAlign: 'center', padding: '8px 0' }}>
                كل أسبابك في المنطقة المتوسطة — تحتاج بيانات أكثر لتصنيف واضح
              </p>
            )}
          </div>
        </>
      )}

      {/* ─── Section 2: Killzones ─── */}
      <div className="sec-title">أفضل وأسوأ أوقات التداول</div>
      <div className="grid grid-cols-2 gap-2">
        {kzStats.map((kz) => {
          const good = kz.winRate >= 50
          const borderColor = kz.total === 0
            ? 'rgba(194,155,74,0.12)'
            : good
            ? 'rgba(78,158,122,0.3)'
            : 'rgba(187,91,91,0.3)'
          const bgColor = kz.total === 0
            ? 'transparent'
            : good
            ? 'rgba(78,158,122,0.05)'
            : 'rgba(187,91,91,0.05)'
          const mainColor = kz.total === 0 ? '#4A5A7A' : good ? '#4E9E7A' : '#BB5B5B'

          return (
            <div
              key={kz.kz}
              className="card-dark p-3"
              style={{ border: `1px solid ${borderColor}`, background: bgColor }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, color: '#C29B4A', letterSpacing: '0.05em', marginBottom: 4 }}>
                {kz.label}
              </p>
              {kz.total === 0 ? (
                <p style={{ fontSize: 11, color: '#4A5A7A' }}>لا بيانات</p>
              ) : (
                <>
                  <p style={{ fontSize: 20, fontWeight: 900, color: mainColor, lineHeight: 1.1 }}>
                    {kz.winRate.toFixed(0)}%
                  </p>
                  <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>
                    {kz.total} صفقة
                  </p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: kz.pnlSum >= 0 ? '#4E9E7A' : '#BB5B5B', marginTop: 2 }}>
                    {fmt(kz.pnlSum)}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ─── Section 3: Day of Week ─── */}
      {dayStats.length > 0 && (
        <>
          <div className="sec-title">أداء أيام الأسبوع</div>
          <div className="card-dark p-3 space-y-2">
            {dayStats.map((d) => {
              const good = d.winRate >= 50
              const barW = `${Math.min(d.winRate, 100)}%`
              return (
                <div key={d.day}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C8D8EE' }}>{d.label}</span>
                    <span style={{ fontSize: 10, color: '#8899BB' }}>{d.total} صفقة</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: good ? '#4E9E7A' : '#BB5B5B' }}>
                      {d.winRate.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: d.pnlSum >= 0 ? '#4E9E7A' : '#BB5B5B' }}>
                      {fmt(d.pnlSum)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: barW,
                        background: good ? '#4E9E7A' : '#BB5B5B',
                        borderRadius: 2,
                        transition: 'width 0.4s',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Section 4: Performance by Symbol ─── */}
      {symStats.length > 1 && (
        <>
          <div className="sec-title">أداء حسب الأداة</div>
          <div className="card-dark p-3 space-y-2">
            {symStats.map((s) => {
              const good = s.winRate >= 50
              const barW = `${Math.min(s.winRate, 100)}%`
              return (
                <div key={s.sym}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#C29B4A', flex: 1 }}>{s.sym}</span>
                    <span style={{ fontSize: 10, color: '#8899BB' }}>{s.total} صفقة</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: good ? '#4E9E7A' : '#BB5B5B' }}>
                      {s.winRate.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.pnlSum >= 0 ? '#4E9E7A' : '#BB5B5B' }}>
                      {fmt(s.pnlSum)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: barW,
                        background: good ? '#4E9E7A' : '#BB5B5B',
                        borderRadius: 2,
                        transition: 'width 0.4s',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ─── Section 5: Consecutive Losses ─── */}
      <div className="sec-title">تحليل الخسائر المتتالية</div>
      <div className="card-dark p-3">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              background: maxStreak >= 3 ? 'rgba(187,91,91,0.08)' : 'rgba(194,155,74,0.05)',
              border: `1px solid ${maxStreak >= 3 ? 'rgba(187,91,91,0.25)' : 'rgba(194,155,74,0.15)'}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, color: '#8899BB', letterSpacing: '0.06em', marginBottom: 2 }}>
              أعلى سلسلة خسائر متتالية
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: maxStreak >= 3 ? '#BB5B5B' : '#C29B4A', lineHeight: 1 }}>
              {maxStreak}
            </p>
            <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>صفقات</p>
          </div>

          <div
            style={{
              flex: 1,
              background: 'rgba(194,155,74,0.05)',
              border: '1px solid rgba(194,155,74,0.15)',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, color: '#8899BB', letterSpacing: '0.06em', marginBottom: 2 }}>
              مرات التسلسل (2+)
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#C29B4A', lineHeight: 1 }}>{timesTwo}</p>
            <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>مرة</p>
          </div>
        </div>

        {revengeWarning && (
          <div
            style={{
              marginTop: 10,
              background: 'rgba(187,91,91,0.1)',
              border: '1px solid rgba(187,91,91,0.35)',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#BB5B5B' }}>تحذير: تداول الانتقام</p>
              <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>
                سُجِّل {timesThreePlus} مرة تسلسل خسائر بـ 3 أو أكثر — راجع إدارة المخاطر
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
