'use client'

/**
 * Net P&L per trading day. Days follow the Israel calendar the students trade in,
 * and figures use the journal's P&L unit instead of a hardcoded "$".
 */
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dailyTotals } from '@/lib/dashboard-metrics'
import { DEFAULT_PNL_UNIT, formatPnl, unitLabel, type PnlUnit } from '@/lib/pnl-format'

interface DailyPnlChartProps {
  trades: Array<{ entryTime: string; pnl: number | null }>
  unit?: PnlUnit
  /** How many of the most recent trading days to show. */
  days?: number
}

interface Row {
  key: string
  label: string
  pnl: number
  count: number
}

const dayLabel = (key: string) => {
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

export function DailyPnlChart({ trades, unit = DEFAULT_PNL_UNIT, days = 30 }: DailyPnlChartProps) {
  const totals = dailyTotals(trades.map((t) => ({ entryTime: new Date(t.entryTime), pnl: t.pnl })))
  const data: Row[] = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([key, v]) => ({ key, label: dayLabel(key), pnl: Math.round(v.pnl * 100) / 100, count: v.count }))

  if (data.length === 0) {
    return (
      <div className="flex h-[210px] items-center justify-center text-[12px] text-[#6B7890]">
        لا توجد صفقات مغلقة في هذه الفترة
      </div>
    )
  }

  const word = unit === 'points' ? ` ${unitLabel(unit)}` : ''

  const Tip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) => {
    const row = active && payload?.length ? payload[0].payload : null
    if (!row) return null
    return (
      <div className="rounded-lg px-3 py-2 text-[11.5px]" dir="rtl" style={{ background: '#0E131C', border: '1px solid rgba(194,155,74,0.22)' }}>
        <div className="num text-[#8899BB]" dir="ltr">{row.key}</div>
        <div className="mt-0.5 font-semibold" style={{ color: row.pnl >= 0 ? '#6FBF98' : '#D07A7A' }}>
          <span className="num" dir="ltr">{formatPnl(row.pnl, unit)}</span>{word}
        </div>
        <div className="mt-0.5 text-[#6B7890]">
          <span className="num" dir="ltr">{row.count}</span> صفقة
        </div>
      </div>
    )
  }

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.045)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(200,216,238,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis
            orientation="right"
            width={44}
            tick={{ fill: 'rgba(200,216,238,0.45)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatPnl(v, unit, { compact: true })}
          />
          <Tooltip cursor={{ fill: 'rgba(194,155,74,0.06)' }} content={<Tip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />
          <Bar dataKey="pnl" maxBarSize={22} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.pnl >= 0 ? '#4E9E7A' : '#BB5B5B'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
