'use client'

import { useState } from 'react'

interface Rule { text: string; active: boolean }

interface PlanData {
  allowedSessions: string[]
  allowedSymbols: string[]
  maxTradesPerDay: string
  maxDailyLossUsd: string
  maxRiskPerTradeUsd: string
  minRR: string
  rules: Rule[]
  notes: string
}

const SESSIONS: { key: string; label: string }[] = [
  { key: 'ASIA', label: 'آسيا' },
  { key: 'LONDON', label: 'لندن' },
  { key: 'NY_AM', label: 'نيويورك صباحاً' },
  { key: 'NY_PM', label: 'نيويورك مساءً' },
]

const SYMBOLS = ['NQ', 'ES', 'GC', 'CL', 'BTC', 'XAU', 'EURUSD']

export function PlanEditor({ initialPlan }: { initialPlan: Record<string, unknown> | null }) {
  const parseArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[]
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return []
  }
  const parseRules = (v: unknown): Rule[] => {
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return Array.isArray(v) ? (v as Rule[]) : []
  }
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

  const [data, setData] = useState<PlanData>({
    allowedSessions: parseArr(initialPlan?.allowedSessions),
    allowedSymbols: parseArr(initialPlan?.allowedSymbols),
    maxTradesPerDay: str(initialPlan?.maxTradesPerDay),
    maxDailyLossUsd: str(initialPlan?.maxDailyLossUsd),
    maxRiskPerTradeUsd: str(initialPlan?.maxRiskPerTradeUsd),
    minRR: str(initialPlan?.minRR),
    rules: parseRules(initialPlan?.rules),
    notes: str(initialPlan?.notes),
  })
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; s: string } | null>(null)

  function toggle(field: 'allowedSessions' | 'allowedSymbols', val: string) {
    setData((d) => {
      const arr = d[field]
      return { ...d, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] }
    })
  }

  function addRule() {
    const t = newRule.trim()
    if (!t) return
    setData((d) => ({ ...d, rules: [...d.rules, { text: t, active: true }] }))
    setNewRule('')
  }

  function toggleRule(i: number) {
    setData((d) => ({ ...d, rules: d.rules.map((r, idx) => (idx === i ? { ...r, active: !r.active } : r)) }))
  }
  function removeRule(i: number) {
    setData((d) => ({ ...d, rules: d.rules.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('فشل الحفظ')
      setMsg({ t: 'ok', s: 'تم حفظ خطتك ✦' })
    } catch (e) {
      setMsg({ t: 'err', s: e instanceof Error ? e.message : 'خطأ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {msg && (
        <div
          className="anim-fade-up"
          style={{
            padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: msg.t === 'ok' ? 'rgba(29,185,84,0.1)' : 'rgba(231,76,60,0.1)',
            border: `1px solid ${msg.t === 'ok' ? 'rgba(29,185,84,0.3)' : 'rgba(231,76,60,0.3)'}`,
            color: msg.t === 'ok' ? '#1DB954' : '#E74C3C',
          }}
        >
          {msg.s}
        </div>
      )}

      {/* Sessions */}
      <Section title="الجلسات المسموحة">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SESSIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle('allowedSessions', s.key)}
              className={`pill-toggle ${data.allowedSessions.includes(s.key) ? 'active' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Symbols */}
      <Section title="الأدوات المسموحة">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => toggle('allowedSymbols', s)}
              className={`pill-toggle ${data.allowedSymbols.includes(s) ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Limits */}
      <Section title="حدود المخاطرة">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <NumField label="أقصى عدد صفقات/يوم" value={data.maxTradesPerDay} onChange={(v) => setData((d) => ({ ...d, maxTradesPerDay: v }))} />
          <NumField label="أدنى RR" value={data.minRR} onChange={(v) => setData((d) => ({ ...d, minRR: v }))} />
          <NumField label="أقصى خسارة يومية ($)" value={data.maxDailyLossUsd} onChange={(v) => setData((d) => ({ ...d, maxDailyLossUsd: v }))} />
          <NumField label="أقصى مخاطرة/صفقة ($)" value={data.maxRiskPerTradeUsd} onChange={(v) => setData((d) => ({ ...d, maxRiskPerTradeUsd: v }))} />
        </div>
      </Section>

      {/* Rules */}
      <Section title="قوانيني">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule() } }}
            placeholder="مثال: لا أدخل قبل كسر CISD"
            className="form-input-dark"
            style={{ flex: 1 }}
          />
          <button onClick={addRule} className="gold-btn" style={{ padding: '0 16px', borderRadius: 12 }}>
            إضافة
          </button>
        </div>
        {data.rules.length === 0 ? (
          <p style={{ fontSize: 12, color: '#4A5A7A' }}>أضف قوانينك التي تلتزم بها قبل كل صفقة.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.rules.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: '#0E1828', border: '1px solid rgba(212,175,55,0.12)',
                  opacity: r.active ? 1 : 0.5,
                }}
              >
                <button
                  onClick={() => toggleRule(i)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    background: r.active ? 'rgba(29,185,84,0.18)' : 'transparent',
                    border: `1px solid ${r.active ? '#1DB954' : '#4A5A7A'}`,
                    color: '#1DB954', fontSize: 12, lineHeight: '18px',
                  }}
                >
                  {r.active ? '✓' : ''}
                </button>
                <span style={{ flex: 1, fontSize: 13, color: '#C8D8EE', textDecoration: r.active ? 'none' : 'line-through' }}>
                  {r.text}
                </span>
                <button onClick={() => removeRule(i)} style={{ color: '#E74C3C', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="ملاحظات">
        <textarea
          value={data.notes}
          onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
          rows={3}
          placeholder="هدفي اليومي، حالتي الذهنية المطلوبة، تذكيرات..."
          className="form-input-dark"
          style={{ resize: 'vertical' }}
        />
      </Section>

      <button onClick={save} disabled={saving} className="gold-btn" style={{ height: 46, borderRadius: 12, fontSize: 14 }}>
        {saving ? 'يحفظ...' : 'حفظ الخطة'}
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-vibrant" style={{ padding: 16 }}>
      <div className="sec-title" style={{ marginTop: 0 }}>{title}</div>
      {children}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, color: '#8899BB', fontWeight: 700, marginBottom: 5 }}>{label}</label>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="form-input-dark ltr-num" />
    </div>
  )
}
