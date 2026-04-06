import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { DailyChecklist } from '@/components/checklist/daily-checklist'

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/login`)

  return (
    <div className="px-4 pb-4 space-y-0 relative z-[1]">
      <DailyChecklist />
    </div>
  )
}
