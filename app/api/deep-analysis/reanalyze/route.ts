import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  analyzeUnanalyzedTrades,
  reanalyzeAllTrades,
  detectProvider,
} from '@/lib/ai-provider'
import { canViewDeepAnalysisFor } from '@/lib/deep-analysis-guard'

// POST /api/deep-analysis/reanalyze
// body: { targetUserId?: string, mode?: 'missing' | 'all', limit?: number }
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (detectProvider() === 'none') {
    return NextResponse.json(
      {
        error:
          'No AI provider configured. Set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on Netlify.',
      },
      { status: 500 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const targetUserId: string = body.targetUserId ?? (session.user.id as string)
  const mode: 'missing' | 'all' = body.mode === 'all' ? 'all' : 'missing'
  const limit: number = Math.min(Math.max(Number(body.limit) || 50, 1), 200)

  const allowed = await canViewDeepAnalysisFor(session.user.id as string, targetUserId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result =
      mode === 'all'
        ? await reanalyzeAllTrades(targetUserId, limit)
        : await analyzeUnanalyzedTrades(targetUserId, limit)
    return NextResponse.json({ ok: true, mode, limit, ...result })
  } catch (err) {
    console.error('[reanalyze] failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'analysis failed' },
      { status: 500 }
    )
  }
}
