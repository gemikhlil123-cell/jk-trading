import { auth } from '@/auth'
import { redirect } from 'next/navigation'
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
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#080C14]/90 backdrop-blur-sm border-b border-[rgba(212,175,55,0.1)] flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #A07D1C, #D4AF37)' }}
          >
            <span className="text-[#080C14] font-black text-xs">JK</span>
          </div>
          <div>
            <p className="font-bold text-[#D4AF37] text-sm leading-none tracking-wide">JK Trading</p>
            <p className="text-[#4A5A7A] text-[10px] mt-0.5">Journal</p>
          </div>
        </div>
        <div className="text-[#4A5A7A] text-xs">
          {new Date().toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
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
