import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { NewSessionForm } from './new-session-form'

export default async function NewBacktestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5DC]">جلسة باكتيست جديدة</h1>
        <p className="text-[#F5F5DC]/50 text-sm mt-1">حدد اسم الجلسة والرمز والفترة الزمنية</p>
      </div>
      <div className="card-navy p-6">
        <NewSessionForm locale={locale} />
      </div>
    </div>
  )
}
