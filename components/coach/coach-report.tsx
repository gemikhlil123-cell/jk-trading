import type { CoachReport } from '@/lib/coach'

function money(n: number): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(194,155,74,0.12)',
  borderRadius: 14,
  padding: 16,
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(194,155,74,0.1)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
      <div className="ltr-num" style={{ color, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#8899BB', fontSize: 10, marginTop: 5 }}>{label}</div>
    </div>
  )
}

function RuleList({ title, items, color, bg, icon }: { title: string; items: string[]; color: string; bg: string; icon: string }) {
  if (items.length === 0) return null
  return (
    <div style={{ ...card, background: bg, border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 13, fontWeight: 900, color, marginBottom: 10 }}>{icon} {title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color, fontSize: 12, flexShrink: 0, marginTop: 2 }}>•</span>
            <p style={{ fontSize: 12, color: '#C8D8EE', margin: 0, lineHeight: 1.6 }}>{t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CoachReportView({ report, name }: { report: CoachReport; name?: string }) {
  if (!report.hasEnoughData) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 28 }}>
        <p style={{ fontSize: 13, color: '#8899BB' }}>
          نحتاج على الأقل 8 صفقات مغلقة لبناء تقرير المدرّب. سجّل صفقاتك واستمر — كل ما زادت البيانات، دقّت التوصيات.
        </p>
        <p style={{ fontSize: 11, color: '#4A5A7A', marginTop: 6 }}>الصفقات الحالية: {report.totalTrades}</p>
      </div>
    )
  }

  const o = report.overall
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overall */}
      <div className="card-vibrant anim-fade-up" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#C29B4A', marginBottom: 12 }}>
          🧭 تقرير المدرّب{name ? ` — ${name}` : ''} <span style={{ color: '#4A5A7A', fontWeight: 600 }}>· {report.totalTrades} صفقة</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <Stat label="نسبة الفوز" value={`${o.winRate.toFixed(0)}%`} color={o.winRate >= 50 ? '#4E9E7A' : '#BB5B5B'} />
          <Stat label="الربح الكلي" value={money(o.totalPnl)} color={o.totalPnl >= 0 ? '#4E9E7A' : '#BB5B5B'} />
          <Stat label="عامل الربح" value={o.profitFactor >= 999 ? '∞' : o.profitFactor.toFixed(2)} color="#C29B4A" />
          <Stat label="متوسط الربح" value={money(o.avgWin)} color="#4E9E7A" />
          <Stat label="متوسط الخسارة" value={money(o.avgLoss)} color="#BB5B5B" />
          <Stat label="متوسط R" value={o.avgR != null ? o.avgR.toFixed(2) : '—'} color="#C29B4A" />
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#8899BB', textAlign: 'center' }}>
          التوقّع الرياضي لكل صفقة: <b className="ltr-num" style={{ color: o.expectancy >= 0 ? '#4E9E7A' : '#BB5B5B' }}>{money(o.expectancy)}</b>
        </div>
      </div>

      {/* Winning combo checklist */}
      {report.checklist.length > 0 && (
        <div className="card-vibrant" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#C29B4A', marginBottom: 6 }}>🎯 قائمة "متى في صفقة"</div>
          <p style={{ fontSize: 11, color: '#8899BB', marginBottom: 12, lineHeight: 1.6 }}>
            هاي أقوى تركيبة عندك حسب أرقامك. لو كل الشروط ✔ = في صفقة. لو ناقص شرط أساسي = ما في صفقة، اقعد على إيدك.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.checklist.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(78,158,122,0.06)', border: '1px solid rgba(78,158,122,0.18)', borderRadius: 9, padding: '9px 11px' }}>
                <span style={{ color: '#4E9E7A', fontSize: 14, fontWeight: 900 }}>✓</span>
                <span style={{ fontSize: 12, color: '#C8D8EE', fontWeight: 600 }}>{c}</span>
              </div>
            ))}
          </div>
          {report.winningCombo.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#8899BB' }}>
              الكومبو المتكرّر بأكبر أرباحك: <b style={{ color: '#C29B4A' }}>{report.winningCombo.join(' + ')}</b>
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      <RuleList title="حافظ على هذا (نقاط قوّتك)" items={report.rules.keep} color="#4E9E7A" bg="rgba(78,158,122,0.05)" icon="💪" />
      <RuleList title="طوّر هذا" items={report.rules.develop} color="#C29B4A" bg="rgba(194,155,74,0.05)" icon="📈" />
      <RuleList title="أوقف هذا فوراً" items={report.rules.stop} color="#BB5B5B" bg="rgba(187,91,91,0.05)" icon="🚫" />

      {/* Best times */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#C29B4A', marginBottom: 12 }}>⏰ أفضل أوقاتك (بتوقيت القدس)</div>
        {report.bestHours.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.bestHours.map((h) => (
              <div key={h.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="ltr-num" style={{ fontSize: 13, fontWeight: 800, color: '#C8D8EE', minWidth: 52 }}>{h.label}</span>
                <span style={{ fontSize: 10, color: '#8899BB' }}>{h.n} صفقة</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: h.winRate >= 50 ? '#4E9E7A' : '#BB5B5B' }}>{h.winRate.toFixed(0)}%</span>
                <span className="ltr-num" style={{ fontSize: 11, fontWeight: 700, color: h.pnl >= 0 ? '#4E9E7A' : '#BB5B5B' }}>{money(h.pnl)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 11, color: '#8899BB' }}>لسا ما في نافذة زمنية واضحة — بدنا بيانات أكتر.</p>
        )}
        {report.bestDays.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#8899BB' }}>
            أفضل أيامك: <b style={{ color: '#C8D8EE' }}>{report.bestDays.filter((d) => d.winRate >= 50).map((d) => d.label).join('، ') || report.bestDays[0].label}</b>
          </div>
        )}
      </div>

      {/* Psychology flags */}
      {report.psychFlags.length > 0 && (
        <div style={{ ...card, background: 'rgba(187,91,91,0.05)', border: '1px solid rgba(187,91,91,0.2)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#BB5B5B', marginBottom: 10 }}>🧠 أعلام نفسية</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.psychFlags.map((e) => (
              <div key={e.state} style={{ fontSize: 12, color: '#C8D8EE' }}>
                لما حالتك <b style={{ color: '#BB5B5B' }}>{e.state}</b>: نسبة فوز {e.winRate.toFixed(0)}% ({e.n} صفقة، {money(e.pnl)}) — انتبه.
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
