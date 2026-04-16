'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  killzone: string | null
  cyclePhase: string | null
  notes: string | null
  chartImages: string | null
  selfRating: number | null
  emotionalState: string | null
  isBacktest: boolean
  entryReasons: { id: string; name: string; category: string }[]
  comments: { id: string; body: string; mentorName: string | null; createdAt: string }[]
}

const KILLZONE_AR: Record<string, string> = {
  ASIA: 'آسيا', LONDON: 'لندن', NY_AM: 'NY ص', NY_PM: 'NY م', OFF_HOURS: 'خارج',
}

const EMOTION_AR: Record<string, string> = {
  calm: '😌 هادئ',
  confident: '💪 واثق',
  anxious: '😰 قلق',
  greedy: '🤑 طامع',
  revenge: '😤 انتقامي',
  focused: '🎯 مركّز',
  tired: '😴 متعب',
  fomo: '😱 FOMO',
}

const SLOT_LABELS: Record<string, string> = {
  daily: 'Daily / 6H / 4H',
  h1: '1H',
  m15: '15M',
  m5: '5M',
}

interface TradeMeta {
  trueOpens?: Record<string, string | null>
  confirmations?: string[]
  result?: string | null
  sl?: string
  target?: string
}

function parseMeta(notes: string | null): { meta: TradeMeta | null; cleanNotes: string } {
  if (!notes) return { meta: null, cleanNotes: '' }
  const idx = notes.indexOf('__meta:')
  if (idx === -1) return { meta: null, cleanNotes: notes }
  const cleanNotes = notes.slice(0, idx).replace(/\n+$/, '')
  try {
    const meta = JSON.parse(notes.slice(idx + 7))
    return { meta, cleanNotes }
  } catch {
    return { meta: null, cleanNotes }
  }
}

