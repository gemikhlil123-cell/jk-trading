/**
 * Aggregates Claude-based NoteAnalysis records across a user's trades.
 *
 * Reads `notesAnalysis` JSON columns and produces:
 *   - timeframe frequency + per-timeframe win rate
 *   - confluence frequency (by type + scope + timeframe)
 *   - SMT scope distribution (month/day/cycle/session/instrument)
 *   - session frequency + per-session win rate
 *   - specific-time frequency (favorite entry windows)
 *   - instrument pairs used for SMT
 *   - execution-quality distribution
 *   - emotional-state frequency
 *   - common mistakes / common strengths (ranked by occurrence)
 *
 * Minimum occurrences threshold applied per bucket to suppress noise.
 */

import { prisma } from './prisma'
import type { NoteAnalysis } from './claude-analysis'
import { parseStoredAnalysis } from './claude-analysis'

// ─── Output shapes ─────────────────────────────────────────────────────────

export interface Bucket {
  key: string
  label: string
  count: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
}

export interface ConfluenceBucket extends Bucket {
  type: string
  scope: string
  timeframe: string
}

export interface TextBucket {
  text: string
  count: number
  wins: number
  losses: number
  winRate: number
}

export interface DeepAggregate {
  totalAnalyzed: number
  totalWithPnl: number
  timeframes: Bucket[]
  confluences: ConfluenceBucket[]
  smtScopes: Bucket[]
  sessions: Bucket[]
  specificTimes: Bucket[]
  instrumentsCompared: Bucket[]
  executionQuality: Bucket[]
  emotionalStates: Bucket[]
  directionBias: Bucket[]
  mistakes: TextBucket[]
  strengths: TextBucket[]
  languages: { key: string; count: number }[]
}

// ─── Labels ────────────────────────────────────────────────────────────────

const TF_LABEL: Record<string, string> = {
  MONTHLY: 'شهري',
  WEEKLY: 'أسبوعي',
  DAILY: 'يومي',
  '4H': '4 ساعات',
  '1H': 'ساعة',
  '15M': '15 دقيقة',
  '5M': '5 دقائق',
  '3M': '3 دقائق',
  '1M': 'دقيقة',
  N_A: '—',
}

const SCOPE_LABEL: Record<string, string> = {
  MONTH: 'بين الأشهر',
  WEEK: 'بين الأسابيع',
  DAY: 'بين الأيام',
  SESSION: 'بين الجلسات',
  CYCLE_90M: 'بين السايكلات (90د)',
  INSTRUMENT: 'بين الأدوات',
  N_A: '—',
}

const CONFLUENCE_LABEL: Record<string, string> = {
  SMT: 'SMT',
  FVG: 'FVG',
  IFVG: 'IFVG',
  CISD: 'CISD',
  PSP: 'PSP',
  LIQUIDITY_SWEEP: 'Liquidity Sweep',
  DAILY_BIAS: 'Daily Bias',
  TRUE_OPEN: 'True Open',
  OTE: 'OTE',
  ORDER_BLOCK: 'Order Block',
  BREAKER: 'Breaker',
  OTHER: 'أخرى',
}

const SESSION_LABEL: Record<string, string> = {
  ASIA: 'آسيا',
  LONDON: 'لندن',
  NY_AM: 'نيويورك صباح',
  NY_PM: 'نيويورك مساء',
  OFF_HOURS: 'خارج الجلسات',
  UNKNOWN: 'غير محدد',
}

const EMOTION_LABEL: Record<string, string> = {
  CALM: 'هدوء',
  CONFIDENT: 'ثقة',
  FOMO: 'FOMO',
  REVENGE: 'انتقام',
  FEAR: 'خوف',
  GREED: 'طمع',
  IMPATIENCE: 'قلة صبر',
  FRUSTRATION: 'إحباط',
  DOUBT: 'شك',
  DISCIPLINED: 'انضباط',
  NONE: 'لا شيء',
}

const EXEC_LABEL: Record<string, string> = {
  A: 'A — ممتاز',
  B: 'B — مقبول',
  C: 'C — ضعيف',
  UNKNOWN: 'غير محدد',
}

