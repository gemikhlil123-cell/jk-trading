'use client'

import { useState } from 'react'
import type { DeepAggregate, Bucket, ConfluenceBucket, TextBucket } from '@/lib/deep-analysis-aggregator'
import type { ReasonTripleInsight } from '@/lib/strategy-analysis'

interface Props {
  initial: DeepAggregate
  triples: ReasonTripleInsight[]
  targetUserId: string
  isMentor: boolean
  studentName?: string | null
}

export function DeepAnalysisView({
  initial,
  triples,
  targetUserId,
  isMentor,
  studentName,
}: Props) {
  const [data, setData] = useState<DeepAggregate>(initial)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function reanalyze(mode: 'missing' | 'all') {
    setRunning(true)
    setMessage(null)
    try {
      const res = await fetch('/api/deep-analysis/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, mode, limit: 50 }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage(json.error || 'فشل التحليل')
      } else {
        setMessage(
          `✓ تم التحليل: ${json.analyzed} صفقة${json.errors > 0 ? `، ${json.errors} خطأ` : ''}${
            json.skipped > 0 ? `، ${json.skipped} تم تخطيها` : ''
          }`
        )
        // Refresh aggregate
        const aggRes = await fetch(
          `/api/deep-analysis/aggregate?targetUserId=${encodeURIComponent(targetUserId)}`
        )
        if (aggRes.ok) {
          const agg = (await aggRes.json()) as DeepAggregate
          setData(agg)
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'خطأ غير متوقع')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {studentName && (
        <div style={headerBoxStyle}>
          <span style={{ color: '#8899BB', fontSize: 11 }}>تعرض تحليل الطالب:</span>{' '}
          <b style={{ color: '#D4AF37' }}>{studentName}</b>
        </div>
      )}

      {/* Summary bar + re-analyze */}
      <div style={summaryBarStyle}>
        <div>
          <div style={{ color: '#D4AF37', fontSize: 13, fontWeight: 800 }}>
            📊 {data.totalAnalyzed} ملاحظة محلّلة
          </div>
          <div style={{ color: '#8899BB', fontSize: 10, marginTop: 2 }}>
            {data.totalWithPnl} منها تحتوي على P&L — معدل الدقة محسوب على هذه فقط.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => reanalyze('missing')}
            disabled={running}
            style={primaryBtnStyle(running)}
          >
            {running ? '⏳ ...' : '🧠 حلّل الجديد'}
          </button>
          <button
            onClick={() => reanalyze('all')}
            disabled={running}
            style={secondaryBtnStyle(running)}
          >
            ♻️ حلّل الكل (50)
          </button>
        </div>
      </div>

      {message && (
        <div style={messageBoxStyle(message.startsWith('✓'))}>{message}</div>
      )}

      {/* Languages */}
      {data.languages.length > 0 && (
        <InfoRow
          title="اللغات المكتشفة"
          items={data.languages.map((l) => ({
            label: langLabel(l.key),
            value: `${l.count}`,
          }))}
        />
      )}

      {/* Execution quality */}
      {data.executionQuality.length > 0 && (
        <Section title="جودة التنفيذ">
          {renderBuckets(data.executionQuality)}
        </Section>
      )}

      {/* Timeframes */}
      {data.timeframes.length > 0 && (
        <Section title="الفريمات الأكثر استخداماً">
          {renderBuckets(data.timeframes, { showWinRate: true })}
        </Section>
      )}

      {/* Confluences */}
      {data.confluences.length > 0 && (
        <Section title="الـ Confluences الأكثر تكراراً">
          {renderConfluences(data.confluences)}
        </Section>
      )}

      {/* SMT scopes */}
      {data.smtScopes.length > 0 && (
        <Section title="أنواع SMT التي تستخدمها">
          {renderBuckets(data.smtScopes, { showWinRate: true })}
        </Section>
      )}

      {/* Sessions */}
      {data.sessions.length > 0 && (
        <Section title="الجلسات الأكثر نشاطاً">
          {renderBuckets(data.sessions, { showWinRate: true })}
        </Section>
      )}

      {/* Specific times */}
      {data.specificTimes.length > 0 && (
        <Section title="الأوقات المفضلة للدخول">
          {renderBuckets(data.specificTimes)}
        </Section>
      )}

      {/* Instrument pairs */}
      {data.instrumentsCompared.length > 0 && (
        <Section title="أزواج الأدوات في SMT">
          {renderBuckets(data.instrumentsCompared, { showWinRate: true })}
        </Section>
      )}

      {/* Emotional states */}
      {data.emotionalStates.length > 0 && (
        <Section title="الحالات النفسية المتكررة">
          {renderBuckets(data.emotionalStates, { showWinRate: true })}
        </Section>
      )}

      {/* Triple combos */}
      {triples.length > 0 && (
        <Section title={`الثلاثيات الأكثر ربحية (≥10 صفقات) — ${triples.length}`}>
          {renderTriples(triples)}
        </Section>
      )}

      {/* Mistakes / strengths */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 10,
        }}
      >
        {data.mistakes.length > 0 && (
          <TextSection title="أخطاء متكررة" items={data.mistakes} tone="bad" />
        )}
        {data.strengths.length > 0 && (
          <TextSection title="نقاط قوة متكررة" items={data.strengths} tone="good" />
        )}
      </div>

      {!isMentor && (
        <div style={{ marginTop: 16, fontSize: 10, color: '#4A5A7A', textAlign: 'center' }}>
          التحليل العميق متاح لمشتركي PRO فقط — للمدرب صلاحية كاملة.
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      <div>{children}</div>
    </div>
  )
}

function InfoRow({
  title,
  items,
}: {
  title: string
  items: { label: string; value: string }[]
}) {
  return (
    <div style={{ ...sectionStyle, padding: 10 }}>
      <div style={{ fontSize: 10, color: '#8899BB', marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((i) => (
          <span
            key={i.label}
            style={{
              background: '#111D2E',
              border: '1px solid rgba(212,175,55,0.15)',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11,
              color: '#D4AF37',
            }}
          >
            {i.label} <span style={{ color: '#8899BB' }}>({i.value})</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function renderBuckets(buckets: Bucket[], opts: { showWinRate?: boolean } = {}) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {buckets.slice(0, 12).map((b) => (
        <BucketRow key={b.key} b={b} showWinRate={opts.showWinRate} />
      ))}
    </div>
  )
}

function BucketRow({ b, showWinRate }: { b: Bucket; showWinRate?: boolean }) {
  const pnlColor = b.totalPnl >= 0 ? '#1DB954' : '#E74C3C'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        gap: 8,
        background: '#111D2E',
        border: '1px solid rgba(212,175,55,0.10)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <span style={{ color: '#F5E6A3', fontWeight: 600 }}>{b.label}</span>
      <span style={{ color: '#8899BB', fontSize: 10 }}>{b.count}×</span>
      {showWinRate && b.wins + b.losses > 0 && (
        <span style={{ color: '#D4AF37', fontSize: 10 }}>{(b.winRate * 100).toFixed(0)}%</span>
      )}
      <span style={{ color: pnlColor, fontWeight: 700, fontSize: 11 }}>
        {b.totalPnl >= 0 ? '+' : ''}
        {b.totalPnl.toFixed(0)}$
      </span>
    </div>
  )
}

function renderConfluences(buckets: ConfluenceBucket[]) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {buckets.slice(0, 20).map((b) => (
        <BucketRow key={b.key} b={b} showWinRate />
      ))}
    </div>
  )
}

function renderTriples(triples: ReasonTripleInsight[]) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {triples.slice(0, 20).map((t) => {
        const pnlColor = t.totalPnl >= 0 ? '#1DB954' : '#E74C3C'
        return (
          <div
            key={t.names.join('|')}
            style={{
              background: '#111D2E',
              border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 10,
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              {t.names.map((n) => (
                <span
                  key={n}
                  style={{
                    background: 'rgba(212,175,55,0.12)',
                    color: '#D4AF37',
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                fontSize: 10,
                color: '#8899BB',
              }}
            >
              <span>
                إجمالي: <b style={{ color: '#F5E6A3' }}>{t.trades}</b>
              </span>
              <span>
                نسبة النجاح: <b style={{ color: '#D4AF37' }}>{(t.winRate * 100).toFixed(0)}%</b>
              </span>
              <span>
                P&L: <b style={{ color: pnlColor }}>{t.totalPnl.toFixed(0)}$</b>
              </span>
              <span>
                التوقع: <b style={{ color: '#F5E6A3' }}>{t.expectancy.toFixed(1)}</b>
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: '#4A5A7A',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                الشهر: <b style={{ color: '#8899BB' }}>{t.thisMonth.trades}</b> / نجاح{' '}
                <b style={{ color: '#D4AF37' }}>{(t.thisMonth.winRate * 100).toFixed(0)}%</b>
              </span>
              <span>
                الأسبوع: <b style={{ color: '#8899BB' }}>{t.thisWeek.trades}</b> / نجاح{' '}
                <b style={{ color: '#D4AF37' }}>{(t.thisWeek.winRate * 100).toFixed(0)}%</b>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TextSection({
  title,
  items,
  tone,
}: {
  title: string
  items: TextBucket[]
  tone: 'good' | 'bad'
}) {
  const color = tone === 'good' ? '#1DB954' : '#E74C3C'
  return (
    <div style={sectionStyle}>
      <div style={{ ...sectionTitleStyle, color }}>{title}</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {items.slice(0, 10).map((t) => (
          <div
            key={t.text}
            style={{
              background: '#0A192F',
              border: `1px solid ${tone === 'good' ? 'rgba(29,185,84,0.15)' : 'rgba(231,76,60,0.15)'}`,
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 11,
              color: '#F5E6A3',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <span style={{ flex: 1 }}>{t.text}</span>
            <span style={{ color: '#8899BB', fontSize: 10, whiteSpace: 'nowrap' }}>{t.count}×</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const headerBoxStyle: React.CSSProperties = {
  background: '#111D2E',
  border: '1px solid rgba(212,175,55,0.15)',
  borderRadius: 8,
  padding: 8,
  marginBottom: 10,
  fontSize: 11,
}

const summaryBarStyle: React.CSSProperties = {
  background: '#111D2E',
  border: '1px solid rgba(212,175,55,0.20)',
  borderRadius: 12,
  padding: 10,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
  flexWrap: 'wrap',
}

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? 'rgba(212,175,55,0.2)' : 'linear-gradient(90deg,#A07D1C,#D4AF37)',
  color: '#0A192F',
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 800,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'Cairo, sans-serif',
})

const secondaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'transparent',
  color: '#D4AF37',
  border: '1px solid rgba(212,175,55,0.3)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'Cairo, sans-serif',
})

const messageBoxStyle = (success: boolean): React.CSSProperties => ({
  background: success ? 'rgba(29,185,84,0.12)' : 'rgba(231,76,60,0.12)',
  border: `1px solid ${success ? 'rgba(29,185,84,0.3)' : 'rgba(231,76,60,0.3)'}`,
  color: success ? '#1DB954' : '#E74C3C',
  fontSize: 11,
  padding: '6px 10px',
  borderRadius: 8,
  marginBottom: 10,
})

const sectionStyle: React.CSSProperties = {
  background: '#0F1A2B',
  border: '1px solid rgba(212,175,55,0.10)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 10,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: '#D4AF37',
  marginBottom: 8,
}

function langLabel(key: string): string {
  switch (key) {
    case 'ar':
      return 'عربي'
    case 'he':
      return 'عبري'
    case 'en':
      return 'إنجليزي'
    case 'mixed':
      return 'مختلط'
    default:
      return key
  }
}
