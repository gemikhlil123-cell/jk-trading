import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/layout/bottom-nav'
import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  // Check subscription access
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { isActive: true, trialEndsAt: true, subscriptionStatus: true, role: true }
  })

  if (!user?.isActive) redirect(`/${locale}/suspended`)

  if (user.subscriptionStatus === 'trial' && user.trialEndsAt && user.trialEndsAt < new Date()) {
    redirect(`/${locale}/trial-expired`)
  }

  const role = (session.user as { role?: string }).role

  return (
    <div className="min-h-screen bg-[#080C14] relative z-[1]">
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-5"
        style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.98) 0%, rgba(8,12,20,0.92) 100%)', borderBottom: '1px solid rgba(201,168,76,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JK Trading" className="w-10 h-10 rounded-xl object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.4))' }} />
          <div>
            <p className="font-black text-[#C9A84C] text-sm leading-none tracking-widest uppercase">JK Trading</p>
            <p className="text-[10px] mt-0.5 tracking-wider" style={{ color: 'rgba(201,168,76,0.45)' }}>Journal ✦</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/prep`}
            aria-label="مركز التحضير اليومي"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: 'rgba(201,168,76,0.85)', background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </Link>
          <Link
            href={`/${locale}/jk-trading`}
            aria-label="مركز JK TRADING التعليمي"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: 'rgba(201,168,76,0.85)', background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </Link>
          <Link
            href={`/${locale}/settings`}
            aria-label="الإعدادات"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: 'rgba(201,168,76,0.7)', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
          <div className="text-[10px] tracking-wider px-3 py-1.5 rounded-full" style={{ color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
            {new Date().toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pt-14 pb-24 min-h-screen">
        {children}
      </main>

      {/* Bottom Nav */}
      <BottomNav locale={locale} role={role} />
    </div>
  )
}
