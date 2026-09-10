'use client'

/**
 * P&L calendar in TradeZella's shape: each day shaded by the size of its result,
 * a weekly total closing every row. Days follow the Israel calendar.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dailyTotals } from '@/lib/dashboard-metrics'
import { dateKey, monthGrid, weekTotals } from '@/lib/calendar-grid'
import { DEFAULT_PNL_UNIT, formatPnl, unitLabel, type PnlUnit } from '@/lib/pnl-format'
import { jerusalemDateKey } from '@/lib/timezone'

interface TradingCalendarProps {
  trades: Array<{ entryTime: string; pnl: number | null }>
  unit?: PnlUnit
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const hueOf = (pnl: number) => (pnl > 0 ? '78,158,122' : pnl < 0 ? '187,91,91' : '136,153,187')
const inkOf = (pnl: number) => (pnl > 0 ? '#6FBF98' : pnl < 0 ? '#D07A7A' : '#8899BB')

export function TradingCalendar({ trades, unit = DEFAULT_PNL_UNIT }: TradingCalendarProps) {
  const todayKey = jerusalemDateKey(new Date())
  const [todayYear, todayMonth] = todayKey.split('-').map(Number)
  const [view, setView] = useState({ year: todayYear, month: todayMonth - 1 })

  const totals = useMemo(
    () => dailyTotals(trades.map((t) => ({ entryTime: new Date(t.entryTime), pnl: t.pnl }))),
    [trades],
  )

  const weeks = monthGrid(view.year, view.month)
  const perWeek = weekTotals(weeks, totals, view.year, view.month)

  let monthPnl = 0
  let monthDays = 0
  let monthWins = 0
  let maxAbs = 0
  for (const week of weeks) {
    for (const day of week) {
      if (day == null) continue
      const v = totals.get(dateKey(view.year, view.month, day))
      if (!v) continue
      monthPnl += v.pnl
      monthDays += 1
      if (v.pnl > 0) monthWins += 1
      maxAbs = Math.max(maxAbs, Math.abs(v.pnl))
    }
  }

  const shift = (delta: number) =>
    setView((v) => {
      const m = v.month + delta
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
    })
  const isCurrent = view.year === todayYear && view.month === todayMonth - 1
  const word = unit === 'points' ? ` ${unitLabel(unit)}` : ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* In RTL the earlier month sits on the right, so its arrow points right. */}
          <button type="button" onClick={() => shift(-1)} aria-label="الشهر السابق" className="cal-nav">
            <ChevronRight size={16} />
          </button>
          <p className="min-w-[120px] text-center text-[14px] font-bold text-[#EDEBE4]">
            {MONTHS[view.month]} <span className="num" dir="ltr">{view.year}</span>
          </p>
          <button type="button" onClick={() => shift(1)} aria-label="الشهر التالي" className="cal-nav">
            <ChevronLeft size={16} />
          </button>
          {!isCurrent && (
            <button type="button" onClick={() => setView({ year: todayYear, month: todayMonth - 1 })} className="cal-link">
              الشهر الحالي
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#8899BB]">
          <span>
            الشهر:{' '}
            <span style={{ color: inkOf(monthPnl) }}>
              <span className="num font-semibold" dir="ltr">{formatPnl(monthPnl, unit)}</span>{word}
            </span>
          </span>
          <span>
            أيام رابحة: <span className="num text-[#DEDAD0]" dir="ltr">{monthWins}/{monthDays}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="mb-1.5 grid grid-cols-8 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10.5px] font-semibold text-[#6B7890]">{d}</div>
            ))}
            <div className="text-center text-[10.5px] font-semibold text-[#6B7890]">الأسبوع</div>
          </div>
          <div className="flex flex-col gap-1.5">
            {weeks.map((week, wi) => {
              const w = perWeek[wi]
              return (
                <div key={wi} className="grid grid-cols-8 gap-1.5">
                  {week.map((day, di) => {
                    if (day == null) return <div key={`empty-${wi}-${di}`} className="min-h-[74px]" />
                    const key = dateKey(view.year, view.month, day)
                    const v = totals.get(key)
                    const isToday = key === todayKey
                    const strength = v && maxAbs > 0 ? Math.abs(v.pnl) / maxAbs : 0
                    const hue = v ? hueOf(v.pnl) : null
                    return (
                      <div
                        key={key}
                        className="flex min-h-[74px] flex-col rounded-[10px] p-1.5"
                        style={{
                          background: hue ? `rgba(${hue},${(0.08 + strength * 0.3).toFixed(3)})` : 'rgba(255,255,255,0.015)',
                          border: `1px solid ${
                            isToday
                              ? 'rgba(194,155,74,0.65)'
                              : hue
                                ? `rgba(${hue},${(0.16 + strength * 0.26).toFixed(3)})`
                                : 'rgba(255,255,255,0.04)'
                          }`,
                        }}
                        title={v ? `${key} · ${formatPnl(v.pnl, unit)}${word} · ${v.count} صفقة` : key}
                      >
                        <span
                          className="num text-[10.5px]"
                          dir="ltr"
                          style={{ color: isToday ? '#C29B4A' : 'rgba(200,216,238,0.45)', fontWeight: isToday ? 600 : 400, alignSelf: 'flex-start' }}
                        >
                          {day}
                        </span>
                        {v && (
                          <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
                            <span className="num text-[12.5px] font-semibold" dir="ltr" style={{ color: inkOf(v.pnl) }}>
                              {formatPnl(v.pnl, unit, { compact: true })}
                            </span>
                            <span className="text-[9.5px] text-[#7C879B]">
                              <span className="num" dir="ltr">{v.count}</span> {v.count === 1 ? 'صفقة' : 'صفقات'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div
                    className="flex min-h-[74px] flex-col items-center justify-center gap-0.5 rounded-[10px] p-1.5"
                    style={{ background: 'rgba(194,155,74,0.035)', border: '1px solid rgba(194,155,74,0.10)' }}
                  >
                    <span className="text-[9.5px] text-[#6B7890]">
                      أسبوع <span className="num" dir="ltr">{wi + 1}</span>
                    </span>
                    {w.days > 0 ? (
                      <>
                        <span className="num text-[12.5px] font-semibold" dir="ltr" style={{ color: inkOf(w.pnl) }}>
                          {formatPnl(w.pnl, unit, { compact: true })}
                        </span>
                        <span className="text-[9.5px] text-[#7C879B]">
                          <span className="num" dir="ltr">{w.days}</span> {w.days === 1 ? 'يوم' : 'أيام'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#4A5A7A]">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
