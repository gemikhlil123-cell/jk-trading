import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getWeeklyAnalysis } from '@/lib/analysis'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const weekOffset = parseInt(searchParams.get('weekOffset') || '0')

  const analysis = await getWeeklyAnalysis(session.user.id, weekOffset)
  return NextResponse.json(analysis)
}
