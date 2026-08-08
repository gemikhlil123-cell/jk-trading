'use client'

import { formatJerusalemTime } from '@/lib/timezone'

interface CalendarEvent {
  date: string
  currency: string
  title: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  actual: string | null
  forecast: string | null
  previous: string | null
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function jerusalemDayKey(iso: string): string {
  // group by Jerusalem calendar day
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(new Date(iso))
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const wd = DAY_NAMES[wdMap[get('weekday')] ?? 0]
  const day = get('day')
  const mo = MONTH_NAMES[(parseInt(get('month'), 10) || 1) - 1]
  return `${wd} · ${day} ${mo}`
}

const IMPACT_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  HIGH:   { color: '#E74C3C', bg: 'rgba(231,76,60,0.08)',  border: 'rgba(231,76,60,0.3)',  label: 'تأثير عالٍ' },
  MEDIUM: { color: '#D4AF37', bg: 'rgba(212,175,55,0.06)', border: 'rgba(212,175,55,0.25)', label: 'متوسط' },
  LOW:    { color: '#8899BB', bg: 'rgba(136,153,187,0.06)', border: 'rgba(136,153,187,0.2)', label: 'منخفض' },
}

export function EconomicCalendarView({ events, source }: { events: CalendarEvent[]; source: 'live' | 'fallback' }) {
  if (events.length === 0) {
    return (
      <div className="card-vibrant" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#8899BB' }}>لا توجد أحداث عالية التأثير في الأيام القادمة.</p>
      </div>
    )
  }

  // group by Jerusalem day
  const groups: { key: string; iso: string; events: CalendarEvent[] }[] = []
  for (const e of events) {
    const key = jerusalemDayKey(e.date)
    let g = groups.find((x) => x.key === key)
    if (!g) {
      g = { key, iso: e.date, events: [] }
      groups.push(g)
    }
    g.events.push(e)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {source === 'fallback' && (
        <div style={{ fontSize: 11, color: '#C9A84C', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 8, padding: '8px 12px' }}>
          ⓘ يتم عرض الأحداث المتكررة المعروفة (تقريبية). للحصول على بيانات حيّة دقيقة، يلزم تفعيل مصدر التقويم.
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key} className="card-vibrant" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', marginBottom: 10 }}>{dayLabel(g.iso)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.events.map((e, i) => {
              const st = IMPACT_STYLE[e.impact] ?? IMPACT_STYLE.MEDIUM
              return (
                <div
                  key={`${e.title}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: st.bg, border: `1px solid ${st.border}`,
                    borderRadius: 9, padding: '9px 11px',
                  }}
                >
                  <span className="ltr-num" style={{ fontSize: 13, fontWeight: 800, color: '#C8D8EE', minWidth: 44 }}>
                    {formatJerusalemTime(e.date)}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: st.color, padding: '2px 7px', border: `1px solid ${st.border}`, borderRadius: 6 }}>
                    {e.currency}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#C8D8EE' }}>{e.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                </div>
              )
            })}
          </div>

          {/* expected/previous values when present */}
          {g.events.some((e) => e.forecast || e.previous || e.actual) && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.events.filter((e) => e.forecast || e.previous || e.actual).map((e, i) => (
                <div key={`v-${i}`} className="ltr-num" style={{ fontSize: 10, color: '#8899BB', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  {e.actual != null && <span>الفعلي: <b style={{ color: '#C8D8EE' }}>{e.actual}</b></span>}
                  {e.forecast != null && <span>المتوقع: {e.forecast}</span>}
                  {e.previous != null && <span>السابق: {e.previous}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <p style={{ fontSize: 10, color: '#4A5A7A', textAlign: 'center', marginTop: 4 }}>
        جميع الأوقات بتوقيت القدس (Asia/Jerusalem)
      </p>
    </div>
  )
}
