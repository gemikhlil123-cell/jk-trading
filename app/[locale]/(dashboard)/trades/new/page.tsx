import { TradeForm } from '@/components/trade/trade-form'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function NewTradePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="px-4 pb-4 relative z-[1]">
      <TradeForm />
    </div>
  )
}
