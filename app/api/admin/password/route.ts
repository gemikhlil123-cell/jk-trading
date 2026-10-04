import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SUPER_MENTOR_EMAIL } from '@/lib/mentor-guard'
import { checkPassword, PASSWORD_PROBLEM_TEXT } from '@/lib/password-policy'

const bodySchema = z.object({
  userId: z.string().min(1),
  password: z.string(),
})

/**
 * POST /api/admin/password — the mentor sets a new password for a student who is
 * locked out.
 *
 * A forgotten password cannot be recovered: only its bcrypt hash is stored. This
 * replaces the hash. The password itself is never logged or returned.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mentorId = session.user.id as string

  // Same rule as the rest of /api/admin: only the single super mentor may
  // administrate users, checked against the database rather than the session.
  const currentUser = await prisma.user.findUnique({
    where: { id: mentorId },
    select: { role: true, email: true },
  })
  if (currentUser?.role !== 'MENTOR' || currentUser?.email !== SUPER_MENTOR_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  const { userId, password } = parsed.data

  // The mentor's own password changes only through the settings page, which asks
  // for the current one — so a borrowed session cannot lock the mentor out.
  if (userId === mentorId) {
    return NextResponse.json({ error: 'لتغيير كلمة مرورك أنت استخدم صفحة الإعدادات.' }, { status: 400 })
  }

  const problem = checkPassword(password)
  if (problem) return NextResponse.json({ error: PASSWORD_PROBLEM_TEXT[problem] }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  })

  return NextResponse.json({ success: true })
}
