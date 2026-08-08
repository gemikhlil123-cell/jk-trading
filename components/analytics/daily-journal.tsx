'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface JournalRow {
  date: string
  disciplineRating: number | null
  mood: string | null
  followedPlan: boolean | null
  overtraded: boolean | null
  reflection: string | null
}

const MOODS = ['هادئ', 'واثق', 'متردد', 'منفعل', 'محبط', 'صبور']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DailyJournal({ initialJournals }: { initialJournals: JournalRow[] }) {
  const today = todayStr()
  const existing = initialJournals.find((j) => j.date.split('T')[0] === today)

  const [journals, setJournals] = useState<JournalRow[]>(initialJournals)
  const [rating, setRating] = useState<number>(existing?.disciplineRating ?? 0)
  const [mood, setMood] = useState<string>(existing?.mood ?? '')
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(existing?.followedPlan ?? null)
  const [overtraded, setOvertraded] = useState<boolean | null>(existing?.overtraded ?? null)
  const [reflection, setReflection] = useState<string>(existing?.reflection ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          disciplineRating: rating || null,
          mood: mood || null,
          followedPlan,
          overtraded,
          reflection,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      setJournals((prev) => {
        const others = prev.filter((j) => j.date.split('T')[0] !== today)
        return [{ ...data.journal, date: data.journal.date }, ...others]
      })
      setMsg('تم حفظ سجل اليوم ✦')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setSaving(false)
    }
  }

  // Discipline trend (chronological, last 30 with rating)
  const trend = [...journals]
    .filter((j) => j.disciplineRating != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((j) => {
      const d = new Date(j.date)
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, rating: j.disciplineRating }
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
      {/* Today's journal */}
      <div className="card-vibrant" style={{ padding: 16 }}>
        <div className="sec-title" style={{ marginTop: 0 }}>سجل اليوم النفسي</div>

        {msg && (
          <div style={{ fontSize: 12, color: msg.includes('تم') ? '#1DB954' : '#E74C3C', marginBottom: 10, fontWeight: 700 }}>{msg}</div>
        )}

        {/* Discipline rating */}
        <label style={lbl}>تقييم الانضباط اليوم</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{
                flex: 1, height: 40, borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: 'pointer',
                background: rating >= n ? 'rgba(212,175,55,0.18)' : '#0E1828',
                border: `1px solid ${rating >= n ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`,
                color: rating >= n ? '#D4AF37' : '#4A5A7A',
                transition: 'all 0.15s',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Mood */}
        <label style={lbl}>حالتي الذهنية</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {MOODS.map((m) => (
            <button key={m} onClick={() => setMood(m === mood ? '' : m)} className={`pill-toggle ${mood === m ? 'active' : ''}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Yes/No flags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <YesNo label="التزمت بخطتي؟" value={followedPlan} onChange={setFollowedPlan} goodWhenTrue />
          <YesNo label="بالغت في التداول؟" value={overtraded} onChange={setOvertraded} goodWhenTrue={false} />
        </div>

        {/* Reflection */}
        <label style={lbl}>تأمل اليوم</label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          placeholder="ما الذي فعلته بشكل صحيح؟ ما الذي سأحسّنه غداً؟"
          className="form-input-dark"
          style={{ resize: 'vertical', marginBottom: 12 }}
        />

        <button onClick={save} disabled={saving} className="gold-btn" style={{ height: 44, borderRadius: 12, width: '100%' }}>
          {saving ? 'يحفظ...' : 'حفظ سجل اليوم'}
        </button>
      </div>

      {/* Discipline trend */}
      {trend.length > 1 && (
        <div className="card-vibrant" style={{ padding: 16 }}>
          <div className="sec-title" style={{ marginTop: 0 }}>تطوّر الانضباط</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(200,216,238,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'rgba(200,216,238,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} orientation="right" />
              <Tooltip
                contentStyle={{ background: '#0D1827', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8899BB' }}
              />
              <ReferenceLine y={3} stroke="rgba(212,175,55,0.2)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="rating" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 3, fill: '#D4AF37' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#8899BB', fontWeight: 700, marginBottom: 7 }

function YesNo({ label, value, onChange, goodWhenTrue }: { label: string; value: boolean | null; onChange: (v: boolean) => void; goodWhenTrue: boolean }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[true, false].map((v) => {
          const selected = value === v
          const good = v === goodWhenTrue
          return (
            <button
              key={String(v)}
              onClick={() => onChange(v)}
              style={{
                flex: 1, height: 36, borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: selected ? (good ? 'rgba(29,185,84,0.16)' : 'rgba(231,76,60,0.16)') : '#0E1828',
                border: `1px solid ${selected ? (good ? '#1DB954' : '#E74C3C') : 'rgba(212,175,55,0.12)'}`,
                color: selected ? (good ? '#1DB954' : '#E74C3C') : '#8899BB',
              }}
            >
              {v ? 'نعم' : 'لا'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
