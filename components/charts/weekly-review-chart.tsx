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
import type { TagAnalysis } from '@/lib/analysis'

interface WeeklyReviewChartProps {
  title: string
  data: TagAnalysis[]
  type: 'keep' | 'remove'
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: TagAnalysis }> }) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload as TagAnalysis
  return (
    <div className="bg-[#112240] border border-[#1D3461] rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-[#F5F5DC] text-sm">{d.tag}</p>
      <p className="text-[#F5F5DC]/50">{d.category}</p>
      <div className="pt-1 space-y-0.5">
        <p className="text-green-400">فوز: {d.wins} ({(d.winRate * 100).toFixed(0)}%)</p>
        <p className="text-red-400">خسارة: {d.losses} ({(d.lossRate * 100).toFixed(0)}%)</p>
        <p className="text-[#F5F5DC]/60">مجموع: {d.appearances}</p>
      </div>
    </div>
  )
}

export function WeeklyReviewChart({ title, data, type }: WeeklyReviewChartProps) {
  const color = type === 'keep' ? '#22c55e' : '#ef4444'
  const threshold = type === 'keep' ? 0.7 : 0.6

  const chartData = data
    .map((t) => ({
      ...t,
      value: type === 'keep' ? t.winRate * 100 : t.lossRate * 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)

  if (chartData.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-[#F5F5DC]/30 text-sm">
        لا توجد بيانات كافية
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#F5F5DC]/70 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 60, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1D3461"
            vertical={false}
          />
          <XAxis
            dataKey="tag"
            tick={{ fill: '#F5F5DC60', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: '#F5F5DC50', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5DC08' }} />
          <ReferenceLine
            y={threshold * 100}
            stroke={color}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={color}
                fillOpacity={entry.value >= threshold * 100 ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
