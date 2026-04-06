'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  PlusCircle,
  FlaskConical,
  Users,
  LogOut,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

interface SidebarProps {
  role?: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('nav')

  const navItems: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: t('dashboard'),
      icon: <LayoutDashboard size={18} />,
    },
    {
      href: `/${locale}/trades`,
      label: t('trades'),
      icon: <TrendingUp size={18} />,
    },
    {
      href: `/${locale}/trades/new`,
      label: t('newTrade'),
      icon: <PlusCircle size={18} />,
    },
    {
      href: `/${locale}/weekly-review`,
      label: t('weeklyReview'),
      icon: <BarChart3 size={18} />,
    },
    {
      href: `/${locale}/backtest`,
      label: t('backtest'),
      icon: <FlaskConical size={18} />,
    },
    {
      href: `/${locale}/admin`,
      label: t('admin'),
      icon: <Users size={18} />,
      adminOnly: true,
    },
  ]

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === 'MENTOR'
  )

  return (
    <aside className="w-60 min-h-screen bg-[#0D2137] border-e border-[#1D3461] flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-[#1D3461]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5F5DC] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A192F] font-bold text-sm">JK</span>
          </div>
          <div>
            <p className="font-bold text-[#F5F5DC] text-sm leading-none">JK Trading</p>
            <p className="text-[#F5F5DC]/40 text-xs mt-0.5">Journal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${locale}/dashboard` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-[#F5F5DC]/10 text-[#F5F5DC] font-medium'
                  : 'text-[#F5F5DC]/60 hover:text-[#F5F5DC] hover:bg-[#F5F5DC]/5'
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  isActive ? 'text-[#F5F5DC]' : 'text-[#F5F5DC]/50'
                )}
              >
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <span className="ms-auto w-1.5 h-1.5 rounded-full bg-[#F5F5DC]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#1D3461] space-y-0.5">
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F5F5DC]/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
