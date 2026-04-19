import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { syncAccount } from '@/lib/tradovate/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const account = await prisma.tradovateAccount.findUnique({
    where: { userId: session.user.id as string },
  })
  if (!account) {
    return NextResponse.json({ error: 'لا يوجد حساب Tradovate مربوط' }, { status: 404 })
  }
  const result = await syncAccount(account.id)
  return NextResponse.json({ ok: true, ...result })
}
