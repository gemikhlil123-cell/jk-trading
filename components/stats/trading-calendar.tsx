'use client'

import { useState } from 'react'

interface TradingCalendarProps {
  trades: Array<{ entryTime: string; pnl: number | null }>
}

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const DAY_NAMES_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function TradingCalendar({ trades }: TradingCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Build dayPnlMap for all trades
  const dayPnlMap: Record<string, number> = {}
  trades.forEach((t) => {
    if (t.pnl === null) return
    const day = t.entryTime.split('T')[0]
    dayPnlMap[day] = (dayPnlMap[day] ?? 0) + t.pnl
  })

  // Navigate months
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Calculate monthly stats
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthEntries = Object.entries(dayPnlMap).filter(([day]) => day.startsWith(monthPrefix))
  const monthTradingDays = monthEntries.length
  const monthWinDays = monthEntries.filter(([, pnl]) => pnl > 0).length
  const monthTotalPnl = monthEntries.reduce((sum, [, pnl]) => sum + pnl, 0)

  // Build calendar grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={nextMonth}
          style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 6,
            color: '#D4AF37',
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ‹
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#C8D8EE', fontWeight: 700, fontSize: 14 }}>
            {MONTH_NAMES_AR[viewMonth]} {viewYear}
          </div>
        </div>

        <button
          onClick={prevMonth}
          style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 6,
            color: '#D4AF37',
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_NAMES_AR.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'rgba(200,216,238,0.4)',
              fontWeight: 600,
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ height: 48 }} />
          }

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const pnl = dayPnlMap[dateStr]
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear()

          let bg = 'rgba(255,255,255,0.02)'
          let border = '1px solid rgba(255,255,255,0.05)'
          let textColor = 'rgba(200,216,238,0.3)'

          if (pnl !== undefined) {
            if (pnl > 0) {
              bg = 'rgba(29,185,84,0.12)'
              border = '1px solid rgba(29,185,84,0.25)'
              textColor = '#1DB954'
            } else {
              bg = 'rgba(231,76,60,0.12)'
              border = '1px solid rgba(231,76,60,0.25)'
              textColor = '#E74C3C'
            }
          }

          if (isToday) {
            border = '1px solid rgba(212,175,55,0.5)'
          }

          return (
            <div
              key={dateStr}
              style={{
                background: bg,
                border,
                borderRadius: 6,
                padding: '4px 3px',
                minHeight: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: pnl !== undefined ? 'default' : 'default',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: isToday ? '#D4AF37' : 'rgba(200,216,238,0.5)',
                  fontWeight: isToday ? 700 : 400,
                  alignSelf: 'flex-start',
                  paddingRight: 2,
                }}
              >
                {day}
              </span>
              {pnl !== undefined && (
                <span
                  style={{
                    fontSize: 9,
                    color: textColor,
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {pnl >= 0 ? '+' : ''}${Math.abs(pnl) >= 1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Monthly summary */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid rgba(212,175,55,0.08)',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#C8D8EE' }}>{monthTradingDays}</div>
          <div style={{ fontSize: 9, color: 'rgba(200,216,238,0.4)', marginTop: 1 }}>يوم تداول</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#1DB954' }}>{monthWinDays}</div>
          <div style={{ fontSize: 9, color: 'rgba(200,216,238,0.4)', marginTop: 1 }}>يوم رابح</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: monthTotalPnl >= 0 ? '#1DB954' : '#E74C3C',
            }}
          >
            {monthTotalPnl >= 0 ? '+' : ''}${monthTotalPnl.toFixed(0)}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(200,216,238,0.4)', marginTop: 1 }}>ر/خ الشهر</div>
        </div>
      </div>
    </div>
  )
}
