import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
  return NextResponse.json({ account })
}
