/**
 * Shared access guard for Claude-powered deep analysis.
 *
 * Rule (user-confirmed):
 *   - MENTOR role always has access (to self + all students).
 *   - PRO subscription tier has access (to self only).
 *   - Others are denied.
 */

import { prisma } from './prisma'

export type DeepAccess =
  | { allowed: true; role: 'MENTOR' | 'STUDENT'; tier: 'BASIC' | 'PRO' }
  | { allowed: false; reason: 'NOT_MENTOR_OR_PRO' | 'UNKNOWN_USER' }

export async function checkDeepAccess(userId: string): Promise<DeepAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, subscriptionTier: true },
  })
  if (!user) return { allowed: false, reason: 'UNKNOWN_USER' }
  if (user.role === 'MENTOR' || user.subscriptionTier === 'PRO') {
    return { allowed: true, role: user.role, tier: user.subscriptionTier }
  }
  return { allowed: false, reason: 'NOT_MENTOR_OR_PRO' }
}

/**
 * For mentor-style cross-user access: returns true if `viewerId` may view
 * deep analysis for `targetUserId`.
 *   - MENTOR → any student
 *   - Viewer → self (if PRO)
 */
export async function canViewDeepAnalysisFor(
  viewerId: string,
  targetUserId: string
): Promise<boolean> {
  if (viewerId === targetUserId) {
    const self = await checkDeepAccess(viewerId)
    return self.allowed
  }
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true },
  })
  return viewer?.role === 'MENTOR'
}
