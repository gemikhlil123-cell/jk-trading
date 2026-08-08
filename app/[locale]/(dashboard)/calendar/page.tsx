import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUpcomingEvents } from '@/lib/economic-calendar'
import { EconomicCalendarView } from '@/components/calendar/economic-calendar-view'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const { events, source } = await getUpcomingEvents(14)

  return (
    <div style={{ padding: '16px 16px 100px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>التقويم الاقتصادي</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          الأخبار عالية التأثير تحرّك السوق. تجنّب الدخول قبل صدورها بدقائق وراقب التقلّب.
        </p>
      </div>
      <EconomicCalendarView events={events} source={source} />
    </div>
  )
}
