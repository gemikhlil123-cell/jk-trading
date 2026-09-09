import Link from 'next/link'
import { METRIC_LABELS, PERIOD_LABELS } from '@/lib/goals'

interface WidgetGoal {
  id: string
  metric: string
  period: string
  target: number
  current: number
  pct: number
  achieved: boolean
  unit: string
}

export function GoalsWidget({ goals, locale }: { goals: WidgetGoal[]; locale: string }) {
  return (
    <div className="card-vibrant anim-fade-up" style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#C29B4A' }}>🎯 أهدافي</span>
        <Link href={`/${locale}/goals`} style={{ fontSize: 11, color: '#8899BB', textDecoration: 'none' }}>
          إدارة ←
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goals.map((g) => (
          <div key={g.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: '#C8D8EE', fontWeight: 600 }}>
                {METRIC_LABELS[g.metric] || g.metric} <span style={{ color: '#4A5A7A' }}>· {PERIOD_LABELS[g.period]}</span>
              </span>
              <span className="ltr-num" style={{ color: g.achieved ? '#C29B4A' : '#4E9E7A', fontWeight: 700 }}>
                {g.current.toFixed(g.metric === 'TRADE_COUNT' ? 0 : 1)}{g.unit} / {Number(g.target).toLocaleString()}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${g.pct}%`,
                  background: g.achieved
                    ? 'linear-gradient(90deg, #C29B4A, #E4CE9B)'
                    : 'linear-gradient(90deg, #8A6A1F, #C29B4A)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
