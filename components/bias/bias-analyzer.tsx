'use client'

import { useState } from 'react'

type BiasDir = 'bullish' | 'bearish' | null

interface TOState {
  TWO: 'above' | 'below' | null
  TDO: 'above' | 'below' | null
  Session: 'above' | 'below' | null
}

function computeResult(daily: BiasDir, sixH: BiasDir, fourH: BiasDir, to: TOState): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  let bull = 0, bear = 0
  if (daily === 'bullish') bull++; else if (daily === 'bearish') bear++
  if (sixH === 'bullish') bull++; else if (sixH === 'bearish') bear++
  if (fourH === 'bullish') bull++; else if (fourH === 'bearish') bear++
  if (to.TWO === 'above') bull++; else if (to.TWO === 'below') bear++
  if (to.TDO === 'above') bull++; else if (to.TDO === 'below') bear++
  if (to.Session === 'above') bull++; else if (to.Session === 'below') bear++
  if (bull > bear + 1) return 'BULLISH'
  if (bear > bull + 1) return 'BEARISH'
  return 'NEUTRAL'
}

function BiasButton({
  label, sublabel, selected, direction, onClick,
}: {
  label: string
  sublabel: string
  selected: boolean
  direction: 'bullish' | 'bearish'
  onClick: () => void
}) {
  const isBull = direction === 'bullish'
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all active:scale-[0.97]',
        selected
          ? isBull
            ? 'bg-[rgba(29,185,84,0.12)] border-[rgba(29,185,84,0.5)]'
            : 'bg-[rgba(231,76,60,0.12)] border-[rgba(231,76,60,0.5)]'
          : 'bg-[#162035] border-[rgba(212,175,55,0.12)]',
      ].join(' ')}
    >
      <span className="text-2xl">{isBull ? '🟢' : '🔴'}</span>
      <span className={[
        'text-sm font-bold',
        selected
          ? isBull ? 'text-[#1DB954]' : 'text-[#E74C3C]'
          : 'text-[#8899BB]',
      ].join(' ')}>
        {label}
      </span>
      <span className="text-[10px] text-[#4A5A7A] text-center">{sublabel}</span>
    </button>
  )
}

function TOCard({ label, value, onChange }: {
  label: string
  value: 'above' | 'below' | null
  onChange: (v: 'above' | 'below') => void
}) {
  return (
    <div className="bg-[#162035] border border-[rgba(212,175,55,0.12)] rounded-xl p-3 text-center">
      <p className="text-[#D4AF37] text-xs font-bold mb-2">{label}</p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange('above')}
          className={[
            'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            value === 'above'
              ? 'bg-[rgba(29,185,84,0.15)] border-[rgba(29,185,84,0.5)] text-[#1DB954]'
              : 'bg-[#111D2E] border-[rgba(212,175,55,0.12)] text-[#4A5A7A]',
          ].join(' ')}
        >
          أعلى ▲
        </button>
        <button
          onClick={() => onChange('below')}
          className={[
            'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            value === 'below'
              ? 'bg-[rgba(231,76,60,0.15)] border-[rgba(231,76,60,0.5)] text-[#E74C3C]'
              : 'bg-[#111D2E] border-[rgba(212,175,55,0.12)] text-[#4A5A7A]',
          ].join(' ')}
        >
          أسفل ▼
        </button>
      </div>
    </div>
  )
}

