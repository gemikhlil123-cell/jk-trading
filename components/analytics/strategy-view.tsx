'use client'

import { useState } from 'react'
import { GeneratedStrategy, StrategyRule, ConfidenceLevel } from '@/lib/strategy'

interface Props {
  live: GeneratedStrategy
  backtest: GeneratedStrategy
}

type Mode = 'LIVE' | 'BACKTEST'

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { bg: string; fg: string; label: string }> = {
  HIGH: { bg: 'rgba(29,185,84,0.18)', fg: '#1DB954', label: 'ثقة عالية' },
  MEDIUM: { bg: 'rgba(201,168,76,0.18)', fg: '#C9A84C', label: 'ثقة متوسطة' },
  LOW: { bg: 'rgba(255,130,60,0.18)', fg: '#FF823C', label: 'ثقة منخفضة' },
  NONE: { bg: 'rgba(74,90,122,0.18)', fg: '#8899BB', label: 'عيّنة صغيرة جداً' },
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const s = CONFIDENCE_STYLES[level]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 99,
        background: s.bg,
        color: s.fg,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  )
}

function RuleCard({ rule, accent }: { rule: StrategyRule; accent: string }) {
  return (
    <div
      className="card-dark"
      style={{
        padding: '12px 14px',
        borderRight: `3px solid ${accent}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#C8D8EE', marginBottom: 4 }}>
            {rule.title}
          </h4>
          <p style={{ fontSize: 11, color: '#8899BB', lineHeight: 1.6 }}>{rule.description}</p>
        </div>
        <ConfidenceBadge level={rule.confidence} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#4A5A7A', marginTop: 8 }}>
        <span>العيّنة: {rule.sample}</span>
        <span>النجاح: {(rule.winRate * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

export function StrategyView({ live, backtest }: Props) {
  const [mode, setMode] = useState<Mode>('LIVE')
  const data = mode === 'LIVE' ? live : backtest

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode('LIVE')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background: mode === 'LIVE' ? 'rgba(212,175,55,0.18)' : '#162035',
              border:
                mode === 'LIVE'
                  ? '1px solid rgba(212,175,55,0.5)'
                  : '1px solid rgba(212,175,55,0.14)',
              color: mode === 'LIVE' ? '#D4AF37' : '#8899BB',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            من صفقاتك الحقيقية
          </button>
          <button
            onClick={() => setMode('BACKTEST')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 12,
              background:
                mode === 'BACKTEST' ? 'rgba(212,175,55,0.18)' : '#162035',
              border:
                mode === 'BACKTEST'
                  ? '1px solid rgba(212,175,55,0.5)'
                  : '1px solid rgba(212,175,55,0.14)',
              color: mode === 'BACKTEST' ? '#D4AF37' : '#8899BB',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            من الباك تست
          </button>
        </div>
      </div>

      {/* Overview */}
      <div style={{ padding: 14 }}>
        <div
          className="card-gold"
          style={{
            padding: '16px 16px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.03))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>⚔️</span>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#D4AF37' }}>
              استراتيجيتك المخصصة
            </h2>
            <ConfidenceBadge level={data.confidence} />
          </div>
          <p style={{ fontSize: 12, color: '#C8D8EE', lineHeight: 1.8 }}>{data.overview}</p>
        </div>
      </div>

      {/* Red Flags */}
      {data.redFlags.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">⚠️ تحذيرات</h3>
          <div className="card-dark" style={{ padding: '12px 14px', borderRight: '3px solid #E74C3C' }}>
            {data.redFlags.map((flag, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: '#C8D8EE',
                  padding: '6px 0',
                  borderBottom: i < data.redFlags.length - 1 ? '1px solid rgba(231,76,60,0.15)' : 'none',
                }}
              >
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAKE rules */}
      {data.rules.take.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">✅ قواعد الدخول (ادخل عندما...)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.rules.take.map((rule, i) => (
              <RuleCard key={i} rule={rule} accent="#1DB954" />
            ))}
          </div>
        </div>
      )}

      {/* AVOID rules */}
      {data.rules.avoid.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">⛔ قواعد التجنّب (لا تدخل عندما...)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.rules.avoid.map((rule, i) => (
              <RuleCard key={i} rule={rule} accent="#E74C3C" />
            ))}
          </div>
        </div>
      )}

      {/* OBSERVE rules */}
      {data.rules.observe.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">👁️ للمراقبة (نتائج واعدة لكن عيّنة صغيرة)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.rules.observe.map((rule, i) => (
              <RuleCard key={i} rule={rule} accent="#C9A84C" />
            ))}
          </div>
        </div>
      )}

      {/* Position sizing */}
      {data.positionSizing.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">💰 إدارة الحجم</h3>
          <div className="card-dark" style={{ padding: '12px 14px' }}>
            {data.positionSizing.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: '#C8D8EE',
                  padding: '6px 0',
                  borderBottom: i < data.positionSizing.length - 1 ? '1px solid rgba(212,175,55,0.08)' : 'none',
                  lineHeight: 1.6,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session plan */}
      {data.sessionPlan.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <h3 className="sec-title">📅 خطة الجلسات</h3>
          <div className="card-dark" style={{ padding: '12px 14px' }}>
            {data.sessionPlan.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: '#C8D8EE',
                  padding: '6px 0',
                  borderBottom: i < data.sessionPlan.length - 1 ? '1px solid rgba(212,175,55,0.08)' : 'none',
                  lineHeight: 1.6,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalTrades === 0 && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#8899BB', fontSize: 14 }}>
            لا توجد {mode === 'LIVE' ? 'صفقات حقيقية' : 'صفقات باك تست'} بعد.
          </p>
          <p style={{ color: '#4A5A7A', fontSize: 12, marginTop: 8 }}>
            سجّل على الأقل 10 صفقات لتحصل على استراتيجية مبنية على بياناتك.
          </p>
        </div>
      )}
    </div>
  )
}
