'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

interface EquityPoint {
  date: string
  equity: number
  pnl: number
}

interface EquityCurveProps {
  trades: Array<{
    exitTime: string | null
    pnl: string | number | null
    symbol: string
  }>
}

export function EquityCurve({ trades }: EquityCurveProps) {
  let cumulative = 0
  const data: EquityPoint[] = trades
    .filter((t) => t.exitTime && t.pnl !== null)
    .sort(
      (a, b) =>
        new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime()
    )
    .map((t) => {
      const pnl = Number(t.pnl)
      cumulative += pnl
      return {
        date: format(new Date(t.exitTime!), 'dd/MM'),
        equity: Math.round(cumulative * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
      }
    })

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[#F5F5DC]/40 text-sm">
        لا توجد صفقات مغلقة بعد
      </div>
    )
  }

  const isPositive = data[data.length - 1]?.equity >= 0

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1D3461" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#F5F5DC50', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#F5F5DC50', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          orientation="right"
        />
        <Tooltip
          contentStyle={{
            background: '#112240',
            border: '1px solid #1D3461',
            borderRadius: '8px',
            color: '#F5F5DC',
          }}
          formatter={(value) => [
            `$${Number(value).toLocaleString()}`,
            'رأس المال',
          ]}
        />
        <ReferenceLine y={0} stroke="#F5F5DC20" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="equity"
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: isPositive ? '#22c55e' : '#ef4444' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
