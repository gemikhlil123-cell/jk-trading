import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/admin — list all users with stats
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { role: true },
  })
  if (currentUser?.role !== 'MENTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
      _count: { select: { trades: true } },
      trades: {
        where: { isBacktest: false },
        select: { pnl: true, notes: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = users.map(u => {
    const realTrades = u.trades
    const totalTrades = realTrades.length
    const wins = realTrades.filter(t => t.pnl && Number(t.pnl) > 0).length
    const totalPnl = realTrades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      subscriptionStatus: u.subscriptionStatus,
      trialEndsAt: u.trialEndsAt,
      createdAt: u.createdAt,
      stats: { totalTrades, wins, totalPnl, winRate },
    }
  })

  return NextResponse.json(result)
}

// PATCH /api/admin — update user (activate/deactivate/change subscription)
const patchSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'expired', 'cancelled']).optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { role: true },
  })
  if (currentUser?.role !== 'MENTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { userId, isActive, subscriptionStatus } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (isActive !== undefined) updateData.isActive = isActive
  if (subscriptionStatus !== undefined) {
    updateData.subscriptionStatus = subscriptionStatus
    // If activating subscription, set active indefinitely (null trialEndsAt)
    if (subscriptionStatus === 'active') {
      updateData.isActive = true
      updateData.trialEndsAt = null
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, isActive: true, subscriptionStatus: true },
  })

  return NextResponse.json(updated)
}
