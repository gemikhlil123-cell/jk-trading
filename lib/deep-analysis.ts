import { prisma } from './prisma'
import { Killzone, CyclePhase, Symbol as TradingSymbol } from '@prisma/client'
import { jerusalemHour, jerusalemDayOfWeek, jerusalemDateKey } from './timezone'

const MIN_SAMPLE = 3
const STRONG_WIN = 0.65
const STRONG_LOSS = 0.5

export interface DeepFilters {
  isBacktest: boolean
  symbol?: TradingSymbol
  killzone?: Killzone
  from?: Date
  to?: Date
}

export interface BreakdownRow {
  key: string
  label: string
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
  status: 'STRONG' | 'WEAK' | 'NEUTRAL' | 'INSUFFICIENT'
}

export interface ReasonRow extends BreakdownRow {
  category: string
}

export interface StreakInfo {
  currentStreak: number
  currentStreakType: 'WIN' | 'LOSS' | 'NONE'
  longestWinStreak: number
  longestLossStreak: number
}

export interface DeepAnalysis {
  totalTrades: number
  totalWins: number
  totalLosses: number
  winRate: number
  totalPnl: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  expectancy: number
  best10Recent: number
  worst10Recent: number
  winningReasons: ReasonRow[]
  losingReasons: ReasonRow[]
  killzonePerf: BreakdownRow[]
  cycleperf: BreakdownRow[]
  symbolPerf: BreakdownRow[]
  dayOfWeekPerf: BreakdownRow[]
  hourPerf: BreakdownRow[]
  directionPerf: BreakdownRow[]
  streak: StreakInfo
  dailyEquity: { date: string; pnl: number; cumulative: number }[]
  filters: DeepFilters
}

const KILLZONE_LABELS: Record<Killzone, string> = {
  ASIA: 'آسيا',
  LONDON: 'لندن',
  NY_AM: 'نيويورك صباح',
  NY_PM: 'نيويورك مساء',
  OFF_HOURS: 'خارج الجلسات',
}

const CYCLE_LABELS: Record<CyclePhase, string> = {
  CYCLE_1: 'السايكل الأول (0–90د)',
  CYCLE_2: 'السايكل الثاني (90–180د)',
  CYCLE_3: 'السايكل الثالث (180–270د)',
  OFF_CYCLE: 'خارج السايكل',
}

const DAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function getKillzoneLabel(k: Killzone | string): string {
  return KILLZONE_LABELS[k as Killzone] ?? k
}

export function getCycleLabel(c: CyclePhase | string): string {
  return CYCLE_LABELS[c as CyclePhase] ?? c
}

function classify(trades: number, winRate: number): BreakdownRow['status'] {
  if (trades < MIN_SAMPLE) return 'INSUFFICIENT'
  if (winRate >= STRONG_WIN) return 'STRONG'
  if (winRate <= STRONG_LOSS) return 'WEAK'
  return 'NEUTRAL'
}

function makeRow(
  key: string,
  label: string,
  rows: { pnl: number; isWin: boolean }[]
): BreakdownRow {
  const trades = rows.length
  const wins = rows.filter((r) => r.isWin).length
  const losses = trades - wins
  const winRate = trades > 0 ? wins / trades : 0
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0)
  const avgPnl = trades > 0 ? totalPnl / trades : 0
  return {
    key,
    label,
    trades,
    wins,
    losses,
    winRate,
    totalPnl,
    avgPnl,
    status: classify(trades, winRate),
  }
}

