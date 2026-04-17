'use client'

import { useState } from 'react'
import { DeepAnalysis, BreakdownRow, ReasonRow } from '@/lib/deep-analysis'

interface Props {
  live: DeepAnalysis
  backtest: DeepAnalysis
}

type Mode = 'LIVE' | 'BACKTEST'

const CAT_COLORS: Record<string, string> = {
  SMT: 'rgba(100,150,255,0.85)',
  PSP: 'rgba(170,100,255,0.85)',
  'Price Action': 'rgba(255,200,80,0.85)',
  'FVG/IFVG': 'rgba(255,130,60,0.85)',
  CISD: 'rgba(80,220,220,0.85)',
}

function StatusPill({ status }: { status: BreakdownRow['status'] }) {
  const map = {
    STRONG: { bg: 'rgba(29,185,84,0.18)', fg: '#1DB954', label: 'قوي' },
    WEAK: { bg: 'rgba(231,76,60,0.18)', fg: '#E74C3C', label: 'ضعيف' },
    NEUTRAL: { bg: 'rgba(201,168,76,0.14)', fg: '#C9A84C', label: 'محايد' },
    INSUFFICIENT: { bg: 'rgba(74,90,122,0.18)', fg: '#8899BB', label: 'بيانات قليلة' },
  }
  const s = map[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        background: s.bg,
        color: s.fg,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  )
}

