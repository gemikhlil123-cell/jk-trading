import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { id: session.user.id as string } })
  if (!me || me.role !== 'MENTOR') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const tradeId = body.tradeId as string | undefined
  const text = (body.body as string | undefined)?.trim()
  if (!tradeId || !text) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } })
  if (!trade) return NextResponse.json({ error: 'trade not found' }, { status: 404 })

  await prisma.mentorComment.create({
    data: {
      tradeId,
      mentorId: me.id,
      studentId: trade.userId,
      body: text,
    },
  })

  // Create alert for student
  await prisma.alert.create({
    data: {
      userId: trade.userId,
      type: 'MENTOR_COMMENT',
      message: `علّق مدربك على صفقة ${trade.symbol}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
    },
  })

  return NextResponse.json({ ok: true })
}
