import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { checkPassword, PASSWORD_PROBLEM_TEXT } from '@/lib/password-policy'

const bodySchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
})

/**
 * POST /api/account/password — a signed-in user changes their own password.
 *
 * The current password is required, so a session left open on a shared device is
 * not enough to take the account over. This is also how a student replaces the
 * temporary password their mentor gave them.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id as string

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'لا توجد كلمة مرور لهذا الحساب. تواصل مع المدرّب.' }, { status: 400 })
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!matches) return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة.' }, { status: 400 })

  const problem = checkPassword(newPassword)
  if (problem) return NextResponse.json({ error: PASSWORD_PROBLEM_TEXT[problem] }, { status: 400 })

  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'اختر كلمة مرور مختلفة عن الحالية.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  })

  return NextResponse.json({ success: true })
}
