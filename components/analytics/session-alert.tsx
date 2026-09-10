import { Clock, TrendingDown, TrendingUp } from 'lucide-react'
import { computeKillzone } from '@/lib/autoTag'
import { getDeepAnalysis, getKillzoneLabel } from '@/lib/deep-analysis'
import { DEFAULT_PNL_UNIT, formatPnl, unitLabel } from '@/lib/pnl-format'

interface Props {
  userId: string
}

const TONES = {
  strong: { hue: '78,158,122', ink: '#6FBF98', Icon: TrendingUp },
  weak: { hue: '187,91,91', ink: '#D07A7A', Icon: TrendingDown },
  neutral: { hue: '194,155,74', ink: '#C29B4A', Icon: Clock },
} as const

/** How the trader has historically done in the session that is open right now. */
export async function SessionAlert({ userId }: Props) {
  const currentKillzone = computeKillzone(new Date())
  const analysis = await getDeepAnalysis(userId, { isBacktest: false, killzone: currentKillzone })
  const label = getKillzoneLabel(currentKillzone)

  const enough = analysis.totalTrades >= 3
  const kind: keyof typeof TONES = !enough
    ? 'neutral'
    : analysis.winRate >= 0.65
      ? 'strong'
      : analysis.winRate <= 0.4
        ? 'weak'
        : 'neutral'
  const tone = TONES[kind]
  const Icon = tone.Icon
  const bestReason = analysis.winningReasons[0]

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ background: `rgba(${tone.hue},0.07)`, border: `1px solid rgba(${tone.hue},0.22)` }}
    >
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `rgba(${tone.hue},0.12)`, color: tone.ink }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold" style={{ color: tone.ink }}>
          الجلسة الحالية: {label}
        </p>
        {!enough ? (
          <p className="mt-1 text-[11.5px] text-[#8899BB]">
            لا توجد بيانات كافية بعد (<span className="num" dir="ltr">{analysis.totalTrades}</span> صفقة).
          </p>
        ) : (
          <>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#C8D8EE]">
              تاريخياً:{' '}
              <span className="num font-semibold" dir="ltr" style={{ color: tone.ink }}>
                {(analysis.winRate * 100).toFixed(0)}%
              </span>{' '}
              نجاح من <span className="num" dir="ltr">{analysis.totalTrades}</span> صفقة، صافي{' '}
              <span className="num" dir="ltr">{formatPnl(analysis.totalPnl, DEFAULT_PNL_UNIT)}</span> {unitLabel(DEFAULT_PNL_UNIT)}.
            </p>
            {kind === 'strong' && bestReason && (
              <p className="mt-1 text-[11px]" style={{ color: tone.ink }}>
                أقوى سبب لك في هذه الجلسة: {bestReason.label} (
                <span className="num" dir="ltr">{(bestReason.winRate * 100).toFixed(0)}%</span>)
              </p>
            )}
            {kind === 'weak' && (
              <p className="mt-1 text-[11px]" style={{ color: tone.ink }}>
                هذه جلستك الضعيفة — تداول بحذر شديد أو تجنّبها.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