export function BiasAnalyzer() {
  const [daily, setDaily] = useState<BiasDir>(null)
  const [sixH, setSixH] = useState<BiasDir>(null)
  const [fourH, setFourH] = useState<BiasDir>(null)
  const [to, setTO] = useState<TOState>({ TWO: null, TDO: null, Session: null })

  const hasData = daily || sixH || fourH || to.TWO || to.TDO || to.Session
  const result = hasData ? computeResult(daily, sixH, fourH, to) : null

  function reset() {
    setDaily(null); setSixH(null); setFourH(null)
    setTO({ TWO: null, TDO: null, Session: null })
  }

  return (
    <div className="space-y-0">
      <div className="sec-title mt-4">تحيز الإطارات الزمنية</div>

      {/* Daily */}
      <div className="card-dark p-4 mb-2">
        <p className="text-[#8899BB] text-xs font-bold mb-3 tracking-wide">DAILY / 6H</p>
        <div className="flex gap-3">
          <BiasButton label="صعودي" sublabel="اتجاه صاعد" selected={daily === 'bullish'} direction="bullish" onClick={() => setDaily(daily === 'bullish' ? null : 'bullish')} />
          <BiasButton label="هبوطي" sublabel="اتجاه هابط" selected={daily === 'bearish'} direction="bearish" onClick={() => setDaily(daily === 'bearish' ? null : 'bearish')} />
        </div>
      </div>

      {/* 6H */}
      <div className="card-dark p-4 mb-2">
        <p className="text-[#8899BB] text-xs font-bold mb-3 tracking-wide">6H</p>
        <div className="flex gap-3">
          <BiasButton label="صعودي" sublabel="6 ساعات صاعد" selected={sixH === 'bullish'} direction="bullish" onClick={() => setSixH(sixH === 'bullish' ? null : 'bullish')} />
          <BiasButton label="هبوطي" sublabel="6 ساعات هابط" selected={sixH === 'bearish'} direction="bearish" onClick={() => setSixH(sixH === 'bearish' ? null : 'bearish')} />
        </div>
      </div>

      {/* 4H */}
      <div className="card-dark p-4 mb-2">
        <p className="text-[#8899BB] text-xs font-bold mb-3 tracking-wide">4H</p>
        <div className="flex gap-3">
          <BiasButton label="صعودي" sublabel="4 ساعات صاعد" selected={fourH === 'bullish'} direction="bullish" onClick={() => setFourH(fourH === 'bullish' ? null : 'bullish')} />
          <BiasButton label="هبوطي" sublabel="4 ساعات هابط" selected={fourH === 'bearish'} direction="bearish" onClick={() => setFourH(fourH === 'bearish' ? null : 'bearish')} />
        </div>
      </div>

      {/* True Opens */}
      <div className="sec-title">True Opens</div>
      <div className="grid grid-cols-3 gap-2">
        <TOCard label="TWO" value={to.TWO} onChange={(v) => setTO(p => ({ ...p, TWO: p.TWO === v ? null : v }))} />
        <TOCard label="TDO" value={to.TDO} onChange={(v) => setTO(p => ({ ...p, TDO: p.TDO === v ? null : v }))} />
        <TOCard label="Session" value={to.Session} onChange={(v) => setTO(p => ({ ...p, Session: p.Session === v ? null : v }))} />
      </div>

      {/* Result */}
      {result && (
        <div className={[
          'mt-4 p-5 rounded-2xl border text-center',
          result === 'BULLISH'
            ? 'bg-[rgba(29,185,84,0.1)] border-[rgba(29,185,84,0.4)]'
            : result === 'BEARISH'
            ? 'bg-[rgba(231,76,60,0.1)] border-[rgba(231,76,60,0.4)]'
            : 'bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.3)]',
        ].join(' ')}>
          <div className="text-3xl mb-2">
            {result === 'BULLISH' ? '📈' : result === 'BEARISH' ? '📉' : '⚖️'}
          </div>
          <p className={[
            'text-xl font-black tracking-wide',
            result === 'BULLISH' ? 'text-[#1DB954]' : result === 'BEARISH' ? 'text-[#E74C3C]' : 'text-[#D4AF37]',
          ].join(' ')}>
            {result === 'BULLISH' ? 'صعودي' : result === 'BEARISH' ? 'هبوطي' : 'محايد'}
          </p>
          <p className="text-[#4A5A7A] text-xs mt-1">
            {result === 'BULLISH' ? 'ابحث عن فرص الشراء فقط'
             : result === 'BEARISH' ? 'ابحث عن فرص البيع فقط'
             : 'لا توجه واضح — انتظر أو امتنع'}
          </p>
        </div>
      )}

      {/* Reset */}
      {hasData && (
        <button
          onClick={reset}
          className="w-full mt-3 py-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-transparent text-[#4A5A7A] text-sm hover:text-[#8899BB] transition-colors"
        >
          إعادة تعيين التحيز
        </button>
      )}
    </div>
  )
}
