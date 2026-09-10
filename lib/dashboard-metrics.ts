/**
 * JK TRADING — dashboard figures.
 *
 * Pure functions over closed trades, so what the dashboard shows can be tested.
 * Two corrections over the previous inline math:
 * - Days are grouped by the Asia/Jerusalem calendar day the trader lived through,
 *   not by UTC. A trade taken at 01:30 in Israel used to count on the day before.
 * - The equity series orders trades by exit time and falls back to entry time, so
 *   a trade saved without an exit time is no longer dropped from the curve.
 *
 * The win/loss convention (breakeven counts as a loss), the score weights and the
 * recovery rule are kept exactly as they were, so figures students already know
 * do not move.
 */
import { jerusalemDateKey } from './timezone'

export interface MetricTrade {
  entryTime: Date
  exitTime?: Date | null
  pnl: number | null
}

export interface DayTotal {
  pnl: number
  count: number
}

/** P&L and trade count per Jerusalem calendar day, keyed YYYY-MM-DD. */
export function dailyTotals(trades: readonly MetricTrade[]): Map<string, DayTotal> {
  const out = new Map<string, DayTotal>()
  for (const t of trades) {
    if (t.pnl == null || !Number.isFinite(t.pnl)) continue
    const key = jerusalemDateKey(t.entryTime)
    const cur = out.get(key) ?? { pnl: 0, count: 0 }
    cur.pnl += t.pnl
    cur.count += 1
    out.set(key, cur)
  }
  return out
}

export interface EquityPoint {
  /** Epoch ms at which the trade counts toward equity. */
  t: number
  key: string
  pnl: number
  equity: number
  /** Distance below the running peak: zero or negative. */
  drawdown: number
}

/** Cumulative P&L in close order, with the drawdown from the running peak. */
export function equitySeries(trades: readonly MetricTrade[]): EquityPoint[] {
  const ordered = trades
    .filter((t) => t.pnl != null && Number.isFinite(t.pnl))
    .map((t) => ({ t: (t.exitTime ?? t.entryTime).getTime(), pnl: t.pnl as number }))
    .sort((a, b) => a.t - b.t)

  let equity = 0
  let peak = 0
  return ordered.map(({ t, pnl }) => {
    equity += pnl
    if (equity > peak) peak = equity
    return { t, key: jerusalemDateKey(new Date(t)), pnl, equity, drawdown: equity - peak }
  })
}

export interface DashboardMetrics {
  trades: number
  netPnl: number
  wins: number
  losses: number
  winRate: number
  grossWins: number
  grossLosses: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  avgWinLossRatio: number
  tradingDays: number
  winDays: number
  lossDays: number
  dayWinRate: number
  maxDrawdown: number
  bestDay: { key: string; pnl: number } | null
  worstDay: { key: string; pnl: number } | null
}

export function computeMetrics(trades: readonly MetricTrade[]): DashboardMetrics {
  const closed = trades.filter(
    (t): t is MetricTrade & { pnl: number } => t.pnl != null && Number.isFinite(t.pnl),
  )
  const sum = (xs: readonly { pnl: number }[]) => xs.reduce((s, t) => s + t.pnl, 0)
  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl <= 0)
  const grossWins = sum(wins)
  const grossLosses = Math.abs(sum(losses))
  const avgWin = wins.length ? grossWins / wins.length : 0
  const avgLoss = losses.length ? sum(losses) / losses.length : 0

  const days = dailyTotals(closed)
  let winDays = 0
  let lossDays = 0
  let bestDay: { key: string; pnl: number } | null = null
  let worstDay: { key: string; pnl: number } | null = null
  for (const [key, v] of days) {
    if (v.pnl > 0) winDays += 1
    else if (v.pnl < 0) lossDays += 1
    if (!bestDay || v.pnl > bestDay.pnl) bestDay = { key, pnl: v.pnl }
    if (!worstDay || v.pnl < worstDay.pnl) worstDay = { key, pnl: v.pnl }
  }

  const maxDrawdown = equitySeries(closed).reduce((mx, p) => Math.max(mx, -p.drawdown), 0)

  return {
    trades: closed.length,
    netPnl: sum(closed),
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    grossWins,
    grossLosses,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
    avgWin,
    avgLoss,
    avgWinLossRatio: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
    tradingDays: days.size,
    winDays,
    lossDays,
    dayWinRate: days.size ? (winDays / days.size) * 100 : 0,
    maxDrawdown,
    bestDay,
    worstDay,
  }
}

/** Share of trading days whose result stays within 2.5× the average day. */
export function consistencyPct(dayPnls: readonly number[]): number {
  if (dayPnls.length === 0) return 0
  const avg = dayPnls.reduce((a, b) => a + b, 0) / dayPnls.length
  const within = dayPnls.filter((p) => Math.abs(p) <= Math.abs(avg * 2.5)).length
  return (within / dayPnls.length) * 100
}

/** Net result over the deepest drawdown; 5 when profitable with no drawdown. */
export function recoveryFactor(netPnl: number, maxDrawdown: number): number {
  return maxDrawdown > 0 ? netPnl / maxDrawdown : netPnl > 0 ? 5 : 0
}

/** The 0–100 performance score, with the same weights the dashboard always used. */
export function performanceScore(
  s: { winRate: number; profitFactor: number; avgWinLossRatio: number },
  consistency: number,
  recovery: number,
): number {
  return Math.min(
    100,
    Math.round(
      s.winRate * 0.3 +
        Math.min(s.profitFactor / 3, 1) * 100 * 0.25 +
        Math.min(s.avgWinLossRatio / 3, 1) * 100 * 0.2 +
        consistency * 0.15 +
        Math.min(Math.max(recovery / 5, 0), 1) * 100 * 0.1,
    ),
  )
}
