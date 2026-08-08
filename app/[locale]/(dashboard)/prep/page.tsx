import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PrepLink {
  href: string
  title: string
  desc: string
  icon: React.ReactNode
}

export default async function PrepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const links: PrepLink[] = [
    {
      href: `/${locale}/plan`,
      title: 'خطة التداول',
      desc: 'الجلسات والأدوات المسموحة، حدود المخاطرة، وقوانينك الخاصة.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M9 13h6M9 17h6" />
        </svg>
      ),
    },
    {
      href: `/${locale}/checklist`,
      title: 'قائمة التحقق قبل الدخول',
      desc: 'راجع شروط الدخول وتأكّد من التزامك قبل كل صفقة.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      href: `/${locale}/calendar`,
      title: 'التقويم الاقتصادي',
      desc: 'الأخبار عالية التأثير لتجنّب التداول وقت التقلّب الحاد.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: `/${locale}/goals`,
      title: 'الأهداف',
      desc: 'حدّد أهدافك وتابع تقدّمك نحو الربحية المستدامة.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      href: `/${locale}/coach`,
      title: 'المدرّب',
      desc: 'تحليل آلي لأدائك: الكومبو الرابح، قواعدك، وأفضل أوقاتك.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 2a3 3 0 013 3c0 1.5-1 2-1 3h-4c0-1-1-1.5-1-3a3 3 0 013-3z" />
          <path d="M9 11h6l1 4H8zM10 15v3m4-3v3M8 21h8" />
        </svg>
      ),
    },
    {
      href: `/${locale}/tools`,
      title: 'حاسبة المخاطرة',
      desc: 'احسب حجم صفقتك الصحيح قبل الدخول — أساس إدارة المخاطر.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 6h8M8 10h2m3 0h3M8 14h2m3 0h3M8 18h2m3 0h3" />
        </svg>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 16px 100px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="anim-fade-up" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37' }}>مركز التحضير اليومي</h1>
        <p style={{ fontSize: 12, color: '#8899BB', marginTop: 4 }}>
          المتداول المحترف يستعدّ قبل أن يضغط على الزر. ابدأ يومك من هنا.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {links.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={`card-vibrant card-hover-lift anim-fade-up anim-delay-${i + 1}`}
            style={{ padding: 16, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <span style={{ color: '#D4AF37' }}>{l.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#C8D8EE' }}>{l.title}</span>
            <span style={{ fontSize: 11, color: '#8899BB', lineHeight: 1.5 }}>{l.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
