/**
 * Headline figures with the small visual TradeZella pairs each one with: a
 * half-gauge for win rates, a ring for profit factor, and a split bar for the
 * average win against the average loss.
 */
import type { ReactNode } from 'react'

const JADE = '#4E9E7A'
const OXBLOOD = '#BB5B5B'
const TRACK = 'rgba(187,91,91,0.42)'

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo))

export function KpiCard({
  label,
  value,
  tone = 'neutral',
  sub,
  visual,
  className = '',
}: {
  label: string
  value: string
  tone?: 'win' | 'loss' | 'neutral'
  sub?: ReactNode
  visual?: ReactNode
  className?: string
}) {
  const color = tone === 'win' ? JADE : tone === 'loss' ? OXBLOOD : '#EDEBE4'
  return (
    <div className={`dash-panel flex min-h-[96px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 ${className}`}>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[#8899BB]">{label}</p>
        <p className="mt-2 text-[24px] font-medium leading-none">
          <span className="num" dir="ltr" style={{ color }}>{value}</span>
        </p>
        {sub != null && <div className="mt-2 text-[10.5px] text-[#6B7890]">{sub}</div>}
      </div>
      {visual != null && <div className="shrink-0">{visual}</div>}
    </div>
  )
}

/** Half-circle gauge, 0–100: green is the winning share, red the rest. */
export function SemiGauge({ value, wins, losses }: { value: number; wins?: number; losses?: number }) {
  const v = clamp(value, 0, 100)
  const arc = 'M 6 36 A 30 30 0 0 1 66 36'
  return (
    <div className="flex w-[72px] flex-col items-center" aria-hidden="true">
      <svg width="72" height="40" viewBox="0 0 72 40">
        <path d={arc} fill="none" stroke={TRACK} strokeWidth="7" strokeLinecap="round" />
        {v > 0 && (
          <path d={arc} fill="none" stroke={JADE} strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} />
        )}
      </svg>
      {(wins != null || losses != null) && (
        <div className="-mt-0.5 flex w-full justify-between px-0.5 text-[9.5px]" dir="ltr">
          <span className="num" style={{ color: JADE }}>{wins ?? 0}</span>
          <span className="num" style={{ color: OXBLOOD }}>{losses ?? 0}</span>
        </div>
      )}
    </div>
  )
}

/** Ring: gross profit's share of gross profit plus gross loss. */
export function Ring({ share }: { share: number }) {
  const v = clamp(share, 0, 1) * 100
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
      <circle cx="27" cy="27" r="21" fill="none" stroke={TRACK} strokeWidth="6" />
      {v > 0 && (
        <circle cx="27" cy="27" r="21" fill="none" stroke={JADE} strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 27 27)" />
      )}
    </svg>
  )
}

/** Average win against average loss as one split bar. */
export function RatioBar({ win, loss, winText, lossText }: { win: number; loss: number; winText: string; lossText: string }) {
  const a = Math.max(0, Number.isFinite(win) ? win : 0)
  const b = Math.abs(Math.min(0, Number.isFinite(loss) ? loss : 0))
  const winPct = a + b > 0 ? (a / (a + b)) * 100 : 50
  return (
    <div className="w-[112px]" aria-hidden="true">
      <div className="flex h-[6px] overflow-hidden rounded-full" dir="ltr" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <span style={{ width: `${winPct}%`, background: JADE }} />
        <span style={{ width: `${100 - winPct}%`, background: OXBLOOD }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[9.5px]" dir="ltr">
        <span className="num" style={{ color: JADE }}>{winText}</span>
        <span className="num" style={{ color: OXBLOOD }}>{lossText}</span>
      </div>
    </div>
  )
}
