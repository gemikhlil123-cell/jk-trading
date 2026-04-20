'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  locale: string
}

export function AnalyticsSubnav({ locale }: Props) {
  const pathname = usePathname()
  const tabs = [
    { href: `/${locale}/analytics`, label: 'التحليل الشامل', match: '/analytics' },
    { href: `/${locale}/strategy`, label: 'استراتيجيتك', match: '/strategy' },
    { href: `/${locale}/deep-analysis`, label: 'التحليل العميق', match: '/deep-analysis' },
    { href: `/${locale}/mindset`, label: 'العقلية والمخاطرة', match: '/mindset' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 14,
        background: '#111D2E',
        padding: 4,
        borderRadius: 12,
        border: '1px solid rgba(212,175,55,0.12)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const active = pathname.includes(t.match)
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              background: active ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: active ? '#D4AF37' : '#4A5A7A',
              border: active ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
