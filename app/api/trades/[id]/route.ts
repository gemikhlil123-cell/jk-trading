import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const trade = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
    include: {
      entryReasons: { include: { entryReason: true } },
      comments: { include: { mentor: { select: { name: true, image: true } } } },
    },
  })

  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(trade)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const trade = await prisma.trade.update({
    where: { id },
    data: body,
    include: { entryReasons: { include: { entryReason: true } } },
  })
  return NextResponse.json(trade)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.trade.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
