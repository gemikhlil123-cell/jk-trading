'use client'

import { MindsetTip } from '@/lib/mindset'

interface Props {
  tips: MindsetTip[]
  checklist: string[]
}

const SEVERITY_STYLES: Record<
  MindsetTip['severity'],
  { bg: string; border: string; fg: string }
> = {
  CRITICAL: { bg: 'rgba(231,76,60,0.10)', border: '#E74C3C', fg: '#E74C3C' },
  WARNING: { bg: 'rgba(255,180,70,0.08)', border: '#FFB446', fg: '#FFB446' },
  SUCCESS: { bg: 'rgba(29,185,84,0.08)', border: '#1DB954', fg: '#1DB954' },
  INFO: { bg: '#111D2E', border: 'rgba(212,175,55,0.18)', fg: '#C9A84C' },
}

const CATEGORY_LABELS: Record<MindsetTip['category'], string> = {
  RISK: 'إدارة المخاطر',
  PSYCHOLOGY: 'علم النفس',
  DISCIPLINE: 'الانضباط',
  RECOVERY: 'التعافي',
}

function TipCard({ tip }: { tip: MindsetTip }) {
  const s = SEVERITY_STYLES[tip.severity]
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 16,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRight: `3px solid ${s.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 99,
            background: s.bg,
            color: s.fg,
            border: `1px solid ${s.border}`,
          }}
        >
          {CATEGORY_LABELS[tip.category]}
        </span>
        {tip.source === 'DYNAMIC' && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              background: 'rgba(212,175,55,0.14)',
              color: '#C9A84C',
            }}
          >
            مخصص لك
          </span>
        )}
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#C8D8EE', marginBottom: 4 }}>
        {tip.title}
      </h4>
      <p style={{ fontSize: 12, color: '#8899BB', lineHeight: 1.7 }}>{tip.body}</p>
    </div>
  )
}

export function MindsetView({ tips, checklist }: Props) {
  const dynamicTips = tips.filter((t) => t.source === 'DYNAMIC')
  const staticTips = tips.filter((t) => t.source === 'STATIC')

  return (
    <div>
      {dynamicTips.length > 0 && (
        <div style={{ padding: '14px 14px' }}>
          <h3 className="sec-title">✨ ملاحظات خاصة بك (من بياناتك)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dynamicTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        </div>
      )}

      {/* Pre-trade checklist */}
      <div style={{ padding: '0 14px 14px' }}>
        <h3 className="sec-title">📋 قائمة ما قبل الدخول</h3>
        <div className="card-dark" style={{ padding: '12px 14px' }}>
          {checklist.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: '#C8D8EE',
                padding: '8px 0',
                borderBottom: i < checklist.length - 1 ? '1px solid rgba(212,175,55,0.08)' : 'none',
                lineHeight: 1.6,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Static rules grouped by category */}
      {(['RISK', 'PSYCHOLOGY', 'DISCIPLINE', 'RECOVERY'] as const).map((cat) => {
        const catTips = staticTips.filter((t) => t.category === cat)
        if (catTips.length === 0) return null
        return (
          <div key={cat} style={{ padding: '0 14px 14px' }}>
            <h3 className="sec-title">{CATEGORY_LABELS[cat]}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