export function TradeDetailView({ trade, locale }: { trade: TradeData; locale: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [zoomImg, setZoomImg] = useState<string | null>(null)

  const isWin = trade.pnl !== null && trade.pnl > 0
  const isLoss = trade.pnl !== null && trade.pnl < 0
  const { meta, cleanNotes } = parseMeta(trade.notes)

  let charts: Record<string, string> = {}
  if (trade.chartImages) {
    try { charts = JSON.parse(trade.chartImages) } catch {}
  }
  const chartKeys = Object.keys(charts)

  async function handleDelete() {
    if (!confirm('هل تريد حذف هذه الصفقة؟')) return
    setDeleting(true)
    const res = await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push(`/${locale}/trades`)
      router.refresh()
    } else {
      setDeleting(false)
      alert('فشل حذف الصفقة')
    }
  }

  return (
    <div className="space-y-3">
      {/* Top Summary Card */}
      <div className="card-dark p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[#C8D8EE] font-black text-2xl">{trade.symbol}</span>
            <span className={[
              'text-xs font-bold px-3 py-1 rounded-full',
              trade.direction === 'LONG'
                ? 'bg-[rgba(29,185,84,0.12)] text-[#1DB954]'
                : 'bg-[rgba(231,76,60,0.12)] text-[#E74C3C]',
            ].join(' ')}>
              {trade.direction === 'LONG' ? '▲ شراء' : '▼ بيع'}
            </span>
          </div>
          {trade.pnl !== null && (
            <span className={`text-2xl font-black ${isWin ? 'text-[#1DB954]' : isLoss ? 'text-[#E74C3C]' : 'text-[#8899BB]'}`}>
              {isWin ? '+' : ''}{trade.pnl.toFixed(0)} <span className="text-sm">نقطة</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {trade.rrAchieved !== null && (
            <div className="bg-[#0D1520] rounded-lg p-2.5 border border-[rgba(212,175,55,0.08)]">
              <p className="text-[#4A5A7A] text-[10px] mb-0.5">RR المحقق</p>
              <p className={`font-mono font-bold ${trade.rrAchieved >= 1 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}`}>
                {trade.rrAchieved.toFixed(2)}R
              </p>
            </div>
          )}
          {trade.rrPlanned !== null && (
            <div className="bg-[#0D1520] rounded-lg p-2.5 border border-[rgba(212,175,55,0.08)]">
              <p className="text-[#4A5A7A] text-[10px] mb-0.5">RR المخطط</p>
              <p className="text-[#C8D8EE] font-mono font-bold">{trade.rrPlanned.toFixed(2)}R</p>
            </div>
          )}
        </div>
      </div>

      {/* Timing */}
      <div className="card-dark p-4">
        <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">⏱ التوقيت</p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#4A5A7A]">الدخول</span>
            <span className="text-[#C8D8EE] font-mono">
              {new Date(trade.entryTime).toLocaleString('en-GB', { hour12: false })}
            </span>
          </div>
          {trade.exitTime && (
            <div className="flex justify-between">
              <span className="text-[#4A5A7A]">الخروج</span>
              <span className="text-[#C8D8EE] font-mono">
                {new Date(trade.exitTime).toLocaleString('en-GB', { hour12: false })}
              </span>
            </div>
          )}
          {trade.killzone && (
            <div className="flex justify-between">
              <span className="text-[#4A5A7A]">جلسة</span>
              <span className="text-[#D4AF37] font-bold">{KILLZONE_AR[trade.killzone] ?? trade.killzone}</span>
            </div>
          )}
          {trade.cyclePhase && (
            <div className="flex justify-between">
              <span className="text-[#4A5A7A]">السايكل</span>
              <span className="text-[#D4AF37] font-bold">{trade.cyclePhase}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Images */}
      {chartKeys.length > 0 && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-3">📊 صور الشارت ({chartKeys.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {chartKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setZoomImg(charts[key])}
                className="relative rounded-lg overflow-hidden border border-[rgba(212,175,55,0.2)] hover:border-[#D4AF37] transition-all"
                style={{ aspectRatio: '16/10' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={charts[key]}
                  alt={SLOT_LABELS[key] ?? key}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-bold text-[#D4AF37]"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  {SLOT_LABELS[key] ?? key}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Entry Reasons */}
      {trade.entryReasons.length > 0 && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">🎯 أسباب الدخول</p>
          <div className="flex flex-wrap gap-1.5">
            {trade.entryReasons.map((er) => (
              <span key={er.id}
                className="text-[10px] px-2.5 py-1 rounded-full bg-[#162035] text-[#8899BB] border border-[rgba(212,175,55,0.12)]">
                {er.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* True Opens & Confirmations from meta */}
      {meta && (meta.trueOpens || (meta.confirmations && meta.confirmations.length > 0)) && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">⚙️ شروط الدخول</p>
          {meta.trueOpens && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['TWO', 'TDO', 'Session'] as const).map((k) => {
                const dir = meta.trueOpens?.[k]
                return (
                  <div key={k} className="bg-[#0D1520] rounded-lg p-2 text-center border border-[rgba(212,175,55,0.08)]">
                    <p className="text-[#D4AF37] text-[9px] font-bold">{k}</p>
                    <p className={`text-xs font-bold mt-0.5 ${
                      dir === 'above' ? 'text-[#1DB954]' : dir === 'below' ? 'text-[#E74C3C]' : 'text-[#4A5A7A]'
                    }`}>
                      {dir === 'above' ? '▲ Above' : dir === 'below' ? '▼ Below' : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
          {meta.confirmations && meta.confirmations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meta.confirmations.map((c) => (
                <span key={c} className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border border-[rgba(212,175,55,0.25)]">
                  ✓ {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {(meta.sl || meta.target) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {meta.sl && (
                <div className="bg-[#0D1520] rounded-lg p-2 border border-[rgba(231,76,60,0.15)]">
                  <p className="text-[#4A5A7A] text-[10px]">Stop Loss (نقاط)</p>
                  <p className="text-[#E74C3C] font-mono font-bold">{meta.sl}</p>
                </div>
              )}
              {meta.target && (
                <div className="bg-[#0D1520] rounded-lg p-2 border border-[rgba(29,185,84,0.15)]">
                  <p className="text-[#4A5A7A] text-[10px]">Target (نقاط)</p>
                  <p className="text-[#1DB954] font-mono font-bold">{meta.target}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Self Rating + Emotion */}
      {(trade.selfRating !== null || trade.emotionalState) && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">💭 التقييم الذاتي</p>
          <div className="flex items-center gap-3">
            {trade.selfRating !== null && (
              <div className="flex-1 bg-[#0D1520] rounded-lg p-2.5 text-center border border-[rgba(212,175,55,0.12)]">
                <p className="text-[#4A5A7A] text-[10px] mb-1">تقييم الصفقة</p>
                <p className="text-[#D4AF37] text-xl font-black">{trade.selfRating}<span className="text-xs text-[#4A5A7A]">/10</span></p>
              </div>
            )}
            {trade.emotionalState && (
              <div className="flex-1 bg-[#0D1520] rounded-lg p-2.5 text-center border border-[rgba(212,175,55,0.12)]">
                <p className="text-[#4A5A7A] text-[10px] mb-1">الحالة النفسية</p>
                <p className="text-[#D4AF37] text-sm font-bold">{EMOTION_AR[trade.emotionalState] ?? trade.emotionalState}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {cleanNotes && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">📝 الملاحظات</p>
          <p className="text-[#C8D8EE] text-xs leading-relaxed whitespace-pre-wrap">{cleanNotes}</p>
        </div>
      )}

      {/* Mentor Comments */}
      {trade.comments.length > 0 && (
        <div className="card-dark p-4">
          <p className="text-[#D4AF37] text-[11px] font-bold tracking-wide mb-2">💬 تعليقات المدرّب</p>
          <div className="space-y-2">
            {trade.comments.map((c) => (
              <div key={c.id} className="bg-[#0D1520] rounded-lg p-3 border border-[rgba(212,175,55,0.12)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#D4AF37] text-[10px] font-bold">{c.mentorName ?? 'المدرّب'}</span>
                  <span className="text-[#4A5A7A] text-[10px]">
                    {new Date(c.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <p className="text-[#C8D8EE] text-xs leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
        style={{
          background: 'rgba(231,76,60,0.08)',
          borderColor: 'rgba(231,76,60,0.3)',
          color: '#E74C3C',
        }}
      >
        {deleting ? 'جاري الحذف...' : '🗑 حذف الصفقة'}
      </button>

      {/* Zoom modal */}
      {zoomImg && (
        <div
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImg}
            alt="Chart"
            className="max-w-full max-h-full rounded-lg"
            style={{ boxShadow: '0 0 40px rgba(212,175,55,0.3)' }}
          />
          <button
            type="button"
            onClick={() => setZoomImg(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full text-white text-xl font-bold flex items-center justify-center"
            style={{ background: 'rgba(231,76,60,0.85)' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
