'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface PerformanceRadarProps {
  winRate: number
  profitFactor: number
  avgRR: number
  maxDrawdown: number
  consistency: number
  recovery: number
  score: number
}

export function PerformanceRadar({
  winRate,
  profitFactor,
  avgRR,
  maxDrawdown,
  consistency,
  recovery,
  score,
}: PerformanceRadarProps) {
  // Normalize each metric to 0-100 scale
  const pfScore = Math.min((profitFactor / 3) * 100, 100)
  const rrScore = Math.min((avgRR / 3) * 100, 100)
  // maxDrawdown: lower is better. Score inversely: if drawdown < 500 → high score
  const ddScore = maxDrawdown <= 0 ? 100 : Math.max(0, Math.min(100, 100 - (maxDrawdown / 2000) * 100))
  const recScore = Math.min((recovery / 5) * 100, 100)

  const data = [
    { subject: 'نسبة الفوز', value: Math.round(winRate), fullMark: 100 },
    { subject: 'عامل الربح', value: Math.round(pfScore), fullMark: 100 },
    { subject: 'W/L نسبة', value: Math.round(rrScore), fullMark: 100 },
    { subject: 'الانسحاب', value: Math.round(ddScore), fullMark: 100 },
    { subject: 'الثبات', value: Math.round(consistency), fullMark: 100 },
    { subject: 'التعافي', value: Math.round(recScore), fullMark: 100 },
  ]

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { subject: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
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
          <div style={{ color: '#D4AF37', fontWeight: 700, marginBottom: 2 }}>{item.subject}</div>
          <div>{item.value}/100</div>
        </div>
      )
    }
    return null
  }

  const scoreColor = score >= 70 ? '#1DB954' : score >= 40 ? '#D4AF37' : '#E74C3C'

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid
            stroke="rgba(212,175,55,0.15)"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(200,216,238,0.6)', fontSize: 10, fontFamily: 'Cairo, sans-serif' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="الأداء"
            dataKey="value"
            stroke="#C9A84C"
            fill="#C9A84C"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score in center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: scoreColor,
            lineHeight: 1,
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(200,216,238,0.5)', marginTop: 2 }}>نقطة</div>
      </div>
    </div>
  )
}
