import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Normalize an incoming date string to UTC midnight (matches @db.Date). */
function toDateOnly(input: unknown): Date {
  const d = input ? new Date(String(input)) : new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const journals = await prisma.dailyJournal.findMany({
    where: { userId: session.user.id as string },
    orderBy: { date: 'desc' },
    take: 60,
  })
  return NextResponse.json({ journals })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id as string

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const date = toDateOnly(body.date)
  const rating = body.disciplineRating == null || body.disciplineRating === ''
    ? null
    : Math.max(1, Math.min(5, Math.trunc(Number(body.disciplineRating))))

  const data = {
    disciplineRating: rating,
    mood: typeof body.mood === 'string' && body.mood ? body.mood : null,
    followedPlan: typeof body.followedPlan === 'boolean' ? body.followedPlan : null,
    overtraded: typeof body.overtraded === 'boolean' ? body.overtraded : null,
    reflection: typeof body.reflection === 'string' ? body.reflection : null,
  }

  const journal = await prisma.dailyJournal.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  })

  return NextResponse.json({ journal })
}
