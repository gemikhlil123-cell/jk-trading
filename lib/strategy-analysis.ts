/**
 * Advanced reason analysis — expectancy-based (RR-aware), trend-aware,
 * context-aware, with action recommendations and confidence scoring.
 *
 * Answers the questions:
 *   - Which reasons (or reason-pairs) ACTUALLY make me money?
 *   - Which context (killzone / cycle) amplifies each reason?
 *   - Is a reason improving or declining over time?
 *   - What should I KEEP, TEST, REMOVE, or REVIEW?
 */

import { prisma } from './prisma'
import { getKillzoneLabel, getCycleLabel } from './deep-analysis'

const MIN_SAMPLE = 5 // User-chosen minimum trades before we judge a reason
const RECENT_SLICE = 10

export type ReasonAction = 'KEEP' | 'TEST' | 'REMOVE' | 'REVIEW'
export type ReasonTrend = 'IMPROVING' | 'DECLINING' | 'STABLE' | 'NEW'

export interface ContextSlice {
  key: string
  label: string
  trades: number
  wins: number
  winRate: number
  pnl: number
}

export interface ReasonInsight {
  name: string
  category: string

  // Core stats
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
  avgRR: number | null
  expectancy: number // in R (risk units) or PnL if RR missing
  expectancyUnit: 'R' | 'PNL'

  // Trend (first half vs second half chronologically)
  trend: ReasonTrend
  recentWinRate: number
  oldWinRate: number
  trendDelta: number // recent - old (percentage points)

  // Context — where it works best / worst
  byKillzone: ContextSlice[]
  byCycle: ContextSlice[]
  bestContext: { scope: 'KILLZONE' | 'CYCLE'; label: string; winRate: number; trades: number } | null
  worstContext: { scope: 'KILLZONE' | 'CYCLE'; label: string; winRate: number; trades: number } | null

  // Confidence 0-100 (sample-based)
  confidence: number

  // Action recommendation
  action: ReasonAction
  actionReason: string // short Arabic rationale
}

export interface ReasonComboInsight {
  names: [string, string]
  trades: number
  wins: number
  winRate: number
  totalPnl: number
  avgPnl: number
  expectancy: number
  confidence: number
  action: ReasonAction
}

export interface WeeklySnapshot {
  trades: number
  wins: number
  winRate: number
  totalPnl: number
  topReasons: { name: string; winRate: number; trades: number }[]
}

export interface WeeklyComparison {
  thisWeek: WeeklySnapshot
  lastWeek: WeeklySnapshot
  winRateDelta: number
  pnlDelta: number
  newStrongReasons: string[]
  newDecliningReasons: string[]
}

export interface StrategyAnalysis {
  reasons: ReasonInsight[]
  combos: ReasonComboInsight[]
  weekly: WeeklyComparison
  actionSummary: {
    keep: ReasonInsight[]
    test: ReasonInsight[]
    remove: ReasonInsight[]
    review: ReasonInsight[]
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function confidenceFromSample(n: number): number {
  // 5 trades = 30%, 10 = 55%, 20 = 80%, 30+ = 95%
  if (n >= 30) return 95
  if (n >= 20) return 80
  if (n >= 10) return 55 + (n - 10) * 2.5
  if (n >= 5) return 30 + (n - 5) * 5
  return Math.round((n / 5) * 30)
}

function computeExpectancy(
  trades: { pnl: number; rr: number | null; isWin: boolean }[]
): { expectancy: number; unit: 'R' | 'PNL'; avgRR: number | null } {
  const rrTrades = trades.filter((t) => t.rr !== null)
  // Use RR-based expectancy only if ≥70% of trades have RR data
  if (rrTrades.length / trades.length >= 0.7 && rrTrades.length >= 3) {
    const wins = rrTrades.filter((t) => t.isWin)
    const losses = rrTrades.filter((t) => !t.isWin)
    const avgRWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.rr || 0), 0) / wins.length : 0
    const avgRLoss =
      losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.rr || 0), 0) / losses.length : 1
    const winRate = wins.length / rrTrades.length
    const expectancy = winRate * avgRWin - (1 - winRate) * avgRLoss
    const avgRR =
      rrTrades.reduce((s, t) => s + Math.abs(t.rr || 0), 0) / rrTrades.length
    return { expectancy, unit: 'R', avgRR }
  }
  // Fallback: raw PnL average
  const avgPnl =
    trades.length > 0 ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0
  return { expectancy: avgPnl, unit: 'PNL', avgRR: null }
}

