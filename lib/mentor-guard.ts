/**
 * Single source of truth for the ONLY account allowed to hold MENTOR role.
 *
 * Rule: gemikhlil123@gmail.com is the exclusive mentor/super admin.
 * Everyone else is a STUDENT (even if somehow assigned MENTOR in the DB,
 * the application-level checks here reject them).
 */
import { prisma } from './prisma'

export const SUPER_MENTOR_EMAIL = 'gemikhlil123@gmail.com'

/**
 * True only when this user is the single allowed mentor:
 *   role = MENTOR  AND  email = SUPER_MENTOR_EMAIL
 */
export async function isSuperMentor(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  })
  return u?.role === 'MENTOR' && u?.email === SUPER_MENTOR_EMAIL
}

/** Check by email (used in places where we already have the email) */
export function isSuperMentorEmail(email: string | undefined | null): boolean {
  return email === SUPER_MENTOR_EMAIL
}
