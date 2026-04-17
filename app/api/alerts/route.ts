import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const unread = await prisma.alert.count({
    where: { userId: session.user.id as string, isRead: false },
  })
  return NextResponse.json({ alerts, unread })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = body.id as string | undefined

  if (id) {
    await prisma.alert.updateMany({
      where: { id, userId: session.user.id as string },
      data: { isRead: true },
    })
  } else {
    await prisma.alert.updateMany({
      where: { userId: session.user.id as string, isRead: false },
      data: { isRead: true },
    })
  }
  return NextResponse.json({ ok: true })
}
