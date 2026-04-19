import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { testAndStoreCredentials } from '@/lib/tradovate/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  env: z.enum(['LIVE', 'DEMO']),
  username: z.string().min(1),
  password: z.string().min(1),
  cid: z.string().min(1),
  secret: z.string().min(1),
  appId: z.string().optional(),
  deviceId: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'بيانات غير صحيحة', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await testAndStoreCredentials({
    userId: session.user.id as string,
    env: parsed.data.env,
    username: parsed.data.username,
    password: parsed.data.password,
    cid: parsed.data.cid,
    secret: parsed.data.secret,
    appId: parsed.data.appId,
    deviceId: parsed.data.deviceId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, summary: result.summary })
}
