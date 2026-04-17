import { prisma } from './prisma'
import { Killzone, CyclePhase, Symbol as TradingSymbol } from '@prisma/client'

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

  const winningReasons = reasonRows
    .filter((r) => r.trades >= MIN_SAMPLE && r.winRate >= 0.55)
    .sort((a, b) => b.winRate * b.trades - a.winRate * a.trades)

  const losingReasons = reasonRows
    .filter((r) => r.trades >= MIN_SAMPLE && r.winRate <= 0.45)
    .sort((a, b) => (1 - a.winRate) * a.trades - (1 - b.winRate) * b.trades)

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

  // Day of week (UTC-based, same as killzone)
  const dowGroups = new Map<number, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const d = new Date(t.entryTime).getUTCDay()
    const arr = dowGroups.get(d) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    dowGroups.set(d, arr)
  }
  const dayOfWeekPerf = Array.from(dowGroups.entries())
    .map(([d, rows]) => makeRow(String(d), DAY_LABELS[d] ?? String(d), rows))
    .sort((a, b) => Number(a.key) - Number(b.key))

  // Hour of day (UTC)
  const hourGroups = new Map<number, { pnl: number; isWin: boolean }[]>()
  for (const t of enriched) {
    const h = new Date(t.entryTime).getUTCHours()
    const arr = hourGroups.get(h) ?? []
    arr.push({ pnl: t.pnlNum, isWin: t.isWin })
    hourGroups.set(h, arr)
  }
  const hourPerf = Array.from(hourGroups.entries())
    .map(([h, rows]) => makeRow(String(h), `${String(h).padStart(2, '0')}:00 UTC`, rows))
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

  // Daily equity curve
  const dailyMap = new Map<string, number>()
  for (const t of enriched) {
    const key = new Date(t.entryTime).toISOString().slice(0, 10)
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
