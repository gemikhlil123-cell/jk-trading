import { prisma } from './prisma'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

const MIN_APPEARANCES = 3

export interface TagAnalysis {
  tag: string
  category: string
  appearances: number
  wins: number
  losses: number
  winRate: number
  lossRate: number
  status: 'KEEP' | 'REMOVE' | 'NEUTRAL' | 'INSUFFICIENT'
}

export interface WeeklyAnalysis {
  tags: TagAnalysis[]
  keepList: TagAnalysis[]
  removeList: TagAnalysis[]
  neutralList: TagAnalysis[]
  totalTrades: number
  totalWins: number
  totalLosses: number
  overallWinRate: number
  weekStart: Date
  weekEnd: Date
}

/**
 * Returns keep/remove/neutral analysis for a student's trades in a given week.
 * @param userId - the student's ID
 * @param weekOffset - 0 = current week, 1 = last week, 2 = two weeks ago, etc.
 */
export async function getWeeklyAnalysis(
  userId: string,
  weekOffset: number = 0
): Promise<WeeklyAnalysis> {
  const now = new Date()
  const targetWeek = weekOffset > 0 ? subWeeks(now, weekOffset) : now
  const weekStart = startOfWeek(targetWeek, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 0 })

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      isBacktest: false,
      exitTime: { gte: weekStart, lte: weekEnd },
      pnl: { not: null },
    },
    include: {
      entryReasons: {
        include: { entryReason: true },
      },
    },
  })

  const totalTrades = trades.length
  const totalWins = trades.filter((t) => Number(t.pnl) > 0).length
  const totalLosses = trades.filter((t) => Number(t.pnl) <= 0).length
  const overallWinRate = totalTrades > 0 ? totalWins / totalTrades : 0

  // Aggregate per tag
  const tagMap = new Map<
    string,
    { category: string; appearances: number; wins: number; losses: number }
  >()

  for (const trade of trades) {
    const isWin = Number(trade.pnl) > 0
    for (const ter of trade.entryReasons) {
      const key = ter.entryReason.name
      const existing = tagMap.get(key) ?? {
        category: ter.entryReason.category,
        appearances: 0,
        wins: 0,
        losses: 0,
      }
      existing.appearances++
      if (isWin) existing.wins++
      else existing.losses++
      tagMap.set(key, existing)
    }
  }

  const tags: TagAnalysis[] = Array.from(tagMap.entries())
    .map(([tag, data]) => {
      const winRate = data.appearances > 0 ? data.wins / data.appearances : 0
      const lossRate = data.appearances > 0 ? data.losses / data.appearances : 0

      let status: TagAnalysis['status'] = 'NEUTRAL'
      if (data.appearances < MIN_APPEARANCES) {
        status = 'INSUFFICIENT'
      } else if (winRate > 0.7) {
        status = 'KEEP'
      } else if (lossRate > 0.6) {
        status = 'REMOVE'
      }

      return { tag, ...data, winRate, lossRate, status }
    })
    .sort((a, b) => b.winRate - a.winRate)

  return {
    tags,
    keepList: tags.filter((t) => t.status === 'KEEP'),
    removeList: tags.filter((t) => t.status === 'REMOVE'),
    neutralList: tags.filter((t) => t.status === 'NEUTRAL'),
    totalTrades,
    totalWins,
    totalLosses,
    overallWinRate,
    weekStart,
    weekEnd,
  }
}

/**
 * Returns all-time analysis (not scoped to a week).
 * Used for generating "Golden Rules" and "Red Flags" lists.
 */
export async function getAllTimeAnalysis(userId: string): Promise<WeeklyAnalysis> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      isBacktest: false,
      pnl: { not: null },
    },
    include: {
      entryReasons: { include: { entryReason: true } },
    },
  })

  const totalTrades = trades.length
  const totalWins = trades.filter((t) => Number(t.pnl) > 0).length
  const totalLosses = trades.filter((t) => Number(t.pnl) <= 0).length
  const overallWinRate = totalTrades > 0 ? totalWins / totalTrades : 0

  const tagMap = new Map<
    string,
    { category: string; appearances: number; wins: number; losses: number }
  >()

  for (const trade of trades) {
    const isWin = Number(trade.pnl) > 0
    for (const ter of trade.entryReasons) {
      const key = ter.entryReason.name
      const existing = tagMap.get(key) ?? {
        category: ter.entryReason.category,
        appearances: 0,
        wins: 0,
        losses: 0,
      }
      existing.appearances++
      if (isWin) existing.wins++
      else existing.losses++
      tagMap.set(key, existing)
    }
  }

  const tags: TagAnalysis[] = Array.from(tagMap.entries())
    .map(([tag, data]) => {
      const winRate = data.appearances > 0 ? data.wins / data.appearances : 0
      const lossRate = data.appearances > 0 ? data.losses / data.appearances : 0

      let status: TagAnalysis['status'] = 'NEUTRAL'
      if (data.appearances < MIN_APPEARANCES) {
        status = 'INSUFFICIENT'
      } else if (winRate > 0.7) {
        status = 'KEEP'
      } else if (lossRate > 0.6) {
        status = 'REMOVE'
      }

      return { tag, ...data, winRate, lossRate, status }
    })
    .sort((a, b) => b.winRate - a.winRate)

  return {
    tags,
    keepList: tags.filter((t) => t.status === 'KEEP'),
    removeList: tags.filter((t) => t.status === 'REMOVE'),
    neutralList: tags.filter((t) => t.status === 'NEUTRAL'),
    totalTrades,
    totalWins,
    totalLosses,
    overallWinRate,
    weekStart: new Date(0),
    weekEnd: new Date(),
  }
}
