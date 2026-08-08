import Link from 'next/link'
import { formatJerusalemTime } from '@/lib/timezone'

interface CalendarEvent {
  date: string
  currency: string
  title: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
}

/** Compact dashboard widget — shows today's high-impact events (Jerusalem time). */
export function CalendarWidget({ events, locale }: { events: CalendarEvent[]; locale: string }) {
  if (events.length === 0) return null

  return (
    <div className="card-vibrant anim-fade-up" style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#D4AF37' }}>📅 أخبار اليوم عالية التأثير</span>
        <Link href={`/${locale}/calendar`} style={{ fontSize: 11, color: '#8899BB', textDecoration: 'none' }}>
          التقويم ←
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((e, i) => (
          <div key={`${e.title}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ltr-num" style={{ fontSize: 13, fontWeight: 800, color: '#E74C3C', minWidth: 44 }}>
              {formatJerusalemTime(e.date)}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#E74C3C', padding: '2px 7px', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 6 }}>
              {e.currency}
            </span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#C8D8EE' }}>{e.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
