import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { BiasAnalyzer } from '@/components/bias/bias-analyzer'

export default async function BiasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  return (
    <div className="px-4 pb-4 relative z-[1]">
      <BiasAnalyzer />
    </div>
  )
}
