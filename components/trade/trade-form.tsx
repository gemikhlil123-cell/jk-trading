'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { EntryReasonSelect, type EntryReason } from './entry-reason-select'
import { ChartImages } from './chart-images'
import { jerusalemWallToUTC, utcToJerusalemWall } from '@/lib/timezone'

const SYMBOLS = ['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']
const SYM_LABELS: Record<string, string> = {
  NQ: 'NQ — ناسداك', ES: 'ES — S&P 500', BTC: 'BTC — بيتكوين',
  XAU: 'XAU — ذهب', GC: 'GC — ذهب آجل', CL: 'CL — نفط',
  EURUSD: 'EUR/USD', OTHER: 'أخرى',
}

const CONFIRMATIONS = [
  { id: 'DOUBLE_SMT',   label: 'Double SMT' },
  { id: 'PSP_15M',      label: 'PSP 15M' },
  { id: 'PSP_5M',       label: 'PSP 5M' },
  { id: 'SMT_FILL_5M',  label: 'SMT Fill 5M' },
  { id: 'SMT_FILL_15M', label: 'SMT Fill 15M' },
]

type TOKey = 'TWO' | 'TDO' | 'Session'
type TODir = 'above' | 'below'

interface TradeFormProps {
  isBacktest?: boolean
  backtestSessionId?: string
  sessionSymbol?: string
}

