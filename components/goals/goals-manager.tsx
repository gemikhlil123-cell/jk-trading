'use client'

import { useState } from 'react'
import { METRIC_LABELS, PERIOD_LABELS } from '@/lib/goals'

interface GoalRow {
  id: string
  metric: string
  period: string
  target: string
  progress: { current: number; pct: number; achieved: boolean; unit: string }
}

export function GoalsManager({ initialGoals }: { initialGoals: GoalRow[] }) {
  const [goals, setGoals] = useState<GoalRow[]>(initialGoals)
  const [metric, setMetric] = useState('PNL')
  const [period, setPeriod] = useState('MONTHLY')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function addGoal() {
    if (!target || Number.isNaN(Number(target))) { setMsg('أدخل قيمة هدف صحيحة'); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric, period, target: Number(target) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      setGoals((g) => [
        { ...data.goal, progress: { current: 0, pct: 0, achieved: false, unit: '' } },
        ...g,
      ])
      setTarget('')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  async function removeGoal(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id))
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Add goal */}
      <div className="card-vibrant" style={{ padding: 16 }}>
        <div className="sec-title" style={{ marginTop: 0 }}>هدف جديد</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lblStyle}>المقياس</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="form-input-dark">
              {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>الفترة</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="form-input-dark">
              {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number" inputMode="decimal" value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="القيمة المستهدفة"
            className="form-input-dark ltr-num" style={{ flex: 1 }}
          />
          <button onClick={addGoal} disabled={busy} className="gold-btn" style={{ padding: '0 18px', borderRadius: 12 }}>
            {busy ? '...' : 'إضافة'}
          </button>
        </div>
        {msg && <p style={{ color: '#E74C3C', fontSize: 11, marginTop: 8 }}>{msg}</p>}
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <p style={{ fontSize: 13, color: '#4A5A7A', textAlign: 'center', padding: 20 }}>
          لا توجد أهداف بعد. أضف هدفك الأول لتتبّع تقدمك.
        </p>
      ) : (
        goals.map((g) => (
          <div key={g.id} className="card-vibrant card-hover-lift" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#C8D8EE' }}>
                  {METRIC_LABELS[g.metric] || g.metric}
                </div>
                <div style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>
                  {PERIOD_LABELS[g.period]} • الهدف: <span className="ltr-num">{Number(g.target).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => removeGoal(g.id)} style={{ color: '#4A5A7A', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${g.progress.pct}%`,
                  background: g.progress.achieved
                    ? 'linear-gradient(90deg, #D4AF37, #F5E6A3)'
                    : 'linear-gradient(90deg, #A07D1C, #D4AF37)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11 }}>
              <span style={{ color: '#8899BB' }}>
                المحقق: <b style={{ color: g.progress.achieved ? '#D4AF37' : '#1DB954' }} className="ltr-num">
                  {g.progress.current.toFixed(g.metric === 'TRADE_COUNT' ? 0 : 1)}{g.progress.unit}
                </b>
              </span>
              <span style={{ color: g.progress.achieved ? '#D4AF37' : '#4A5A7A', fontWeight: 700 }}>
                {g.progress.achieved ? '🏆 تحقق!' : `${g.progress.pct.toFixed(0)}%`}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const lblStyle: React.CSSProperties = { display: 'block', fontSize: 10, color: '#8899BB', fontWeight: 700, marginBottom: 5 }
