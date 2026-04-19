'use client'

import type { NotesAnalysis, NotesTip } from '@/lib/notes-analysis'

const SEV_STYLES: Record<
  NotesTip['severity'],
  { bg: string; border: string; fg: string }
> = {
  CRITICAL: { bg: 'rgba(231,76,60,0.10)', border: '#E74C3C', fg: '#E74C3C' },
  WARNING: { bg: 'rgba(255,180,70,0.08)', border: '#FFB446', fg: '#FFB446' },
  SUCCESS: { bg: 'rgba(29,185,84,0.08)', border: '#1DB954', fg: '#1DB954' },
  INFO: { bg: '#111D2E', border: 'rgba(212,175,55,0.18)', fg: '#C9A84C' },
}

interface Props {
  notes: NotesAnalysis
  tips: NotesTip[]
}

export function NotesInsights({ notes, tips }: Props) {
  if (notes.totalNotes === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 className="sec-title">🧠 تحليل ملاحظاتك ({notes.totalNotes} ملاحظة)</h3>

      {/* Dynamic tips from notes */}
      {tips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {tips.map((t) => {
            const s = SEV_STYLES[t.severity]
            return (
              <div
                key={t.id}
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
                    من ملاحظاتك
                  </span>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#C8D8EE', marginBottom: 4 }}>
                  {t.title}
                </h4>
                <p style={{ fontSize: 12, color: '#8899BB', lineHeight: 1.7 }}>{t.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sentiment summary */}
      {(notes.sentimentInWins.length > 0 || notes.sentimentInLosses.length > 0) && (
        <div
          className="card-dark"
          style={{
            padding: 14,
            marginBottom: 10,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: '#1DB954', fontWeight: 700, marginBottom: 8 }}>
              ✓ مشاعر في الصفقات الرابحة
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {notes.sentimentInWins.length === 0 && (
                <span style={{ fontSize: 11, color: '#4A5A7A' }}>—</span>
              )}
              {notes.sentimentInWins.slice(0, 4).map((s) => (
                <div
                  key={s.key}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}
                >
                  <span style={{ color: s.tone === 'positive' ? '#1DB954' : '#8899BB' }}>
                    {s.label}
                  </span>
                  <span style={{ color: '#8899BB' }}>{s.count}×</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#E74C3C', fontWeight: 700, marginBottom: 8 }}>
              ✕ مشاعر في الصفقات الخاسرة
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {notes.sentimentInLosses.length === 0 && (
                <span style={{ fontSize: 11, color: '#4A5A7A' }}>—</span>
              )}
              {notes.sentimentInLosses.slice(0, 4).map((s) => (
                <div
                  key={s.key}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}
                >
                  <span style={{ color: s.tone === 'negative' ? '#E74C3C' : '#8899BB' }}>
                    {s.label}
                  </span>
                  <span style={{ color: '#8899BB' }}>{s.count}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {(notes.winKeywords.length > 0 || notes.lossKeywords.length > 0) && (
        <div
          className="card-dark"
          style={{
            padding: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: '#1DB954', fontWeight: 700, marginBottom: 8 }}>
              كلمات في الرابح
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {notes.winKeywords.length === 0 && (
                <span style={{ fontSize: 11, color: '#4A5A7A' }}>—</span>
              )}
              {notes.winKeywords.map((k) => (
                <span
                  key={k.word}
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: 'rgba(29,185,84,0.12)',
                    color: '#1DB954',
                  }}
                >
                  {k.word} · {k.count}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#E74C3C', fontWeight: 700, marginBottom: 8 }}>
              كلمات في الخاسر
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {notes.lossKeywords.length === 0 && (
                <span style={{ fontSize: 11, color: '#4A5A7A' }}>—</span>
              )}
              {notes.lossKeywords.map((k) => (
                <span
                  key={k.word}
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: 'rgba(231,76,60,0.12)',
                    color: '#E74C3C',
                  }}
                >
                  {k.word} · {k.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