function classifyReason(
  winRate: number,
  expectancy: number,
  expectancyUnit: 'R' | 'PNL',
  trades: number,
  trend: ReasonTrend
): { action: ReasonAction; reason: string } {
  const starByWinRate = winRate >= 0.7
  const starByExpectancy =
    expectancyUnit === 'R' ? expectancy >= 0.5 : expectancy >= 10
  const profitable =
    expectancyUnit === 'R' ? expectancy > 0 : expectancy > 0

  const weakByWinRate = winRate <= 0.35
  const weakByExpectancy =
    expectancyUnit === 'R' ? expectancy <= -0.2 : expectancy <= -10

  // Not enough data → TEST
  if (trades < MIN_SAMPLE) {
    return {
      action: 'TEST',
      reason: `${trades} صفقات فقط — جرّب أكثر لتأكيد الفاعلية`,
    }
  }

  // Strong performer declining → REVIEW (warning)
  if ((starByWinRate || starByExpectancy) && trend === 'DECLINING') {
    return {
      action: 'REVIEW',
      reason: 'كان قوياً لكنه يتراجع — راجع ما تغيّر في تطبيقك له',
    }
  }

  // Clear star → KEEP
  if (starByWinRate || starByExpectancy) {
    return {
      action: 'KEEP',
      reason:
        trend === 'IMPROVING'
          ? 'قوي وفي تحسّن مستمر — ركّز عليه'
          : 'سبب ناجح موثوق — حافظ عليه',
    }
  }

  // Clear loser → REMOVE
  if (weakByWinRate || weakByExpectancy) {
    return {
      action: 'REMOVE',
      reason:
        expectancyUnit === 'R'
          ? `التوقع الإحصائي ${expectancy.toFixed(2)}R سلبي — احذفه`
          : `متوسط الخسارة ${Math.abs(expectancy).toFixed(0)} لكل صفقة — احذفه`,
    }
  }

  // Profitable but not a star → REVIEW/TEST based on trend
  if (profitable && trend === 'IMPROVING') {
    return {
      action: 'KEEP',
      reason: 'متوسط الأداء لكن في تحسّن — استمر بالمراقبة',
    }
  }

  return {
    action: 'REVIEW',
    reason: 'أداء متوسط — يحتاج تدقيق في الشروط الإضافية (جلسة/سايكل)',
  }
}

function computeTrend(
  tradesByTime: { isWin: boolean; time: Date }[]
): { trend: ReasonTrend; recentWR: number; oldWR: number; delta: number } {
  if (tradesByTime.length < MIN_SAMPLE * 2) {
    return { trend: 'NEW', recentWR: 0, oldWR: 0, delta: 0 }
  }
  const mid = Math.floor(tradesByTime.length / 2)
  const older = tradesByTime.slice(0, mid)
  const recent = tradesByTime.slice(mid)
  const oldWR = older.filter((t) => t.isWin).length / older.length
  const recentWR = recent.filter((t) => t.isWin).length / recent.length
  const delta = recentWR - oldWR
  let trend: ReasonTrend = 'STABLE'
  if (delta >= 0.15) trend = 'IMPROVING'
  else if (delta <= -0.15) trend = 'DECLINING'
  return { trend, recentWR, oldWR, delta }
}

function sliceContext(
  trades: { pnl: number; isWin: boolean; key: string | null }[],
  labeler: (k: string) => string
): ContextSlice[] {
  const groups = new Map<string, { pnl: number; isWin: boolean }[]>()
  for (const t of trades) {
    const k = t.key ?? 'OFF'
    const arr = groups.get(k) ?? []
    arr.push({ pnl: t.pnl, isWin: t.isWin })
    groups.set(k, arr)
  }
  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const wins = rows.filter((r) => r.isWin).length
      const pnl = rows.reduce((s, r) => s + r.pnl, 0)
      return {
        key,
        label: labeler(key),
        trades: rows.length,
        wins,
        winRate: rows.length > 0 ? wins / rows.length : 0,
        pnl,
      }
    })
    .sort((a, b) => b.pnl - a.pnl)
}

