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
        <span style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37' }}>🎯 أهدافي</span>
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
              <span className="ltr-num" style={{ color: g.achieved ? '#D4AF37' : '#1DB954', fontWeight: 700 }}>
                {g.current.toFixed(g.metric === 'TRADE_COUNT' ? 0 : 1)}{g.unit} / {Number(g.target).toLocaleString()}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${g.pct}%`,
                  background: g.achieved
                    ? 'linear-gradient(90deg, #D4AF37, #F5E6A3)'
                    : 'linear-gradient(90deg, #A07D1C, #D4AF37)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
