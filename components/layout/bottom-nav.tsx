'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  locale: string
  role?: string
}

export function BottomNav({ locale, role }: BottomNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      href: `/${locale}/checklist`,
      label: 'الشيكلست',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
    },
    {
      href: `/${locale}/trades/new`,
      label: 'يومية',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      href: `/${locale}/dashboard`,
      label: 'الإحصاء',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <path d="M14 17h7M17.5 14v7"/>
        </svg>
      ),
    },
    {
      href: `/${locale}/analytics`,
      label: 'التحليل',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path d="M3 3v18h18"/>
          <path d="M7 14l4-4 4 4 5-5"/>
        </svg>
      ),
    },
    {
      href: `/${locale}/bias`,
      label: 'التحيز',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
      ),
    },
    {
      href: `/${locale}/backtest`,
      label: 'باكتيست',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path d="M9 3H5a2 2 0 00-2 2v4"/>
          <path d="M9 3h10a2 2 0 012 2v10a2 2 0 01-2 2H9"/>
          <path d="M9 3v18M9 21H5a2 2 0 01-2-2v-4"/>
          <path d="M13 7l2 2-2 2M17 7l2 2-2 2"/>
        </svg>
      ),
    },
  ]

  // Add mentor tab for mentors
  if (role === 'MENTOR') {
    tabs.push({
      href: `/${locale}/mentor`,
      label: 'المدرب',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1520] border-t border-[rgba(212,175,55,0.15)]">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href.includes('/checklist') && pathname.includes('/checklist')) ||
            (tab.href.includes('/trades/new') && pathname.includes('/trades/new')) ||
            (tab.href.includes('/dashboard') && pathname.includes('/dashboard')) ||
            (tab.href.includes('/analytics') && (pathname.includes('/analytics') || pathname.includes('/strategy') || pathname.includes('/mindset'))) ||
            (tab.href.includes('/bias') && pathname.includes('/bias')) ||
            (tab.href.includes('/backtest') && pathname.includes('/backtest')) ||
            (tab.href.includes('/mentor') && pathname.includes('/mentor')) ||
            (tab.href.includes('/admin') && pathname.includes('/admin'))

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-colors',
                isActive ? 'text-[#D4AF37]' : 'text-[#4A5A7A] hover:text-[#8899BB]'
              )}
            >
              {tab.icon(isActive)}
              <span className="text-[9px] font-semibold leading-none">{tab.label}</span>
              <span
                className={cn(
                  'w-1 h-1 rounded-full transition-opacity',
                  isActive ? 'bg-[#D4AF37] opacity-100' : 'opacity-0'
                )}
              />
            </Link>
          )
        })}

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 text-[#4A5A7A] hover:text-[#E74C3C] transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="text-[9px] font-semibold leading-none">خروج</span>
          <span className="w-1 h-1 rounded-full opacity-0" />
        </button>
      </div>
    </nav>
  )
}
