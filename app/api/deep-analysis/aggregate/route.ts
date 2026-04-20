import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDeepAggregate } from '@/lib/deep-analysis-aggregator'
import { canViewDeepAnalysisFor } from '@/lib/deep-analysis-guard'

// GET /api/deep-analysis/aggregate?targetUserId=&isBacktest=
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('targetUserId') ?? (session.user.id as string)
  const bt = searchParams.get('isBacktest')
  const isBacktest = bt === 'true' ? true : bt === 'false' ? false : undefined

  const allowed = await canViewDeepAnalysisFor(session.user.id as string, targetUserId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const aggregate = await getDeepAggregate(targetUserId, { isBacktest })
  return NextResponse.json(aggregate)
}
