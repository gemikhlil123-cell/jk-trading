'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

interface DailyPnlChartProps {
  trades: Array<{ entryTime: string; pnl: number | null }>
}

interface DayData {
  date: string
  pnl: number
  label: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function DailyPnlChart({ trades }: DailyPnlChartProps) {
  // Group by day
  const dayMap: Record<string, number> = {}
  trades.forEach((t) => {
    if (t.pnl === null) return
    const day = t.entryTime.split('T')[0]
    dayMap[day] = (dayMap[day] ?? 0) + t.pnl
  })

  const data: DayData[] = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({
      date,
      pnl: Math.round(pnl * 100) / 100,
      label: formatDate(date),
    }))
    .slice(-30) // last 30 days max

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(200,216,238,0.3)',
          fontSize: 13,
        }}
      >
        لا توجد بيانات
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      return (
        <div
          style={{
            background: '#0D1827',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#C8D8EE',
          }}
        >
          <div style={{ color: '#8899BB', marginBottom: 2 }}>{label}</div>
          <div style={{ color: val >= 0 ? '#1DB954' : '#E74C3C', fontWeight: 700 }}>
            {val >= 0 ? '+' : ''}${val.toFixed(2)}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(200,216,238,0.4)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(200,216,238,0.4)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          orientation="right"
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.pnl >= 0 ? 'rgba(29,185,84,0.8)' : 'rgba(231,76,60,0.8)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