export function TradeForm({ isBacktest = false, backtestSessionId, sessionSymbol }: TradeFormProps) {
  const locale = useLocale()
  const router = useRouter()

  const [symbol, setSymbol]         = useState(sessionSymbol ?? 'NQ')
  const [direction, setDirection]   = useState<'LONG' | 'SHORT'>('LONG')
  const [sl, setSl]                 = useState('')
  const [target, setTarget]         = useState('')
  const [entryTime, setEntryTime]   = useState('')
  const [exitTime, setExitTime]     = useState('')
  const [pnl, setPnl]               = useState('')
  const [rrAchieved, setRrAchieved] = useState('')
  const [rrPlanned, setRrPlanned]   = useState('')
  const [result, setResult]         = useState<'WIN' | 'LOSS' | null>(null)
  const [notes, setNotes]           = useState('')
  const [trueOpens, setTrueOpens]   = useState<Record<TOKey, TODir | null>>({ TWO: null, TDO: null, Session: null })
  const [confirmations, setConfirmations] = useState<string[]>([])
  const [entryReasonIds, setEntryReasonIds] = useState<string[]>([])
  const [chartImages, setChartImages] = useState<Record<string, string>>({})
  const [reasons, setReasons]       = useState<EntryReason[]>([])
  const [selfRating, setSelfRating] = useState<number | null>(null)
  const [emotionalState, setEmotionalState] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    fetch('/api/entry-reasons').then(r => r.json()).then(setReasons)
    // Prefill with current Jerusalem wall-clock time (handles DST automatically)
    setEntryTime(utcToJerusalemWall(new Date()))
  }, [])

  function toggleTO(key: TOKey, dir: TODir) {
    setTrueOpens(prev => ({ ...prev, [key]: prev[key] === dir ? null : dir }))
  }

  function toggleConfirm(id: string) {
    setConfirmations(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  function resetForm() {
    setSl(''); setTarget('')
    setPnl(''); setRrAchieved(''); setRrPlanned('')
    setResult(null); setNotes('')
    setTrueOpens({ TWO: null, TDO: null, Session: null })
    setConfirmations([]); setEntryReasonIds([])
    setChartImages({})
    setSelfRating(null); setEmotionalState('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!entryTime) { setError('أدخل وقت الدخول'); return }
    if (entryReasonIds.length === 0) { setError('يجب اختيار سبب دخول واحد على الأقل'); return }

    setLoading(true); setError('')
    try {
      const metadata = JSON.stringify({ trueOpens, confirmations, result, sl, target })
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          direction,
          entryPrice: 0,
          entryTime: jerusalemWallToUTC(entryTime).toISOString(),
          exitTime: exitTime ? jerusalemWallToUTC(exitTime).toISOString() : undefined,
          pnl: pnl ? parseFloat(pnl) : undefined,
          rrAchieved: rrAchieved ? parseFloat(rrAchieved) : undefined,
          rrPlanned: rrPlanned ? parseFloat(rrPlanned) : undefined,
          isBacktest,
          backtestSessionId: backtestSessionId ?? undefined,
          entryReasonIds,
          notes: notes ? `${notes}\n__meta:${metadata}` : `__meta:${metadata}`,
          chartImages: Object.keys(chartImages).length > 0 ? JSON.stringify(chartImages) : undefined,
          selfRating: selfRating ?? undefined,
          emotionalState: emotionalState || undefined,
        }),
      })
      if (!res.ok) { setError('حدث خطأ في حفظ الصفقة'); setLoading(false); return }
      setSaved(true)
      resetForm()
      setTimeout(() => {
        setSaved(false)
        if (backtestSessionId) router.refresh()
        else router.push(`/${locale}/trades`)
      }, 1200)
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const ic = 'form-input-dark'
  const lc = 'block text-[11px] font-bold text-[#D4AF37] tracking-wide mb-1.5'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1 pb-2">
      <div className="card-gold p-3 flex items-center gap-2 mt-3">
        <span className="text-lg">💡</span>
        <p className="text-[#8899BB] text-xs">تأكد من مراجعة التحيز قبل الدخول</p>
      </div>

      <div className="sec-title">الرمز والاتجاه</div>
      <div className="grid grid-cols-2 gap-2">
        {!sessionSymbol ? (
          <div>
            <label className={lc}>الرمز</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)} className={ic}>
              {SYMBOLS.map(s => <option key={s} value={s}>{SYM_LABELS[s]}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex items-end pb-2">
            <span className="text-[#D4AF37] font-black text-xl">{sessionSymbol}</span>
          </div>
        )}
        <div>
          <label className={lc}>الاتجاه</label>
          <div className="flex gap-1.5 h-[46px]">
            {(['LONG', 'SHORT'] as const).map(d => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={[
                  'flex-1 rounded-xl border text-sm font-bold transition-all',
                  direction === d
                    ? d === 'LONG'
                      ? 'bg-[rgba(29,185,84,0.15)] border-[rgba(29,185,84,0.5)] text-[#1DB954]'
                      : 'bg-[rgba(231,76,60,0.15)] border-[rgba(231,76,60,0.5)] text-[#E74C3C]'
                    : 'bg-[#162035] border-[rgba(212,175,55,0.12)] text-[#4A5A7A]',
                ].join(' ')}>
                {d === 'LONG' ? '▲ شراء' : '▼ بيع'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-title">النقاط</div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lc}>Stop Loss (نقاط)</label><input type="number" step="any" placeholder="50" value={sl} onChange={e => setSl(e.target.value)} className={ic} /></div>
        <div><label className={lc}>Target (نقاط)</label><input type="number" step="any" placeholder="100" value={target} onChange={e => setTarget(e.target.value)} className={ic} /></div>
      </div>

      <div className="sec-title">التوقيت</div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lc}>وقت الدخول *</label><input type="datetime-local" value={entryTime} onChange={e => setEntryTime(e.target.value)} className={ic} /></div>
        <div><label className={lc}>وقت الخروج</label><input type="datetime-local" value={exitTime} onChange={e => setExitTime(e.target.value)} className={ic} /></div>
      </div>

      <div className="sec-title">النتائج</div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={lc}>النتيجة (نقاط)</label><input type="number" step="any" placeholder="+25" value={pnl} onChange={e => setPnl(e.target.value)} className={ic} /></div>
        <div><label className={lc}>RR المحقق</label><input type="number" step="0.1" placeholder="2.5" value={rrAchieved} onChange={e => setRrAchieved(e.target.value)} className={ic} /></div>
        <div><label className={lc}>RR المخطط</label><input type="number" step="0.1" placeholder="3.0" value={rrPlanned} onChange={e => setRrPlanned(e.target.value)} className={ic} /></div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <button type="button" onClick={() => setResult(result === 'WIN' ? null : 'WIN')}
          className={['py-3 rounded-xl border font-bold text-sm transition-all',
            result === 'WIN' ? 'bg-[rgba(29,185,84,0.15)] border-[rgba(29,185,84,0.5)] text-[#1DB954]' : 'bg-[#162035] border-[rgba(212,175,55,0.12)] text-[#4A5A7A]'].join(' ')}>
          ✓ رابح (Win)
        </button>
        <button type="button" onClick={() => setResult(result === 'LOSS' ? null : 'LOSS')}
          className={['py-3 rounded-xl border font-bold text-sm transition-all',
            result === 'LOSS' ? 'bg-[rgba(231,76,60,0.15)] border-[rgba(231,76,60,0.5)] text-[#E74C3C]' : 'bg-[#162035] border-[rgba(212,175,55,0.12)] text-[#4A5A7A]'].join(' ')}>
          ✕ خاسر (Loss)
        </button>
      </div>

      <div className="sec-title">شروط الدخول</div>
      <div className="card-dark p-3.5">
        <p className="text-[11px] font-bold text-[#D4AF37] tracking-wide mb-2.5">True Opens</p>
        <div className="grid grid-cols-3 gap-2">
          {(['TWO', 'TDO', 'Session'] as TOKey[]).map(key => (
            <div key={key} className="bg-[#0D1520] rounded-xl p-2.5 text-center border border-[rgba(212,175,55,0.1)]">
              <p className="text-[#D4AF37] text-[10px] font-bold mb-2">{key}</p>
              <div className="flex gap-1">
                {(['above', 'below'] as TODir[]).map(dir => (
                  <button key={dir} type="button" onClick={() => toggleTO(key, dir)}
                    className={[
                      'flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                      trueOpens[key] === dir
                        ? dir === 'above'
                          ? 'bg-[rgba(29,185,84,0.15)] border-[rgba(29,185,84,0.4)] text-[#1DB954]'
                          : 'bg-[rgba(231,76,60,0.15)] border-[rgba(231,76,60,0.4)] text-[#E74C3C]'
                        : 'bg-[#162035] border-[rgba(212,175,55,0.1)] text-[#4A5A7A]',
                    ].join(' ')}>
                    {dir === 'above' ? '▲' : '▼'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-bold text-[#D4AF37] tracking-wide mt-3.5 mb-2">تأكيدات الدخول</p>
        <div className="flex flex-wrap gap-1.5">
          {CONFIRMATIONS.map(c => (
            <button key={c.id} type="button" onClick={() => toggleConfirm(c.id)}
              className={['pill-toggle', confirmations.includes(c.id) ? 'active' : ''].join(' ')}>
              <span className={['w-2 h-2 rounded-full border transition-all flex-shrink-0',
                confirmations.includes(c.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#4A5A7A]'].join(' ')} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sec-title">صور الشارت</div>
      <ChartImages value={chartImages} onChange={setChartImages} />

      <div className="sec-title">أسباب الدخول</div>
      <EntryReasonSelect reasons={reasons} value={entryReasonIds} onChange={setEntryReasonIds}
        error={error.includes('سبب') ? error : undefined} />

      <div className="sec-title">التقييم الذاتي</div>
      <div className="card-dark p-3.5 space-y-3">
        <div>
          <p className="text-[11px] font-bold text-[#D4AF37] tracking-wide mb-2">تقييم الصفقة (1–10)</p>
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} type="button" onClick={() => setSelfRating(selfRating === n ? null : n)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={selfRating === n
                  ? { background: 'rgba(201,168,76,0.2)', borderColor: '#D4AF37', color: '#D4AF37' }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(212,175,55,0.12)', color: '#4A5A7A' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#D4AF37] tracking-wide mb-2">الحالة النفسية</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'calm',       label: '😌 هادئ' },
              { id: 'confident',  label: '💪 واثق' },
              { id: 'anxious',    label: '😰 قلق' },
              { id: 'greedy',     label: '🤑 طامع' },
              { id: 'revenge',    label: '😤 انتقامي' },
              { id: 'focused',    label: '🎯 مركّز' },
              { id: 'tired',      label: '😴 متعب' },
              { id: 'fomo',       label: '😱 FOMO' },
            ].map(e => (
              <button key={e.id} type="button"
                onClick={() => setEmotionalState(emotionalState === e.id ? '' : e.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={emotionalState === e.id
                  ? { background: 'rgba(201,168,76,0.15)', borderColor: 'rgba(201,168,76,0.4)', color: '#D4AF37' }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(212,175,55,0.1)', color: '#4A5A7A' }}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-title">ملاحظات</div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
        placeholder="ما الذي رأيتَه؟ أين أخطأت أو أصبتَ؟ ماذا ستحسّن؟"
        className="form-input-dark resize-none leading-relaxed" />

      {error && !error.includes('سبب') && (
        <div className="bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.3)] rounded-xl p-3 text-[#E74C3C] text-xs">{error}</div>
      )}
      {saved && (
        <div className="bg-[rgba(29,185,84,0.1)] border border-[rgba(29,185,84,0.3)] rounded-xl p-3 text-[#1DB954] text-sm text-center font-bold">
          ✓ تم حفظ الصفقة بنجاح
        </div>
      )}

      <button type="submit" disabled={loading}
        className="gold-btn w-full py-4 rounded-xl text-[15px] mt-2 disabled:opacity-60">
        {loading ? 'جاري الحفظ...' : 'حفظ الصفقة ✦'}
      </button>
    </form>
  )
}
