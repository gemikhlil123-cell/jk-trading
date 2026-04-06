import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  symbol: z.enum(['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = await prisma.backtestSession.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { trades: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const bs = await prisma.backtestSession.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  })

  return NextResponse.json(bs, { status: 201 })
}
