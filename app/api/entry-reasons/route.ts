import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reasons = await prisma.entryReason.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(reasons)
}