function BreakdownTable({
  title,
  rows,
  emptyMsg,
}: {
  title: string
  rows: BreakdownRow[]
  emptyMsg: string
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '16px 14px' }}>
        <h3 className="sec-title">{title}</h3>
        <p style={{ color: '#4A5A7A', fontSize: 12 }}>{emptyMsg}</p>
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 14px 14px' }}>
      <h3 className="sec-title">{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => {
          const pnlPositive = r.totalPnl >= 0
          return (
            <div
              key={r.key}
              className="card-dark"
              style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#C8D8EE', fontWeight: 600 }}>
                    {r.label}
                  </span>
                  <StatusPill status={r.status} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: 10,
                    color: '#4A5A7A',
                    marginTop: 4,
                  }}
                >
                  <span>{r.trades} صفقة</span>
                  <span style={{ color: '#1DB954' }}>ربح: {r.wins}</span>
                  <span style={{ color: '#E74C3C' }}>خسارة: {r.losses}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#C9A84C' }}>
                  {(r.winRate * 100).toFixed(0)}%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: pnlPositive ? '#1DB954' : '#E74C3C',
                  }}
                >
                  {pnlPositive ? '+' : ''}
                  {r.totalPnl.toFixed(0)} نقطة
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReasonsTable({
  title,
  rows,
  emptyMsg,
  positive,
}: {
  title: string
  rows: ReasonRow[]
  emptyMsg: string
  positive: boolean
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '16px 14px' }}>
        <h3 className="sec-title">{title}</h3>
        <p style={{ color: '#4A5A7A', fontSize: 12 }}>{emptyMsg}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '6px 14px 14px' }}>
      <h3 className="sec-title">{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => {
          const barPct = positive ? r.winRate * 100 : (1 - r.winRate) * 100
          const barColor = positive ? '#1DB954' : '#E74C3C'
          return (
            <div
              key={r.key}
              className="card-dark"
              style={{ padding: '10px 12px' }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: CAT_COLORS[r.category] ?? '#C9A84C',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#C8D8EE', fontWeight: 600 }}>
                    {r.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: barColor }}>
                  {barPct.toFixed(0)}%
                </div>
              </div>
              <div
                style={{
                  height: 4,
                  background: '#0D1520',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  fontSize: 10,
                  color: '#4A5A7A',
                  marginTop: 6,
                }}
              >
                <span>{r.trades} ظهور</span>
                <span style={{ color: '#1DB954' }}>ربح: {r.wins}</span>
                <span style={{ color: '#E74C3C' }}>خسارة: {r.losses}</span>
                <span>
                  إجمالي:{' '}
                  <span style={{ color: r.totalPnl >= 0 ? '#1DB954' : '#E74C3C', fontWeight: 700 }}>
                    {r.totalPnl >= 0 ? '+' : ''}
                    {r.totalPnl.toFixed(0)}
                  </span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DeepAnalyticsView({ live, backtest }: Props) {
  const [mode, setMode] = useState<Mode>('LIVE')
  const data = mode === 'LIVE' ? live : backtest

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode('LIVE')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background: mode === 'LIVE' ? 'rgba(212,175,55,0.18)' : '#162035',
              border:
                mode === 'LIVE'
                  ? '1px solid rgba(212,175,55,0.5)'
                  : '1px solid rgba(212,175,55,0.14)',
              color: mode === 'LIVE' ? '#D4AF37' : '#8899BB',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            صفقات حقيقية ({live.totalTrades})
          </button>
          <button
            onClick={() => setMode('BACKTEST')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background:
                mode === 'BACKTEST' ? 'rgba(212,175,55,0.18)' : '#162035',
              border:
                mode === 'BACKTEST'
                  ? '1px solid rgba(212,175,55,0.5)'
                  : '1px solid rgba(212,175,55,0.14)',
              color: mode === 'BACKTEST' ? '#D4AF37' : '#8899BB',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            باك تست ({backtest.totalTrades})
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ padding: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>الصفقات</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#C8D8EE' }}>
              {data.totalTrades}
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>نسبة النجاح</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: data.winRate >= 0.5 ? '#1DB954' : '#E74C3C',
              }}
            >
              {(data.winRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>إجمالي النقاط</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: data.totalPnl >= 0 ? '#1DB954' : '#E74C3C',
              }}
            >
              {data.totalPnl >= 0 ? '+' : ''}
              {data.totalPnl.toFixed(0)}
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>Profit Factor</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: data.profitFactor >= 1.5 ? '#1DB954' : data.profitFactor >= 1 ? '#C9A84C' : '#E74C3C',
              }}
            >
              {data.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>متوسط الربح</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1DB954' }}>
              +{data.avgWin.toFixed(0)}
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: 10, color: '#4A5A7A' }}>متوسط الخسارة</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#E74C3C' }}>
              -{data.avgLoss.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {data.totalTrades === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#8899BB', fontSize: 14 }}>
            لا توجد {mode === 'LIVE' ? 'صفقات حقيقية' : 'صفقات باك تست'} بعد.
          </p>
          <p style={{ color: '#4A5A7A', fontSize: 12, marginTop: 8 }}>
            ابدأ بتسجيل صفقاتك للحصول على التحليل الكامل.
          </p>
        </div>
      ) : (
        <>
          <ReasonsTable
            title="أسباب الدخول الأكثر نجاحاً"
            rows={data.winningReasons}
            positive={true}
            emptyMsg="لا توجد أسباب دخول متكررة برابحية عالية بعد. تحتاج 3 ظهورات على الأقل."
          />

          <ReasonsTable
            title="أسباب الدخول الأكثر فشلاً"
            rows={data.losingReasons}
            positive={false}
            emptyMsg="لا توجد أسباب خاسرة متكررة."
          />

          <BreakdownTable
            title="أداء الجلسات (Killzones)"
            rows={data.killzonePerf}
            emptyMsg="لا توجد بيانات."
          />

          <BreakdownTable
            title="أداء السايكلات (90د)"
            rows={data.cycleperf}
            emptyMsg="لا توجد بيانات."
          />

          <BreakdownTable
            title="أداء الرموز"
            rows={data.symbolPerf}
            emptyMsg="لا توجد بيانات."
          />

          <BreakdownTable
            title="أداء أيام الأسبوع"
            rows={data.dayOfWeekPerf}
            emptyMsg="لا توجد بيانات."
          />

          <BreakdownTable
            title="أداء الساعات (UTC)"
            rows={data.hourPerf}
            emptyMsg="لا توجد بيانات."
          />

          <BreakdownTable
            title="أداء الاتجاه"
            rows={data.directionPerf}
            emptyMsg="لا توجد بيانات."
          />

          {/* Streak */}
          <div style={{ padding: '6px 14px 14px' }}>
            <h3 className="sec-title">السلاسل</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              <div className="stat-card">
                <span style={{ fontSize: 10, color: '#4A5A7A' }}>الحالية</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color:
                      data.streak.currentStreakType === 'WIN'
                        ? '#1DB954'
                        : data.streak.currentStreakType === 'LOSS'
                        ? '#E74C3C'
                        : '#8899BB',
                  }}
                >
                  {data.streak.currentStreak}{' '}
                  {data.streak.currentStreakType === 'WIN'
                    ? '🔥'
                    : data.streak.currentStreakType === 'LOSS'
                    ? '💧'
                    : ''}
                </span>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: 10, color: '#4A5A7A' }}>أطول ربح</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#1DB954' }}>
                  {data.streak.longestWinStreak}
                </span>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: 10, color: '#4A5A7A' }}>أطول خسارة</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#E74C3C' }}>
                  {data.streak.longestLossStreak}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
