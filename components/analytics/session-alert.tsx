import { computeKillzone } from '@/lib/autoTag'
import { getDeepAnalysis, getKillzoneLabel } from '@/lib/deep-analysis'

interface Props {
  userId: string
}

export async function SessionAlert({ userId }: Props) {
  const now = new Date()
  const currentKillzone = computeKillzone(now)

  // Get historical performance for current killzone
  const analysis = await getDeepAnalysis(userId, {
    isBacktest: false,
    killzone: currentKillzone,
  })

  if (analysis.totalTrades < 3) {
    return (
      <div
        style={{
          padding: '12px 14px',
          margin: '14px 14px 0',
          borderRadius: 14,
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>🕐</span>
        <div>
          <p style={{ fontSize: 11, color: '#C9A84C', fontWeight: 700 }}>
            الجلسة الحالية: {getKillzoneLabel(currentKillzone)}
          </p>
          <p style={{ fontSize: 10, color: '#8899BB', marginTop: 2 }}>
            لا توجد بيانات كافية بعد ({analysis.totalTrades} صفقة).
          </p>
        </div>
      </div>
    )
  }

  // Determine tone
  const isStrong = analysis.winRate >= 0.65
  const isWeak = analysis.winRate <= 0.4

  const bg = isStrong
    ? 'rgba(29,185,84,0.10)'
    : isWeak
    ? 'rgba(231,76,60,0.10)'
    : 'rgba(201,168,76,0.08)'
  const border = isStrong ? '#1DB954' : isWeak ? '#E74C3C' : '#C9A84C'
  const icon = isStrong ? '🔥' : isWeak ? '⚠️' : '🕐'

  const bestReason = analysis.winningReasons[0]

  return (
    <div
      style={{
        padding: '12px 14px',
        margin: '14px 14px 0',
        borderRadius: 14,
        background: bg,
        border: `1px solid ${border}`,
        borderRight: `3px solid ${border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: border, fontWeight: 700 }}>
            {getKillzoneLabel(currentKillzone)}
          </p>
          <p style={{ fontSize: 11, color: '#C8D8EE', marginTop: 4, lineHeight: 1.6 }}>
            تاريخياً:{' '}
            <strong style={{ color: border }}>
              {(analysis.winRate * 100).toFixed(0)}% نجاح
            </strong>{' '}
            من {analysis.totalTrades} صفقة ({analysis.totalPnl >= 0 ? '+' : ''}
            {analysis.totalPnl.toFixed(0)} نقطة صافي).
          </p>
          {isStrong && bestReason && (
            <p style={{ fontSize: 10, color: '#1DB954', marginTop: 4 }}>
              ✅ أقوى سبب لك في هذه الجلسة: {bestReason.label} (
              {(bestReason.winRate * 100).toFixed(0)}%)
            </p>
          )}
          {isWeak && (
            <p style={{ fontSize: 10, color: '#E74C3C', marginTop: 4 }}>
              ⚠️ هذه جلستك الضعيفة — تداول بحذر شديد أو تجنّبها.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
