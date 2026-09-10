import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
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
    <AppShell locale={locale} role={role}>
      {children}
    </AppShell>
  )
}
