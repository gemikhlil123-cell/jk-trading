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
          background: 'rgba(194,155,74,0.08)',
          border: '1px solid rgba(194,155,74,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>🕐</span>
        <div>
          <p style={{ fontSize: 11, color: '#C29B4A', fontWeight: 700 }}>
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
    ? 'rgba(78,158,122,0.10)'
    : isWeak
    ? 'rgba(187,91,91,0.10)'
    : 'rgba(194,155,74,0.08)'
  const border = isStrong ? '#4E9E7A' : isWeak ? '#BB5B5B' : '#C29B4A'
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
            <p style={{ fontSize: 10, color: '#4E9E7A', marginTop: 4 }}>
              ✅ أقوى سبب لك في هذه الجلسة: {bestReason.label} (
              {(bestReason.winRate * 100).toFixed(0)}%)
            </p>
          )}
          {isWeak && (
            <p style={{ fontSize: 10, color: '#BB5B5B', marginTop: 4 }}>
              ⚠️ هذه جلستك الضعيفة — تداول بحذر شديد أو تجنّبها.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
