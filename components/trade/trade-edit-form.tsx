'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jerusalemWallToUTC, utcToJerusalemWall } from '@/lib/timezone'

interface TradeData {
  id: string
  symbol: string
  direction: string
  entryPrice: number
  exitPrice: number | null
  entryTime: string
  exitTime: string | null
  pnl: number | null
  rrAchieved: number | null
  rrPlanned: number | null
  notes: string | null
  selfRating: number | null
  emotionalState: string | null
  entryReasons: { id: string; name: string; category: string }[]
}

interface EntryReason {
  id: string
  category: string
  name: string
}

const SYMBOLS = ['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER'] as const
const EMOTIONS = [
  { value: '', label: '—' },
  { value: 'calm', label: '😌 هادئ' },
  { value: 'confident', label: '💪 واثق' },
  { value: 'focused', label: '🎯 مركّز' },
  { value: 'anxious', label: '😰 قلق' },
  { value: 'greedy', label: '🤑 طامع' },
  { value: 'revenge', label: '😤 انتقامي' },
  { value: 'tired', label: '😴 متعب' },
  { value: 'fomo', label: '😱 FOMO' },
]

// Strip __meta: suffix for clean notes display during edit
function splitMeta(raw: string | null): { clean: string; metaSuffix: string } {
  if (!raw) return { clean: '', metaSuffix: '' }
  const idx = raw.indexOf('__meta:')
  if (idx === -1) return { clean: raw, metaSuffix: '' }
  return { clean: raw.slice(0, idx).replace(/\n+$/, ''), metaSuffix: raw.slice(idx) }
}

// Split stored UTC-ISO into separate date ("YYYY-MM-DD") + time ("HH:MM")
// READ AS JERUSALEM WALL-CLOCK — same timezone used by the new-trade form
// and by the analysis page. This keeps what the user typed == what they see
// here == what shows in the analytics hour/day buckets.
function isoToDatePart(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return utcToJerusalemWall(d).split('T')[0] ?? ''
}

function isoToTimePart(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return utcToJerusalemWall(d).split('T')[1] ?? ''
}

