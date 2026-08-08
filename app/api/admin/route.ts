import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SUPER_MENTOR_EMAIL } from '@/lib/mentor-guard'

// GET /api/admin — list all users with stats
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { role: true, email: true },
  })
  if (currentUser?.role !== 'MENTOR' || currentUser?.email !== SUPER_MENTOR_EMAIL) {
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

// DELETE /api/admin — delete user (SUPER ADMIN only)
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only the super admin can delete users
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { role: true, email: true },
  })
  if (currentUser?.role !== 'MENTOR' || currentUser?.email !== SUPER_MENTOR_EMAIL) {
    return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Prevent deleting yourself
  if (userId === session.user!.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}

// PATCH /api/admin — update user (activate/deactivate/change subscription)
const patchSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'expired', 'cancelled']).optional(),
  subscriptionTier: z.enum(['BASIC', 'PRO']).optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id as string },
    select: { role: true, email: true },
  })
  // Only the super mentor can administrate users — defense in depth even
  // if someone else somehow has role=MENTOR in the DB.
  if (currentUser?.role !== 'MENTOR' || currentUser?.email !== SUPER_MENTOR_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { userId, isActive, subscriptionStatus, subscriptionTier } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (isActive !== undefined) updateData.isActive = isActive

  if (subscriptionStatus !== undefined) {
    updateData.subscriptionStatus = subscriptionStatus
    // Keep subscriptionTier in sync — PRO features (deep analysis, strategy insights)
    // check tier === 'PRO', not status. Without this sync, "تفعيل الاشتراك"
    // appeared to work but students stayed on BASIC and were still blocked.
    if (subscriptionStatus === 'active') {
      updateData.isActive = true
      updateData.trialEndsAt = null
      updateData.subscriptionTier = 'PRO'
    } else if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
      updateData.subscriptionTier = 'BASIC'
    }
  }

  // Allow explicit tier override (wins over the automatic sync above)
  if (subscriptionTier !== undefined) {
    updateData.subscriptionTier = subscriptionTier
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      isActive: true,
      subscriptionStatus: true,
      subscriptionTier: true,
    },
  })

  return NextResponse.json(updated)
}
