'use client'

/**
 * Cumulative P&L with the drawdown beneath it. Trades are placed by exit time and
 * fall back to entry time, so a trade saved without an exit time still counts.
 */
import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { equitySeries } from '@/lib/dashboard-metrics'
import { DEFAULT_PNL_UNIT, formatPnl, unitLabel, type PnlUnit } from '@/lib/pnl-format'

interface EquityCurveProps {
  trades: Array<{
    exitTime: string | null
    entryTime?: string
    pnl: string | number | null
    symbol?: string
  }>
  unit?: PnlUnit
  showDrawdown?: boolean
}

interface Row {
  i: number
  key: string
  equity: number
  drawdown: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const dayLabel = (key: string) => {
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

export function EquityCurve({ trades, unit = DEFAULT_PNL_UNIT, showDrawdown = true }: EquityCurveProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const series = equitySeries(
    trades.flatMap((t) => {
      const when = t.exitTime ?? t.entryTime
      const pnl = t.pnl == null ? NaN : Number(t.pnl)
      if (!when || !Number.isFinite(pnl)) return []
      return [{ entryTime: new Date(t.entryTime ?? when), exitTime: t.exitTime ? new Date(t.exitTime) : null, pnl }]
    }),
  )
  const data: Row[] = series.map((p, i) => ({ i, key: p.key, equity: round2(p.equity), drawdown: round2(p.drawdown) }))

  if (data.length < 2) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[12px] text-[#6B7890]">
        يظهر المنحنى بعد صفقتين مغلقتين على الأقل
      </div>
    )
  }

  const color = data[data.length - 1].equity >= 0 ? '#4E9E7A' : '#BB5B5B'
  const tick = { fill: 'rgba(200,216,238,0.45)', fontSize: 10 }
  const yFmt = (v: number) => formatPnl(v, unit, { compact: true })
  const xFmt = (i: number) => (data[i] ? dayLabel(data[i].key) : '')
  const word = unit === 'points' ? ` ${unitLabel(unit)}` : ''

  const Tip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) => {
    const row = active && payload?.length ? payload[0].payload : null
    if (!row) return null
    return (
      <div className="rounded-lg px-3 py-2 text-[11.5px]" dir="rtl" style={{ background: '#0E131C', border: '1px solid rgba(194,155,74,0.22)' }}>
        <div className="num text-[#8899BB]" dir="ltr">{row.key}</div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-[#8899BB]">الرصيد</span>
          <span style={{ color: row.equity >= 0 ? '#6FBF98' : '#D07A7A' }}>
            <span className="num font-semibold" dir="ltr">{formatPnl(row.equity, unit)}</span>{word}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-4">
          <span className="text-[#8899BB]">التراجع</span>
          <span style={{ color: row.drawdown < 0 ? '#D07A7A' : '#8899BB' }}>
            <span className="num" dir="ltr">{formatPnl(row.drawdown, unit)}</span>{word}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={showDrawdown ? 176 : 240}>
        <AreaChart data={data} syncId={`eq-${uid}`} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={`eqFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.045)" vertical={false} />
          <XAxis dataKey="i" hide={showDrawdown} tick={tick} tickFormatter={xFmt} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis orientation="right" width={48} tick={tick} tickFormatter={yFmt} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(194,155,74,0.35)', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={color}
            strokeWidth={2}
            fill={`url(#eqFill-${uid})`}
            dot={false}
            activeDot={{ r: 3.5, fill: color, stroke: '#0C1017', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {showDrawdown && (
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={data} syncId={`eq-${uid}`} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`ddFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BB5B5B" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#BB5B5B" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" tick={tick} tickFormatter={xFmt} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis orientation="right" width={48} tick={tick} tickFormatter={yFmt} axisLine={false} tickLine={false} domain={['dataMin', 0]} />
            <Tooltip content={() => null} cursor={{ stroke: 'rgba(194,155,74,0.35)', strokeWidth: 1 }} />
            <Area type="stepAfter" dataKey="drawdown" stroke="#BB5B5B" strokeWidth={1.25} fill={`url(#ddFill-${uid})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