export async function getDeepAnalysis(
  userId: string,
  filters: DeepFilters
): Promise<DeepAnalysis> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      isBacktest: filters.isBacktest,
      pnl: { not: null },
      ...(filters.symbol ? { symbol: filters.symbol } : {}),
      ...(filters.killzone ? { killzone: filters.killzone } : {}),
      ...(filters.from || filters.to
        ? {
            entryTime: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: {
      entryReasons: { include: { entryReason: true } },
    },
    orderBy: { entryTime: 'asc' },
  })

  const enriched = trades.map((t) => ({
    ...t,
    pnlNum: Number(t.pnl ?? 0),
    isWin: Number(t.pnl ?? 0) > 0,
  }))

  const totalTrades = enriched.length
  const wins = enriched.filter((t) => t.isWin)
  const losses = enriched.filter((t) => !t.isWin)
  const totalWins = wins.length
  const totalLosses = losses.length
  const winRate = totalTrades > 0 ? totalWins / totalTrades : 0
  const totalPnl = enriched.reduce((s, t) => s + t.pnlNum, 0)
  const sumWins = wins.reduce((s, t) => s + t.pnlNum, 0)
  const sumLossAbs = Math.abs(losses.reduce((s, t) => s + t.pnlNum, 0))
  const avgWin = totalWins > 0 ? sumWins / totalWins : 0
  const avgLoss = totalLosses > 0 ? sumLossAbs / totalLosses : 0
  const profitFactor = sumLossAbs > 0 ? sumWins / sumLossAbs : sumWins > 0 ? 99 : 0
  const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0

  // Recent trend (last 10)
  const last10 = enriched.slice(-10)
  const best10Recent = last10.length > 0 ? last10.filter((t) => t.isWin).length / last10.length : 0
  const worst10Recent = 1 - best10Recent

  // Entry reasons breakdown
  const reasonMap = new Map<string, { category: string; rows: { pnl: number; isWin: boolean }[] }>()
  for (const t of enriched) {
    for (const ter of t.entryReasons) {
      const key = ter.entryReason.name
      const existing = reasonMap.get(key) ?? {
        category: ter.entryReason.category,
        rows: [],
      }
      existing.rows.push({ pnl: t.pnlNum, isWin: t.isWin })
      reasonMap.set(key, existing)
    }
  }

  const reasonRows: ReasonRow[] = Array.from(reasonMap.entries()).map(([name, data]) => ({
    ...makeRow(name, name, data.rows),
    category: data.category,
  }))

  // Winning reasons: min sample, winRate >= 60%, AND positive total PnL
  // Score = winRate × sample_weight × positive_pnl_weight (all 3 matter)
  const winningReasons = reasonRows
    .filter((r) => r.trades >= MIN_SAMPLE && r.winRate >= 0.6 && r.totalPnl > 0)
    .sort((a, b) => {
      const scoreA = a.winRate * Math.min(a.trades, 10) * Math.max(a.avgPnl, 1)
      const scoreB = b.winRate * Math.min(b.trades, 10) * Math.max(b.avgPnl, 1)
      return scoreB - scoreA
    })

  const winningReasonNames = new Set(winningReasons.map((r) => r.key))

  // Losing reasons: must NOT be in winning list, AND (winRate <= 45% OR negative PnL)
  // Score by how much damage — weight by (1-winRate) × trades × loss magnitude
  const losingReasons = reasonRows
    .filter(
      (r) =>
        !winningReasonNames.has(r.key) &&
        r.trades >= MIN_SAMPLE &&
        (r.winRate <= 0.45 || r.totalPnl < 0)
    )
    .sort((a, b) => {
      const harmA = (1 - a.winRate) * a.trades + Math.max(-a.totalPnl, 0) / 100
      const harmB = (1 - b.winRate) * b.trades + Math.max(-b.totalPnl, 0) / 100
      return harmB - harmA
    })

  // Killzone breakdown
  const killzoneGroups = new Map<string, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const key = t.killzone ?? 'OFF_HOURS'
    const arr = killzoneGroups.get(key) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    killzoneGroups.set(key, arr)
  }
  const killzonePerf = Array.from(killzoneGroups.entries())
    .map(([key, rows]) => makeRow(key, getKillzoneLabel(key), rows))
    .sort((a, b) => b.totalPnl - a.totalPnl)

  // Cycle breakdown
  const cycleGroups = new Map<string, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const key = t.cyclePhase ?? 'OFF_CYCLE'
    const arr = cycleGroups.get(key) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    cycleGroups.set(key, arr)
  }
  const cycleperf = Array.from(cycleGroups.entries())
    .map(([key, rows]) => makeRow(key, getCycleLabel(key), rows))
    .sort((a, b) => b.totalPnl - a.totalPnl)

  // Symbol breakdown
  const symbolGroups = new Map<string, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const arr = symbolGroups.get(t.symbol) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    symbolGroups.set(t.symbol, arr)
  }
  const symbolPerf = Array.from(symbolGroups.entries())
    .map(([key, rows]) => makeRow(key, key, rows))
    .sort((a, b) => b.totalPnl - a.totalPnl)

  // Day of week — Asia/Jerusalem timezone (matches what user typed)
  const dowGroups = new Map<number, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const d = jerusalemDayOfWeek(new Date(t.entryTime))
    const arr = dowGroups.get(d) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    dowGroups.set(d, arr)
  }
  const dayOfWeekPerf = Array.from(dowGroups.entries())
    .map(([d, rows]) => makeRow(String(d), DAY_LABELS[d] ?? String(d), rows))
    .sort((a, b) => Number(a.key) - Number(b.key))

  // Hour of day — Asia/Jerusalem timezone (matches what user typed in the form)
  const hourGroups = new Map<number, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const h = jerusalemHour(new Date(t.entryTime))
    const arr = hourGroups.get(h) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    hourGroups.set(h, arr)
  }
  const hourPerf = Array.from(hourGroups.entries())
    .map(([h, rows]) => makeRow(String(h), `${String(h).padStart(2, '0')}:00`, rows))
    .sort((a, b) => Number(a.key) - Number(b.key))

  // Direction breakdown
  const dirGroups = new Map<string, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const arr = dirGroups.get(t.direction) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    dirGroups.set(t.direction, arr)
  }
  const directionPerf = Array.from(dirGroups.entries())
    .map(([dir, rows]) =>
      makeRow(dir, dir === 'LONG' ? 'شراء (LONG)' : 'بيع (SHORT)', rows)
    )

  // Streak analysis
  let currentStreak = 0
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE'
  let longestWinStreak = 0
  let longestLossStreak = 0
  let runWin = 0
  let runLoss = 0
  for (const t of enriched) {
    if (t.isWin) {
      runWin++
      runLoss = 0
      longestWinStreak = Math.max(longestWinStreak, runWin)
    } else {
      runLoss++
      runWin = 0
      longestLossStreak = Math.max(longestLossStreak, runLoss)
    }
  }
  if (enriched.length > 0) {
    const last = enriched[enriched.length - 1]
    if (last.isWin) {
      currentStreakType = 'WIN'
      currentStreak = runWin
    } else {
      currentStreakType = 'LOSS'
      currentStreak = runLoss
    }
  }

  // Daily equity curve — Asia/Jerusalem date keys (a trade at 01:00 Jerusalem
  // should count on its Jerusalem date, not the UTC date from the night before).
  const dailyMap = new Map<string, number>()
  for (const t of enriched) {
    const key = jerusalemDateKey(new Date(t.entryTime))
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + t.pnlNum)
  }
  const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  let cum = 0
  const dailyEquity = sortedDays.map(([date, pnl]) => {
    cum += pnl
    return { date, pnl, cumulative: cum }
  })

  return {
    totalTrades,
    totalWins,
    totalLosses,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    best10Recent,
    worst10Recent,
    winningReasons,
    losingReasons,
    killzonePerf,
    cycleperf,
    symbolPerf,
    dayOfWeekPerf,
    hourPerf,
    directionPerf,
    streak: {
      currentStreak,
      currentStreakType,
      longestWinStreak,
      longestLossStreak,
    },
    dailyEquity,
    filters,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Personalized narrative builder
// ──────────────────────────────────────────────────────────────────────────

export interface TraderNarrative {
  headline: string                // one-line summary
  workingReasons: string[]        // bullet sentences describing what works
  losingReasons: string[]         // bullet sentences describing what doesn't
  bestCombos: string[]            // 3-reason combos that repeated & succeeded
  bestHours: string[]             // best hours in Jerusalem local time
  bestDays: string[]              // best days of week
  bestSession: string | null      // strongest killzone
  weakSession: string | null      // weakest killzone
  overall: string                 // final verdict / advice
}

function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? '+' : ''}${Math.round(n)}`
}

interface TripleLike {
  names: [string, string, string]
  trades: number
  wins: number
  winRate: number
  totalPnl: number
  expectancy: number
}

/**
 * Build a professional Arabic narrative from a user's deep analysis —
 * exactly what worked, what didn't, best hours/days/sessions, and top 3-way combos.
 *
 * Pass in the `triples` array from getStrategyAnalysis if you want combo lines.
 */
export function buildTraderNarrative(
  deep: DeepAnalysis,
  triples: TripleLike[] = []
): TraderNarrative {
  const n: TraderNarrative = {
    headline: '',
    workingReasons: [],
    losingReasons: [],
    bestCombos: [],
    bestHours: [],
    bestDays: [],
    bestSession: null,
    weakSession: null,
    overall: '',
  }

  if (deep.totalTrades === 0) {
    n.headline = 'لا توجد صفقات كافية للتحليل بعد.'
    n.overall = 'ابدأ بتسجيل صفقاتك (حقيقية أو باكتست) وستحصل على تحليل شخصي كامل.'
    return n
  }

  // Headline
  n.headline =
    `وفقاً لتحليل ${deep.totalTrades} صفقة — نسبة نجاحك ${fmtPct(deep.winRate)}، ` +
    `ربحت ${deep.totalWins} وخسرت ${deep.totalLosses}، ` +
    `والإجمالي ${fmtSigned(deep.totalPnl)} نقطة` +
    (deep.profitFactor > 0 ? ` (Profit Factor ${deep.profitFactor.toFixed(2)}).` : '.')

  // Working reasons
  for (const r of deep.winningReasons.slice(0, 5)) {
    n.workingReasons.push(
      `**${r.label}** اشتغل معك في ${r.trades} صفقة — نجاح ${fmtPct(r.winRate)} (${r.wins} ربح / ${r.losses} خسارة)، إجمالي ${fmtSigned(r.totalPnl)} نقطة.`
    )
  }

  // Losing reasons
  for (const r of deep.losingReasons.slice(0, 5)) {
    n.losingReasons.push(
      `**${r.label}** ما اشتغل — ${r.trades} صفقة بنجاح ${fmtPct(r.winRate)} فقط، إجمالي ${fmtSigned(r.totalPnl)} نقطة. فكّر بتقليله أو حذفه من خطتك.`
    )
  }

  // Triple combos — user's specific request
  // "نقاط الدخول الي تكرروا ونجحوا باستمرار هم X + Y + Z"
  const goodTriples = triples
    .filter((t) => t.trades >= 3 && t.winRate >= 0.6 && t.totalPnl > 0)
    .sort((a, b) => {
      const sa = a.winRate * Math.min(a.trades, 20) + a.expectancy / 10
      const sb = b.winRate * Math.min(b.trades, 20) + b.expectancy / 10
      return sb - sa
    })
    .slice(0, 5)

  for (const t of goodTriples) {
    n.bestCombos.push(
      `**${t.names.join(' + ')}** — ظهر ${t.trades} مرة بنجاح ${fmtPct(t.winRate)} (${t.wins} ربح) وإجمالي ${fmtSigned(t.totalPnl)} نقطة.`
    )
  }

  // If no "good" triples qualify by strict criteria, show the most-repeated triples as-is
  if (n.bestCombos.length === 0 && triples.length > 0) {
    const topByFrequency = [...triples]
      .sort((a, b) => b.trades - a.trades || b.winRate - a.winRate)
      .slice(0, 3)
    for (const t of topByFrequency) {
      n.bestCombos.push(
        `**${t.names.join(' + ')}** — ظهر ${t.trades} مرة بنجاح ${fmtPct(t.winRate)}.`
      )
    }
  }

  // Best hours (Jerusalem time) — sorted by win rate among those with ≥3 trades
  const strongHours = deep.hourPerf
    .filter((h) => h.trades >= 3 && h.winRate >= 0.6)
    .sort((a, b) => b.winRate - a.winRate || b.trades - a.trades)
    .slice(0, 5)
  for (const h of strongHours) {
    n.bestHours.push(
      `الساعة ${h.label} — ${h.trades} صفقة بنجاح ${fmtPct(h.winRate)} (${fmtSigned(h.totalPnl)} نقطة).`
    )
  }

  // Best days
  const strongDays = deep.dayOfWeekPerf
    .filter((d) => d.trades >= 3 && d.winRate >= 0.55)
    .sort((a, b) => b.winRate - a.winRate || b.trades - a.trades)
    .slice(0, 3)
  for (const d of strongDays) {
    n.bestDays.push(
      `${d.label} — ${d.trades} صفقة بنجاح ${fmtPct(d.winRate)} (${fmtSigned(d.totalPnl)} نقطة).`
    )
  }

  // Sessions — best & worst
  const sessionsWithData = deep.killzonePerf.filter((k) => k.trades >= 3)
  if (sessionsWithData.length > 0) {
    const best = [...sessionsWithData].sort((a, b) => b.winRate - a.winRate)[0]
    const worst = [...sessionsWithData].sort((a, b) => a.winRate - b.winRate)[0]
    if (best.winRate >= 0.55) {
      n.bestSession = `${best.label} — ${best.trades} صفقة بنجاح ${fmtPct(best.winRate)} وإجمالي ${fmtSigned(best.totalPnl)} نقطة.`
    }
    if (worst !== best && worst.winRate <= 0.45) {
      n.weakSession = `${worst.label} — ${worst.trades} صفقة بنجاح ${fmtPct(worst.winRate)} فقط (${fmtSigned(worst.totalPnl)} نقطة). جرّب تقليل الدخول فيها.`
    }
  }

  // Overall verdict
  const hasStrongCombos = n.bestCombos.length > 0
  const hasStrongReasons = n.workingReasons.length > 0
  const hasWeakSpots = n.losingReasons.length > 0 || n.weakSession

  if (deep.winRate >= 0.6 && hasStrongCombos) {
    n.overall =
      `خطتك واضحة: ركّز على الكومبوهات التي أثبتت نجاحها` +
      (n.bestSession ? ` في ${n.bestSession.split('—')[0].trim()}` : '') +
      `${hasWeakSpots ? '، وقلّل من نقاط الضعف المذكورة أعلاه' : ''}. ` +
      `استمر بنفس الانضباط.`
  } else if (deep.winRate >= 0.5 && hasStrongReasons) {
    n.overall =
      `أداؤك إيجابي لكن يمكن تحسينه — ركّز على الأسباب الرابحة، ` +
      `تجنّب ${hasWeakSpots ? 'الأسباب والأوقات الضعيفة المذكورة' : 'الدخول العشوائي'}، ` +
      `وتابع جمع بيانات أكثر لتثبت أفضل كومبوهاتك.`
  } else if (hasStrongReasons) {
    n.overall =
      `نسبة النجاح الإجمالية ${fmtPct(deep.winRate)} — لكن لديك أسباب رابحة يمكن البناء عليها. ` +
      `اترك ما لا يعمل، وضاعف من ${n.workingReasons[0].split('**')[1] ?? 'أقوى سبب ناجح'}.`
  } else {
    n.overall =
      `تحتاج لتسجيل صفقات أكثر لاستخلاص نقاط قوتك. ` +
      `ركّز على التوثيق الدقيق لكل سبب دخول ووقته.`
  }

  return n
}