const DIR_LABEL: Record<string, string> = {
  LONG: 'شراء',
  SHORT: 'بيع',
  NEUTRAL: 'محايد',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface TradeWithAnalysis {
  analysis: NoteAnalysis
  pnl: number
  isWin: boolean
  hasPnl: boolean
}

function bucketize<T>(
  items: T[],
  keyFn: (t: T) => string | null | undefined,
  labelFn: (key: string) => string,
  pnlFn: (t: T) => { pnl: number; isWin: boolean; hasPnl: boolean },
  minCount = 1
): Bucket[] {
  const map = new Map<string, { rows: { pnl: number; isWin: boolean; hasPnl: boolean }[] }>()
  for (const t of items) {
    const k = keyFn(t)
    if (!k) continue
    const cur = map.get(k) ?? { rows: [] }
    cur.rows.push(pnlFn(t))
    map.set(k, cur)
  }
  return Array.from(map.entries())
    .map(([k, v]) => {
      const withPnl = v.rows.filter((r) => r.hasPnl)
      const wins = withPnl.filter((r) => r.isWin).length
      const losses = withPnl.length - wins
      const totalPnl = withPnl.reduce((s, r) => s + r.pnl, 0)
      return {
        key: k,
        label: labelFn(k),
        count: v.rows.length,
        wins,
        losses,
        winRate: withPnl.length > 0 ? wins / withPnl.length : 0,
        totalPnl,
        avgPnl: withPnl.length > 0 ? totalPnl / withPnl.length : 0,
      }
    })
    .filter((b) => b.count >= minCount)
    .sort((a, b) => b.count - a.count)
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function getDeepAggregate(
  userId: string,
  opts: { isBacktest?: boolean; limit?: number } = {}
): Promise<DeepAggregate> {
  const { isBacktest, limit = 500 } = opts

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      notesAnalysis: { not: null },
      ...(isBacktest !== undefined ? { isBacktest } : {}),
    },
    orderBy: { entryTime: 'desc' },
    take: limit,
    select: {
      id: true,
      pnl: true,
      notesAnalysis: true,
    },
  })

  const parsed: TradeWithAnalysis[] = []
  for (const t of trades) {
    const a = parseStoredAnalysis(t.notesAnalysis)
    if (!a) continue
    const pnlNum = t.pnl !== null ? Number(t.pnl) : 0
    parsed.push({
      analysis: a,
      pnl: pnlNum,
      isWin: pnlNum > 0,
      hasPnl: t.pnl !== null,
    })
  }

  const withPnl = parsed.filter((p) => p.hasPnl)

  // ─── Timeframes (flatten all timeframes mentioned) ───
  const timeframeRows: { tf: string; pnl: number; isWin: boolean; hasPnl: boolean }[] = []
  for (const p of parsed) {
    const seen = new Set<string>()
    for (const tf of p.analysis.timeframes) {
      if (seen.has(tf)) continue
      seen.add(tf)
      timeframeRows.push({ tf, pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl })
    }
  }
  const timeframes = bucketize(
    timeframeRows,
    (r) => r.tf,
    (k) => TF_LABEL[k] ?? k,
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    2
  )

  // ─── Confluences (type + scope + timeframe triple key) ───
  type ConfRow = {
    type: string
    scope: string
    timeframe: string
    pnl: number
    isWin: boolean
    hasPnl: boolean
  }
  const confRows: ConfRow[] = []
  for (const p of parsed) {
    const seen = new Set<string>()
    for (const c of p.analysis.confluences) {
      const key = `${c.type}|${c.scope}|${c.timeframe}`
      if (seen.has(key)) continue
      seen.add(key)
      confRows.push({
        type: c.type,
        scope: c.scope,
        timeframe: c.timeframe,
        pnl: p.pnl,
        isWin: p.isWin,
        hasPnl: p.hasPnl,
      })
    }
  }
  const confBase = bucketize(
    confRows,
    (r) => `${r.type}|${r.scope}|${r.timeframe}`,
    (k) => {
      const [t, s, tf] = k.split('|')
      const tLabel = CONFLUENCE_LABEL[t] ?? t
      const sLabel = s !== 'N_A' ? ` ${SCOPE_LABEL[s] ?? s}` : ''
      const tfLabel = tf !== 'N_A' ? ` • ${TF_LABEL[tf] ?? tf}` : ''
      return `${tLabel}${sLabel}${tfLabel}`
    },
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    2
  )
  const confluences: ConfluenceBucket[] = confBase.map((b) => {
    const [type, scope, timeframe] = b.key.split('|')
    return { ...b, type, scope, timeframe }
  })

  // ─── SMT scopes only ───
  const smtRows: ConfRow[] = confRows.filter((r) => r.type === 'SMT' && r.scope !== 'N_A')
  const smtScopes = bucketize(
    smtRows,
    (r) => r.scope,
    (k) => SCOPE_LABEL[k] ?? k,
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    1
  )

  // ─── Sessions ───
  const sessions = bucketize(
    parsed,
    (p) => p.analysis.session,
    (k) => SESSION_LABEL[k] ?? k,
    (p) => ({ pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl }),
    1
  )

  // ─── Specific times ───
  const timeRows: { time: string; pnl: number; isWin: boolean; hasPnl: boolean }[] = []
  for (const p of parsed) {
    const seen = new Set<string>()
    for (const t of p.analysis.specific_times ?? []) {
      const norm = t.trim()
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      timeRows.push({ time: norm, pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl })
    }
  }
  const specificTimes = bucketize(
    timeRows,
    (r) => r.time,
    (k) => k,
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    2
  )

  // ─── Instrument pairs (sort symbols alphabetically to normalize) ───
  const instRows: { pair: string; pnl: number; isWin: boolean; hasPnl: boolean }[] = []
  for (const p of parsed) {
    const uniq = Array.from(new Set(p.analysis.instruments_compared.map((x) => x.toUpperCase().trim()))).filter(Boolean)
    if (uniq.length < 2) {
      if (uniq.length === 1) {
        instRows.push({ pair: uniq[0], pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl })
      }
      continue
    }
    const sorted = [...uniq].sort()
    // All pairwise combinations
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        instRows.push({
          pair: `${sorted[i]} / ${sorted[j]}`,
          pnl: p.pnl,
          isWin: p.isWin,
          hasPnl: p.hasPnl,
        })
      }
    }
  }
  const instrumentsCompared = bucketize(
    instRows,
    (r) => r.pair,
    (k) => k,
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    1
  )

  // ─── Execution quality ───
  const executionQuality = bucketize(
    parsed,
    (p) => p.analysis.execution_quality,
    (k) => EXEC_LABEL[k] ?? k,
    (p) => ({ pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl }),
    1
  )

  // ─── Emotional states (flattened) ───
  const emoRows: { emo: string; pnl: number; isWin: boolean; hasPnl: boolean }[] = []
  for (const p of parsed) {
    const seen = new Set<string>()
    for (const e of p.analysis.emotional_state) {
      if (seen.has(e)) continue
      seen.add(e)
      emoRows.push({ emo: e, pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl })
    }
  }
  const emotionalStates = bucketize(
    emoRows,
    (r) => r.emo,
    (k) => EMOTION_LABEL[k] ?? k,
    (r) => ({ pnl: r.pnl, isWin: r.isWin, hasPnl: r.hasPnl }),
    1
  )

  // ─── Direction bias ───
  const directionBias = bucketize(
    parsed,
    (p) => p.analysis.direction_bias,
    (k) => DIR_LABEL[k] ?? k,
    (p) => ({ pnl: p.pnl, isWin: p.isWin, hasPnl: p.hasPnl }),
    1
  )

  // ─── Mistakes / strengths (normalized by lower-case trim) ───
  function textBucket(getter: (p: TradeWithAnalysis) => string[]): TextBucket[] {
    const map = new Map<string, { rows: { isWin: boolean; hasPnl: boolean }[]; original: string }>()
    for (const p of parsed) {
      const seen = new Set<string>()
      for (const raw of getter(p)) {
        const norm = raw.trim()
        if (!norm) continue
        const key = norm.toLocaleLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const cur = map.get(key) ?? { rows: [], original: norm }
        cur.rows.push({ isWin: p.isWin, hasPnl: p.hasPnl })
        map.set(key, cur)
      }
    }
    return Array.from(map.values())
      .map((v) => {
        const wp = v.rows.filter((r) => r.hasPnl)
        const wins = wp.filter((r) => r.isWin).length
        const losses = wp.length - wins
        return {
          text: v.original,
          count: v.rows.length,
          wins,
          losses,
          winRate: wp.length > 0 ? wins / wp.length : 0,
        }
      })
      .filter((b) => b.count >= 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
  }

  const mistakes = textBucket((p) => p.analysis.mistakes)
  const strengths = textBucket((p) => p.analysis.strengths)

  // ─── Language breakdown (informational) ───
  const langMap = new Map<string, number>()
  for (const p of parsed) {
    langMap.set(p.analysis.language, (langMap.get(p.analysis.language) ?? 0) + 1)
  }
  const languages = Array.from(langMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalAnalyzed: parsed.length,
    totalWithPnl: withPnl.length,
    timeframes,
    confluences,
    smtScopes,
    sessions,
    specificTimes,
    instrumentsCompared,
    executionQuality,
    emotionalStates,
    directionBias,
    mistakes,
    strengths,
    languages,
  }
}