function combineDateTimeToIso(date: string, time: string): string | null {
  if (!date) return null
  const t = time || '00:00'
  // Interpret the input as Jerusalem wall-clock (independent of browser TZ)
  const d = jerusalemWallToUTC(`${date}T${t}`)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function TradeEditForm({
  trade,
  onCancel,
  onSaved,
}: {
  trade: TradeData
  onCancel: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allReasons, setAllReasons] = useState<EntryReason[]>([])

  const { clean: initialNotes, metaSuffix } = splitMeta(trade.notes)

  const [form, setForm] = useState({
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    entryDate: isoToDatePart(trade.entryTime),
    entryTimeOfDay: isoToTimePart(trade.entryTime),
    exitDate: isoToDatePart(trade.exitTime),
    exitTimeOfDay: isoToTimePart(trade.exitTime),
    pnl: trade.pnl,
    rrAchieved: trade.rrAchieved,
    rrPlanned: trade.rrPlanned,
    notes: initialNotes,
    selfRating: trade.selfRating,
    emotionalState: trade.emotionalState ?? '',
    entryReasonIds: trade.entryReasons.map((r) => r.id),
  })

  useEffect(() => {
    fetch('/api/entry-reasons')
      .then((r) => r.json())
      .then((data: EntryReason[]) => setAllReasons(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function toggleReason(id: string) {
    setForm((f) => ({
      ...f,
      entryReasonIds: f.entryReasonIds.includes(id)
        ? f.entryReasonIds.filter((x) => x !== id)
        : [...f.entryReasonIds, id],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        symbol: form.symbol,
        direction: form.direction,
        entryPrice: Number(form.entryPrice) || 0,
        exitPrice: form.exitPrice === null || form.exitPrice === undefined ? null : Number(form.exitPrice),
        entryTime:
          combineDateTimeToIso(form.entryDate, form.entryTimeOfDay) ?? trade.entryTime,
        exitTime: form.exitDate
          ? combineDateTimeToIso(form.exitDate, form.exitTimeOfDay)
          : null,
        pnl: form.pnl === null || form.pnl === undefined ? null : Number(form.pnl),
        rrAchieved: form.rrAchieved === null || form.rrAchieved === undefined ? null : Number(form.rrAchieved),
        rrPlanned: form.rrPlanned === null || form.rrPlanned === undefined ? null : Number(form.rrPlanned),
        // Preserve the __meta:... suffix if it existed
        notes: form.notes.trim().length > 0 || metaSuffix
          ? `${form.notes.trim()}${metaSuffix ? (form.notes.trim() ? '\n\n' : '') + metaSuffix : ''}`
          : null,
        selfRating: form.selfRating === null || form.selfRating === undefined ? null : Number(form.selfRating),
        emotionalState: form.emotionalState || null,
        entryReasonIds: form.entryReasonIds,
      }

      const res = await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error?.formErrors?.[0] ?? j.error ?? 'فشل الحفظ')
      }

      onSaved()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  // Group reasons by category for display
  const reasonsByCategory = allReasons.reduce<Record<string, EntryReason[]>>((acc, r) => {
    ;(acc[r.category] ||= []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <div className="card-dark p-4">
        <p className="text-[#D4AF37] text-[11px] font-bold mb-3">✏️ تعديل الصفقة</p>

        {/* Symbol + direction */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-[#8899BB] block mb-1">الرمز</label>
            <select
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className={selectCls}
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#8899BB] block mb-1">الاتجاه</label>
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
              className={selectCls}
            >
              <option value="LONG">▲ شراء</option>
              <option value="SHORT">▼ بيع</option>
            </select>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumberField
            label="سعر الدخول"
            value={form.entryPrice}
            onChange={(v) => setForm({ ...form, entryPrice: v ?? 0 })}
          />
          <NumberField
            label="سعر الخروج"
            value={form.exitPrice}
            onChange={(v) => setForm({ ...form, exitPrice: v })}
            allowNull
          />
        </div>

        {/* Times — flexible text inputs accept Arabic digits and any separators */}
        <div className="mb-3">
          <label className="text-[10px] text-[#8899BB] block mb-1">وقت الدخول</label>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <DateTextField
              value={form.entryDate}
              onChange={(v) => setForm({ ...form, entryDate: v })}
              placeholder="YYYY-MM-DD"
            />
            <TimeTextField
              value={form.entryTimeOfDay}
              onChange={(v) => setForm({ ...form, entryTimeOfDay: v })}
              placeholder="HH:MM"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] text-[#8899BB] block mb-1">
            وقت الخروج <span className="text-[#4A5A7A]">(اختياري)</span>
          </label>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <DateTextField
              value={form.exitDate}
              onChange={(v) => setForm({ ...form, exitDate: v })}
              placeholder="YYYY-MM-DD"
            />
            <TimeTextField
              value={form.exitTimeOfDay}
              onChange={(v) => setForm({ ...form, exitTimeOfDay: v })}
              placeholder="HH:MM"
            />
          </div>
        </div>

        {/* PnL + RR */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <NumberField
            label="P&L (نقاط)"
            value={form.pnl}
            onChange={(v) => setForm({ ...form, pnl: v })}
            allowNull
          />
          <NumberField
            label="RR المحقق"
            value={form.rrAchieved}
            onChange={(v) => setForm({ ...form, rrAchieved: v })}
            allowNull
            step={0.1}
          />
          <NumberField
            label="RR المخطط"
            value={form.rrPlanned}
            onChange={(v) => setForm({ ...form, rrPlanned: v })}
            allowNull
            step={0.1}
          />
        </div>

        {/* Rating + emotion */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumberField
            label="تقييم (1-10)"
            value={form.selfRating}
            onChange={(v) => setForm({ ...form, selfRating: v })}
            allowNull
            min={1}
            max={10}
          />
          <div>
            <label className="text-[10px] text-[#8899BB] block mb-1">الحالة النفسية</label>
            <select
              value={form.emotionalState}
              onChange={(e) => setForm({ ...form, emotionalState: e.target.value })}
              className={selectCls}
            >
              {EMOTIONS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-3">
          <label className="text-[10px] text-[#8899BB] block mb-1">
            الملاحظات{' '}
            <span className="text-[#4A5A7A]">
              (التحليل الذكي يشتغل تلقائياً لما تحفظ)
            </span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={6}
            className={textareaCls}
            placeholder="اكتب ملاحظاتك بالعربي / العبري / الإنجليزي — سيحللها الذكاء الاصطناعي ويستخرج الفريمات والـ confluences..."
          />
        </div>
      </div>

      {/* Entry reasons */}
      {allReasons.length > 0 && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold mb-2">
            🎯 أسباب الدخول ({form.entryReasonIds.length})
          </p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(reasonsByCategory).map(([cat, list]) => (
              <div key={cat}>
                <p className="text-[10px] text-[#8899BB] mb-1 font-bold">{cat}</p>
                <div className="flex flex-wrap gap-1">
                  {list.map((r) => {
                    const selected = form.entryReasonIds.includes(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleReason(r.id)}
                        className="text-[10px] px-2 py-1 rounded-full border transition-all"
                        style={{
                          background: selected ? 'rgba(212,175,55,0.18)' : '#0D1520',
                          borderColor: selected ? '#D4AF37' : 'rgba(212,175,55,0.15)',
                          color: selected ? '#D4AF37' : '#8899BB',
                          fontWeight: selected ? 700 : 400,
                        }}
                      >
                        {selected ? '✓ ' : ''}
                        {r.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="text-[11px] p-2 rounded-lg border"
          style={{
            background: 'rgba(231,76,60,0.08)',
            borderColor: 'rgba(231,76,60,0.3)',
            color: '#E74C3C',
          }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="py-3 rounded-xl text-xs font-bold border"
          style={{
            background: 'transparent',
            borderColor: 'rgba(212,175,55,0.2)',
            color: '#8899BB',
          }}
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="py-3 rounded-xl text-xs font-black disabled:opacity-50"
          style={{
            background: 'linear-gradient(90deg, #A07D1C, #D4AF37)',
            color: '#0A192F',
          }}
        >
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
        </button>
      </div>
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#0D1520] border border-[rgba(212,175,55,0.15)] rounded-lg px-2 py-2 text-xs text-[#C8D8EE] focus:border-[#D4AF37] outline-none'
const selectCls = inputCls
const textareaCls =
  'w-full bg-[#0D1520] border border-[rgba(212,175,55,0.15)] rounded-lg px-3 py-2 text-xs text-[#C8D8EE] focus:border-[#D4AF37] outline-none leading-relaxed resize-y'

// Normalize Arabic-Indic (٠-٩) & Persian-Indic (۰-۹) digits + Arabic decimal markers (٫ ،) to ASCII
function normalizeDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٫،]/g, '.')
}

function NumberField({
  label,
  value,
  onChange,
  allowNull,
  min,
  max,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  allowNull?: boolean
  step?: number
  min?: number
  max?: number
}) {
  // Local string state preserves intermediate values like "1." while typing,
  // and lets us accept Arabic digits that type="number" would silently reject.
  const [local, setLocal] = useState<string>(
    value === null || value === undefined || Number.isNaN(value) ? '' : String(value)
  )

  return (
    <div>
      <label className="text-[10px] text-[#8899BB] block mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={local}
        onChange={(e) => {
          const raw = normalizeDigits(e.target.value)
          // Accept empty, digits, one optional decimal point, optional leading minus
          if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
            setLocal(raw)
            if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
              onChange(allowNull ? null : 0)
              return
            }
            const n = parseFloat(raw)
            if (!isNaN(n)) {
              if (min !== undefined && n < min) return
              if (max !== undefined && n > max) return
              onChange(n)
            }
          }
        }}
        className={inputCls}
      />
    </div>
  )
}

// Parse a user-typed date into ISO "YYYY-MM-DD". Returns '' if empty, or input
// unchanged if not yet parseable (let the user keep typing).
function parseFlexibleDate(raw: string): string {
  const s = normalizeDigits(raw).trim()
  if (!s) return ''
  // Already ISO: 2026-04-21
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // YYYY/MM/DD
  m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return s
}

function parseFlexibleTime(raw: string): string {
  const s = normalizeDigits(raw).trim()
  if (!s) return ''
  const m = s.match(/^(\d{1,2})[:.](\d{1,2})$/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`
  return s
}

function DateTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [local, setLocal] = useState<string>(value || '')
  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={local}
      placeholder={placeholder}
      onChange={(e) => {
        // Allow freeform typing; normalize digits as the user types
        const raw = normalizeDigits(e.target.value)
        setLocal(raw)
        // Only commit parseable ISO dates to parent form state.
        // Empty string is also valid (clears the field).
        const parsed = parseFlexibleDate(raw)
        if (parsed === '' || /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
          onChange(parsed)
        }
      }}
      onBlur={() => {
        // On blur, try one more parse attempt and sync display
        const parsed = parseFlexibleDate(local)
        setLocal(parsed)
        if (parsed === '' || /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
          onChange(parsed)
        }
      }}
      className={inputCls}
    />
  )
}

function TimeTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [local, setLocal] = useState<string>(value || '')
  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={local}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = normalizeDigits(e.target.value)
        setLocal(raw)
        const parsed = parseFlexibleTime(raw)
        if (parsed === '' || /^\d{2}:\d{2}$/.test(parsed)) {
          onChange(parsed)
        }
      }}
      onBlur={() => {
        const parsed = parseFlexibleTime(local)
        setLocal(parsed)
        if (parsed === '' || /^\d{2}:\d{2}$/.test(parsed)) {
          onChange(parsed)
        }
      }}
      className={inputCls}
    />
  )
}