function findBestWorstContext(
  byKz: ContextSlice[],
  byCycle: ContextSlice[]
): {
  best: ReasonInsight['bestContext']
  worst: ReasonInsight['worstContext']
} {
  const all: Array<{ scope: 'KILLZONE' | 'CYCLE'; slice: ContextSlice }> = []
  for (const s of byKz) {
    if (s.trades >= 3) all.push({ scope: 'KILLZONE', slice: s })
  }
  for (const s of byCycle) {
    if (s.trades >= 3) all.push({ scope: 'CYCLE', slice: s })
  }
  if (all.length === 0) return { best: null, worst: null }

  const sorted = [...all].sort((a, b) => b.slice.winRate - a.slice.winRate)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  return {
    best:
      best && best.slice.winRate >= 0.6
        ? {
            scope: best.scope,
            label: best.slice.label,
            winRate: best.slice.winRate,
            trades: best.slice.trades,
          }
        : null,
    worst:
      worst && worst.slice.winRate <= 0.4 && worst !== best
        ? {
            scope: worst.scope,
            label: worst.slice.label,
            winRate: worst.slice.winRate,
            trades: worst.slice.trades,
          }
        : null,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Weekly comparison
// ──────────────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  // Sunday as week start (common in MENA)
  const date = new Date(d)
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - day)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function weekKey(d: Date): string {
  return startOfWeek(d).toISOString().slice(0, 10)
}

function buildWeeklySnapshot(
  trades: {
    pnl: number
    isWin: boolean
    reasons: string[]
  }[]
): WeeklySnapshot {
  const wins = trades.filter((t) => t.isWin).length
  const reasonMap = new Map<string, { trades: number; wins: number }>()
  for (const t of trades) {
    for (const r of t.reasons) {
      const cur = reasonMap.get(r) ?? { trades: 0, wins: 0 }
      cur.trades++
      if (t.isWin) cur.wins++
      reasonMap.set(r, cur)
    }
  }
  const topReasons = Array.from(reasonMap.entries())
    .filter(([, d]) => d.trades >= 2)
    .map(([name, d]) => ({ name, trades: d.trades, winRate: d.wins / d.trades }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5)
  return {
    trades: trades.length,
    wins,
    winRate: trades.length > 0 ? wins / trades.length : 0,
    totalPnl: trades.reduce((s, t) => s + t.pnl, 0),
    topReasons,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

export async function getStrategyAnalysis(
  userId: string,
  opts: { isBacktest?: boolean } = {}
): Promise<StrategyAnalysis> {
  const { isBacktest = false } = opts

  const rawTrades = await prisma.trade.findMany({
    where: { userId, isBacktest, pnl: { not: null } },
    include: { entryReasons: { include: { entryReason: true } } },
    orderBy: { entryTime: 'asc' },
  })

  const trades = rawTrades.map((t) => {
    const pnl = Number(t.pnl ?? 0)
    return {
      id: t.id,
      entryTime: t.entryTime,
      pnl,
      rr: t.rrAchieved !== null ? Number(t.rrAchieved) : null,
      killzone: t.killzone as string | null,
      cyclePhase: t.cyclePhase as string | null,
      isWin: pnl > 0,
      reasons: t.entryReasons.map((er) => ({
        name: er.entryReason.name,
        category: er.entryReason.category,
      })),
    }
  })

  // ─── Per-reason insights ───
  const reasonMap = new Map<
    string,
    {
      category: string
      trades: {
        pnl: number
        rr: number | null
        isWin: boolean
        time: Date
        killzone: string | null
        cyclePhase: string | null
      }[]
    }
  >()

  for (const t of trades) {
    for (const r of t.reasons) {
      const cur = reasonMap.get(r.name) ?? { category: r.category, trades: [] }
      cur.trades.push({
        pnl: t.pnl,
        rr: t.rr,
        isWin: t.isWin,
        time: t.entryTime,
        killzone: t.killzone,
        cyclePhase: t.cyclePhase,
      })
      reasonMap.set(r.name, cur)
    }
  }

  const reasons: ReasonInsight[] = Array.from(reasonMap.entries())
    .filter(([, d]) => d.trades.length >= MIN_SAMPLE)
    .map(([name, d]) => {
      const wins = d.trades.filter((t) => t.isWin).length
      const losses = d.trades.length - wins
      const totalPnl = d.trades.reduce((s, t) => s + t.pnl, 0)
      const winRate = wins / d.trades.length

      const { expectancy, unit, avgRR } = computeExpectancy(d.trades)
      const { trend, recentWR, oldWR, delta } = computeTrend(d.trades)
      const byKillzone = sliceContext(
        d.trades.map((t) => ({ pnl: t.pnl, isWin: t.isWin, key: t.killzone })),
        (k) => getKillzoneLabel(k)
      )
      const byCycle = sliceContext(
        d.trades.map((t) => ({ pnl: t.pnl, isWin: t.isWin, key: t.cyclePhase })),
        (k) => getCycleLabel(k)
      )
      const { best, worst } = findBestWorstContext(byKillzone, byCycle)
      const { action, reason: actionReason } = classifyReason(
        winRate,
        expectancy,
        unit,
        d.trades.length,
        trend
      )

      return {
        name,
        category: d.category,
        trades: d.trades.length,
        wins,
        losses,
        winRate,
        totalPnl,
        avgPnl: totalPnl / d.trades.length,
        avgRR,
        expectancy,
        expectancyUnit: unit,
        trend,
        recentWinRate: recentWR,
        oldWinRate: oldWR,
        trendDelta: delta,
        byKillzone,
        byCycle,
        bestContext: best,
        worstContext: worst,
        confidence: confidenceFromSample(d.trades.length),
        action,
        actionReason,
      }
    })
    .sort((a, b) => {
      // Sort: KEEP first, then REVIEW, then TEST, then REMOVE.
      const order: Record<ReasonAction, number> = { KEEP: 0, REVIEW: 1, TEST: 2, REMOVE: 3 }
      if (order[a.action] !== order[b.action]) return order[a.action] - order[b.action]
      return b.expectancy - a.expectancy
    })

  // ─── Pair combos ───
  const comboMap = new Map<
    string,
    { names: [string, string]; trades: { pnl: number; rr: number | null; isWin: boolean }[] }
  >()
  for (const t of trades) {
    const names = t.reasons.map((r) => r.name).sort()
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = `${names[i]}|${names[j]}`
        const cur = comboMap.get(key) ?? { names: [names[i], names[j]] as [string, string], trades: [] }
        cur.trades.push({ pnl: t.pnl, rr: t.rr, isWin: t.isWin })
        comboMap.set(key, cur)
      }
    }
  }
  const combos: ReasonComboInsight[] = Array.from(comboMap.values())
    .filter((c) => c.trades.length >= MIN_SAMPLE)
    .map((c) => {
      const wins = c.trades.filter((t) => t.isWin).length
      const winRate = wins / c.trades.length
      const totalPnl = c.trades.reduce((s, t) => s + t.pnl, 0)
      const { expectancy } = computeExpectancy(c.trades)
      const { action } = classifyReason(winRate, expectancy, 'PNL', c.trades.length, 'STABLE')
      return {
        names: c.names,
        trades: c.trades.length,
        wins,
        winRate,
        totalPnl,
        avgPnl: totalPnl / c.trades.length,
        expectancy,
        confidence: confidenceFromSample(c.trades.length),
        action,
      }
    })
    .sort((a, b) => b.expectancy - a.expectancy)

  // ─── Weekly comparison ───
  const nowWeekKey = weekKey(new Date())
  const lastWeekDate = new Date()
  lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7)
  const lastWeekKey = weekKey(lastWeekDate)

  const thisWeekTrades = trades
    .filter((t) => weekKey(t.entryTime) === nowWeekKey)
    .map((t) => ({
      pnl: t.pnl,
      isWin: t.isWin,
      reasons: t.reasons.map((r) => r.name),
    }))
  const lastWeekTrades = trades
    .filter((t) => weekKey(t.entryTime) === lastWeekKey)
    .map((t) => ({
      pnl: t.pnl,
      isWin: t.isWin,
      reasons: t.reasons.map((r) => r.name),
    }))

  const thisWeek = buildWeeklySnapshot(thisWeekTrades)
  const lastWeek = buildWeeklySnapshot(lastWeekTrades)

  const thisStrong = new Set(
    thisWeek.topReasons.filter((r) => r.winRate >= 0.6).map((r) => r.name)
  )
  const lastStrong = new Set(
    lastWeek.topReasons.filter((r) => r.winRate >= 0.6).map((r) => r.name)
  )
  const newStrongReasons = [...thisStrong].filter((r) => !lastStrong.has(r))
  const newDecliningReasons = [...lastStrong].filter((r) => !thisStrong.has(r))

  const weekly: WeeklyComparison = {
    thisWeek,
    lastWeek,
    winRateDelta: thisWeek.winRate - lastWeek.winRate,
    pnlDelta: thisWeek.totalPnl - lastWeek.totalPnl,
    newStrongReasons,
    newDecliningReasons,
  }

  // ─── Action summary ───
  const actionSummary = {
    keep: reasons.filter((r) => r.action === 'KEEP'),
    test: reasons.filter((r) => r.action === 'TEST'),
    remove: reasons.filter((r) => r.action === 'REMOVE'),
    review: reasons.filter((r) => r.action === 'REVIEW'),
  }

  // Avoid unused var warning
  void RECENT_SLICE

  return { reasons, combos, weekly, actionSummary }
}
