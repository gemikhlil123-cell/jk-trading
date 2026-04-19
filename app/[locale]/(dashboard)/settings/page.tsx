import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TradovateConnectCard } from '@/components/settings/tradovate-connect-card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const account = await prisma.tradovateAccount.findUnique({
    where: { userId: session.user.id as string },
    select: {
      id: true,
      env: true,
      isActive: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      lastErrorAt: true,
      lastErrorMessage: true,
      importedTradesCount: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
  })

  return (
    <div className="px-4 relative z-[1] pb-20">
      <div className="mt-4 mb-5">
        <h1 className="text-[#C9A84C] text-base font-black tracking-widest uppercase">
          الإعدادات
        </h1>
        <p className="text-[11px] mt-1" style={{ color: 'rgba(201,168,76,0.5)' }}>
          اربط حسابك في Tradovate لاستيراد الصفقات تلقائياً
        </p>
      </div>

      <TradovateConnectCard
        initialAccount={
          account
            ? {
                env: account.env,
                isActive: account.isActive,
                lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
                lastSyncStatus: account.lastSyncStatus,
                lastErrorMessage: account.lastErrorMessage,
                importedTradesCount: account.importedTradesCount,
                tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
                createdAt: account.createdAt.toISOString(),
              }
            : null
        }
      />
    </div>
  )
}
