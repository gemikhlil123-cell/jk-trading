'use client'

import { useRef, useState, useEffect } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const STORAGE_KEY = 'jk_csv_result'

interface DayResult { date: string; pnl: number }

interface ParsedResult {
  days: DayResult[]
  totalPnl: number
  winDays: number
  lossDays: number
  bestDay: DayResult | null
  worstDay: DayResult | null
  winRate: number
  avgWin: number
  avgLoss: number
  avgWinLossRatio: number
  profitFactor: number
  maxDrawdown: number
  totalTradingDays: number
  fileName?: string
}

/* ─── CSV Parsing ──────────────────────────────────────────── */
function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { out.push(cur.trim().replace(/^"|"$/g, '')); cur = '' }
    else cur += ch
  }
  out.push(cur.trim().replace(/^"|"$/g, ''))
  return out
}

function toDate(cell: string): string {
  const s = cell.replace(/"/g, '').trim()
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const us = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`
  const mon = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/i)
  if (mon) {
    const m: Record<string,string> = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}
    return `${mon[3]}-${m[mon[2].toLowerCase()]??'01'}-${mon[1].padStart(2,'0')}`
  }
  return s.split(/[ T]/)[0]
}

function toNum(s: string) { return parseFloat(s.replace(/[$,\s]/g, '')) || 0 }

function buildResult(dayMap: Record<string, number>, fileName?: string): ParsedResult {
  const days = Object.entries(dayMap).map(([date, pnl]) => ({ date, pnl })).sort((a,b) => a.date.localeCompare(b.date))
  const totalPnl = days.reduce((s, d) => s + d.pnl, 0)
  const winArr   = days.filter(d => d.pnl > 0)
  const lossArr  = days.filter(d => d.pnl <= 0)
  const avgWin   = winArr.length  ? winArr.reduce((s,d)=>s+d.pnl,0)  / winArr.length  : 0
  const avgLoss  = lossArr.length ? lossArr.reduce((s,d)=>s+d.pnl,0) / lossArr.length : 0
  const grossW   = winArr.reduce((s,d)=>s+d.pnl,0)
  const grossL   = Math.abs(lossArr.reduce((s,d)=>s+d.pnl,0))
  const profitFactor     = grossL > 0 ? grossW / grossL : grossW > 0 ? 999 : 0
  const avgWinLossRatio  = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
  let peak = 0, maxDD = 0, run = 0
  days.forEach(d => { run += d.pnl; if (run > peak) peak = run; const dd = peak - run; if (dd > maxDD) maxDD = dd })
  const sorted = [...days].sort((a,b) => b.pnl - a.pnl)
  return {
    days, totalPnl, fileName,
    winDays: winArr.length, lossDays: lossArr.length,
    totalTradingDays: days.length,
    winRate: days.length ? (winArr.length / days.length) * 100 : 0,
    avgWin, avgLoss, avgWinLossRatio, profitFactor, maxDrawdown: maxDD,
    bestDay: sorted[0] ?? null,
    worstDay: sorted[sorted.length - 1] ?? null,
  }
}

function parseCsv(raw: string, fileName?: string): ParsedResult | null {
  const text = raw.replace(/^\uFEFF/, '')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const cols = parseLine(lines[0]).map(c => c.toLowerCase().replace(/\s+/g,''))
  const dateIdx = cols.findIndex(c => ['date','tradetime','timestamp','datetime','closedate','tradedate'].includes(c) || c.startsWith('date'))
  const pnlIdx  = cols.findIndex(c => ['realizedpnl','pnl','profit','netpnl','tradepnl','gainloss'].includes(c) || c.includes('pnl') || c.includes('realized') || c.includes('profit') || c.includes('gain'))
  const commIdx = cols.findIndex(c => c.includes('commission') || c.includes('fee') || c === 'comm')
  const dayMap: Record<string, number> = {}
  if (dateIdx >= 0 && pnlIdx >= 0) {
    for (let i = 1; i < lines.length; i++) {
      const p = parseLine(lines[i])
      const d = toDate(p[dateIdx] ?? '')
      if (!d || d.length < 8) continue
      const pnl  = toNum(p[pnlIdx] ?? '0')
      const comm = commIdx >= 0 ? Math.abs(toNum(p[commIdx] ?? '0')) : 0
      dayMap[d] = (dayMap[d] ?? 0) + pnl - comm
    }
  } else if (cols.length >= 2) {
    for (let i = 1; i < lines.length; i++) {
      const p = parseLine(lines[i])
      const d = toDate(p[0] ?? '')
      if (!d || d.length < 8) continue
      dayMap[d] = (dayMap[d] ?? 0) + toNum(p[1] ?? '0')
    }
  } else return null
  if (!Object.keys(dayMap).length) return null
  return buildResult(dayMap, fileName)
}

/* ─── Helpers ─────────────────────────────────────────────── */
function fmt(n: number, dec = 0) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return `${n >= 0 ? '+' : '-'}$${abs}`
}

/* ─── AI Analysis ─────────────────────────────────────────── */
function generateAnalysis(r: ParsedResult) {
  const weaknesses: string[] = []
  const stopDoing: string[] = []
  const improve: string[] = []

  // Win rate
  if (r.winRate < 40) {
    weaknesses.push(`نسبة فوزك منخفضة (${r.winRate.toFixed(0)}%) — أقل من نصف أيامك رابحة`)
    stopDoing.push('وقف التداول في أيام تبدأ فيها بخسارة مبكرة — لا تحاول "تعويض" الخسارة')
  } else if (r.winRate < 50) {
    weaknesses.push(`نسبة فوزك تحت 50% (${r.winRate.toFixed(0)}%) — تحتاج تحسين اختيار الأيام`)
  }

  // Profit factor
  if (r.profitFactor < 1) {
    weaknesses.push(`عامل الربح أقل من 1 (${r.profitFactor.toFixed(2)}) — خسائرك أكبر من أرباحك الكلية`)
    stopDoing.push('تجنب الإفراط في عدد الصفقات في أيام الخسارة — أغلق الجلسة بعد خسارتين متتاليتين')
  }

  // Avg Win/Loss ratio
  if (r.avgWinLossRatio < 1) {
    weaknesses.push(`متوسط خسارتك (${fmt(r.avgLoss)}) أكبر من متوسط ربحك (${fmt(r.avgWin)})`)
    stopDoing.push('لا تتحمل خسائر كبيرة وأنت تأمل في انعكاس السعر — احترم الـ Stop Loss دائماً')
    improve.push(`اضبط هدفك اليومي على ${fmt(Math.abs(r.avgLoss) * 1.5)} على الأقل قبل أن توقف التداول`)
  }

  // Max drawdown
  if (r.maxDrawdown > Math.abs(r.totalPnl) * 2 && r.maxDrawdown > 200) {
    weaknesses.push(`أقصى انسحاب لديك كبير ($${Math.round(r.maxDrawdown)}) — خطر على الحساب`)
    stopDoing.push('حدد حد خسارة يومي ثابت لا تتجاوزه أبداً — مثلاً أقصاه 2% من الحساب يومياً')
  }

  // Worst days analysis
  if (r.days.length >= 3) {
    const byDow: Record<number, number[]> = {}
    r.days.forEach(d => {
      const dow = new Date(d.date).getDay()
      if (!byDow[dow]) byDow[dow] = []
      byDow[dow].push(d.pnl)
    })
    const DAYS_EN = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
    let worstDow = -1, worstAvg = 0
    Object.entries(byDow).forEach(([dow, pnls]) => {
      if (pnls.length >= 2) {
        const avg = pnls.reduce((a,b)=>a+b,0) / pnls.length
        if (avg < worstAvg) { worstAvg = avg; worstDow = Number(dow) }
      }
    })
    if (worstDow >= 0) {
      weaknesses.push(`يوم ${DAYS_EN[worstDow]} هو أسوأ أيامك في المتوسط (${fmt(worstAvg)})`)
      stopDoing.push(`فكر في تقليل حجم الصفقات أو عدم التداول يوم ${DAYS_EN[worstDow]}`)
    }
  }

  // Streaks
  let maxLossStreak = 0, curStreak = 0
  r.days.forEach(d => { if (d.pnl <= 0) { curStreak++; maxLossStreak = Math.max(maxLossStreak, curStreak) } else curStreak = 0 })
  if (maxLossStreak >= 3) {
    weaknesses.push(`أطول سلسلة خسارة متتالية: ${maxLossStreak} أيام — هذا مؤشر على مشكلة نفسية أو استراتيجية`)
    stopDoing.push(`عند خسارة ${Math.min(maxLossStreak - 1, 3)} أيام متتالية، خذ استراحة إجبارية يوم واحد`)
  }

  // Positive points → improve
  if (r.winRate >= 50) improve.push(`نسبة فوزك جيدة (${r.winRate.toFixed(0)}%) — ركز على رفع متوسط الربح لا على زيادة عدد الصفقات`)
  if (r.avgWinLossRatio >= 1.5) improve.push(`نسبة ربح/خسارة ممتازة (${r.avgWinLossRatio.toFixed(2)}) — حافظ على هذا المستوى`)
  if (r.bestDay && r.bestDay.pnl > 0) improve.push(`أفضل يوم كان ${fmt(r.bestDay.pnl)} — حلل ما فعلته في هذا اليوم وكرره`)
  improve.push('سجّل كل صفقة في اليومية مع سبب الدخول — التحليل الأسبوعي يحسن أداءك بشكل مباشر')
  improve.push('ضع هدفاً يومياً واضحاً وعند تحقيقه أغلق الجلسة — الجشع يقتل الأرباح')

  // Defaults if nothing bad
  if (weaknesses.length === 0) weaknesses.push('أداؤك العام معقول — استمر في التسجيل لتحليل أعمق')
  if (stopDoing.length === 0) stopDoing.push('لا توجد مشاكل واضحة — راقب الاستمرارية')

  return { weaknesses, stopDoing, improve }
}

/* ─── Sub-components ──────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: '14px 12px' }}>
      <p style={{ fontSize: 10, color: '#4A5A7A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function DailyChart({ days }: { days: DayResult[] }) {
  const data = days.slice(-60).map(d => ({ date: d.date.slice(5), pnl: d.pnl }))
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, padding: '14px 12px' }}>
      <p style={{ fontSize: 11, color: '#D4AF37', fontWeight: 700, marginBottom: 10 }}>ربح وخسارة كل يوم</p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#4A5A7A' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 8, fill: '#4A5A7A' }} />
          <Tooltip formatter={(v: unknown) => [fmt(Number(v)||0), 'P&L']}
            contentStyle={{ background: '#0D1520', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 11 }} />
          <Bar dataKey="pnl" radius={[3,3,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#1DB954' : '#E74C3C'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_EN   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function MiniCalendar({ days }: { days: DayResult[] }) {
  const [offset, setOffset] = useState(0)
  const base  = new Date()
  const year  = new Date(base.getFullYear(), base.getMonth() + offset, 1).getFullYear()
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1).getMonth()
  const label = `${MONTHS_EN[month]} ${year}`

  const dayMap: Record<string, number> = {}
  days.forEach(d => { dayMap[d.date] = d.pnl })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthDays = days.filter(d => d.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
  const mPnl = monthDays.reduce((s,d)=>s+d.pnl,0)
  const mWin = monthDays.filter(d=>d.pnl>0).length

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, padding: '14px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => setOffset(o => o-1)} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: '#D4AF37', cursor: 'pointer', padding: '2px 10px', fontSize: 16 }}>‹</button>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37', margin: 0 }}>{label}</p>
        <button onClick={() => setOffset(o => o+1)} style={{ background: 'none', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: '#D4AF37', cursor: 'pointer', padding: '2px 10px', fontSize: 16 }}>›</button>
      </div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_EN.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#4A5A7A', fontWeight: 700, padding: '3px 0' }}>{d}</div>)}
      </div>
      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const pnl = dayMap[key]
          const isToday = key === new Date().toISOString().split('T')[0]
          return (
            <div key={i} style={{
              borderRadius: 6, padding: '4px 2px', textAlign: 'center', minHeight: 40,
              background: pnl === undefined ? 'rgba(255,255,255,0.02)' : pnl > 0 ? 'rgba(29,185,84,0.15)' : 'rgba(231,76,60,0.15)',
              border: isToday ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.04)',
            }}>
              <p style={{ fontSize: 9, color: '#8899BB', margin: 0 }}>{day}</p>
              {pnl !== undefined && (
                <p style={{ fontSize: 9, fontWeight: 800, color: pnl > 0 ? '#1DB954' : '#E74C3C', margin: '2px 0 0', lineHeight: 1 }}>
                  {pnl > 0 ? '+' : ''}{Math.round(pnl)}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {/* Monthly summary */}
      {monthDays.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
          {[
            { l: 'إجمالي الشهر', v: fmt(mPnl), c: mPnl>=0?'#1DB954':'#E74C3C' },
            { l: 'أيام رابحة', v: String(mWin), c: '#1DB954' },
            { l: 'أيام تداول', v: String(monthDays.length), c: '#C8D8EE' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 4px' }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: s.c, margin: 0 }}>{s.v}</p>
              <p style={{ fontSize: 9, color: '#4A5A7A', margin: '3px 0 0' }}>{s.l}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalysisSection({ result }: { result: ParsedResult }) {
  const { weaknesses, stopDoing, improve } = generateAnalysis(result)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Weaknesses */}
      <div style={{ background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#E74C3C', marginBottom: 10 }}>⚠️ نقاط الضعف</p>
        {weaknesses.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#E74C3C', fontSize: 12, flexShrink: 0, marginTop: 1 }}>•</span>
            <p style={{ fontSize: 12, color: '#C8D8EE', margin: 0, lineHeight: 1.6 }}>{w}</p>
          </div>
        ))}
      </div>

      {/* Stop doing */}
      <div style={{ background: 'rgba(231,76,60,0.04)', border: '1px solid rgba(231,76,60,0.15)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#E8A87C', marginBottom: 10 }}>🚫 توقف فوراً عن هذا</p>
        {stopDoing.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#E8A87C', fontSize: 12, flexShrink: 0, marginTop: 1 }}>✕</span>
            <p style={{ fontSize: 12, color: '#C8D8EE', margin: 0, lineHeight: 1.6 }}>{s}</p>
          </div>
        ))}
      </div>

      {/* Improve */}
      <div style={{ background: 'rgba(29,185,84,0.05)', border: '1px solid rgba(29,185,84,0.18)', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#1DB954', marginBottom: 10 }}>✦ ركز على هذا للتطور</p>
        {improve.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#1DB954', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
            <p style={{ fontSize: 12, color: '#C8D8EE', margin: 0, lineHeight: 1.6 }}>{s}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────── */
export function TradovateCSV() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [error, setError]   = useState<string | null>(null)

  // Load from localStorage on mount (persists across navigation)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setResult(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const saveResult = (r: ParsedResult) => {
    setResult(r)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)) } catch { /* ignore */ }
  }

  const clearResult = () => {
    setResult(null)
    setError(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const handleFile = (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const firstLine = text.replace(/^\uFEFF/, '').split('\n')[0]?.trim() ?? ''
      const parsed = parseCsv(text, file.name)
      if (!parsed) {
        setError(`ما قدرنا نقرأ الملف — الأعمدة اللي لقيناها: ${firstLine.slice(0,150)}`)
      } else {
        saveResult(parsed)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ marginBottom: 8, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Upload Row */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.04))',
        border: '1px solid rgba(212,175,55,0.25)', borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', marginBottom: 2 }}>استيراد من Tradovate ✦</p>
          <p style={{ fontSize: 10, color: '#4A5A7A' }}>Tradovate → Activity → Account Balance History → Export</p>
          {result?.fileName && <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>✓ {result.fileName}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {result && (
            <button type="button" onClick={clearResult}
              style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '8px 14px', color: '#E74C3C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🗑 مسح البيانات
            </button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ background: 'linear-gradient(135deg,#D4AF37,#B8960C)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#080C14', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {result ? '↺ تغيير الملف' : 'اختر ملف CSV'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>

      {error && (
        <div style={{ marginTop: 8, background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#E74C3C' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 4 main stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="أيام رابحة" value={`${result.winRate.toFixed(0)}%`}
              sub={`${result.winDays} من أصل ${result.totalTradingDays} يوم`}
              color={result.winRate >= 50 ? '#1DB954' : '#E74C3C'} />
            <StatCard label="نسبة النجاح" value={`${result.winRate.toFixed(1)}%`}
              sub={`${result.winDays} ربح · ${result.lossDays} خسارة`}
              color={result.winRate >= 50 ? '#1DB954' : '#E74C3C'} />
            <StatCard label="نسبة ربح/خسارة"
              value={result.avgWinLossRatio > 0 ? result.avgWinLossRatio.toFixed(2) : '—'}
              sub={`عامل الربح: ${result.profitFactor >= 999 ? '∞' : result.profitFactor.toFixed(2)}`}
              color={result.avgWinLossRatio >= 1 ? '#1DB954' : '#E74C3C'} />
            <StatCard label="إجمالي P&L" value={fmt(result.totalPnl)}
              sub={`${result.totalTradingDays} يوم تداول`}
              color={result.totalPnl >= 0 ? '#1DB954' : '#E74C3C'} />
          </div>

          {/* Extra stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <StatCard label="متوسط يوم رابح"  value={fmt(result.avgWin)}  color="#1DB954" />
            <StatCard label="متوسط يوم خاسر"  value={fmt(result.avgLoss)} color="#E74C3C" />
            <StatCard label="أقصى انسحاب"     value={`$${Math.round(result.maxDrawdown).toLocaleString()}`} color="#E74C3C" />
          </div>

          {/* Best / Worst */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {result.bestDay && (
              <div style={{ background: 'rgba(29,185,84,0.07)', border: '1px solid rgba(29,185,84,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, color: '#4A5A7A', marginBottom: 4 }}>🏆 أفضل يوم</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#1DB954', margin: 0 }}>{fmt(result.bestDay.pnl)}</p>
                <p style={{ fontSize: 10, color: '#4A5A7A', marginTop: 3 }}>{result.bestDay.date}</p>
              </div>
            )}
            {result.worstDay && (
              <div style={{ background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, color: '#4A5A7A', marginBottom: 4 }}>📉 أسوأ يوم</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#E74C3C', margin: 0 }}>{fmt(result.worstDay.pnl)}</p>
                <p style={{ fontSize: 10, color: '#4A5A7A', marginTop: 3 }}>{result.worstDay.date}</p>
              </div>
            )}
          </div>

          {/* Daily bar chart */}
          <DailyChart days={result.days} />

          {/* Calendar */}
          <MiniCalendar days={result.days} />

          {/* Last 10 days */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', margin: 0 }}>آخر أيام التداول</p>
            </div>
            {[...result.days].reverse().slice(0, 10).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 12, color: '#C8D8EE' }}>{d.date}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: d.pnl >= 0 ? '#1DB954' : '#E74C3C' }}>{fmt(d.pnl)}</span>
              </div>
            ))}
          </div>

          {/* AI Analysis */}
          <div style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#D4AF37', marginBottom: 12 }}>🧠 تحليل الأداء</p>
            <AnalysisSection result={result} />
          </div>

        </div>
      )}
    </div>
  )
}
