/**
 * Goal progress computation for day-trader targets.
 * Periods are evaluated against the current calendar window.
 */

export type GoalMetric = 'PNL' | 'TRADE_COUNT' | 'WIN_RATE' | 'DISCIPLINE'
export type GoalPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface GoalInput {
  id: string
  metric: string
  period: string
  target: number
}

export interface GoalTrade {
  entryTime: Date
  pnl: number | null
}

export interface GoalJournal {
  date: Date
  disciplineRating: number | null
}

export const METRIC_LABELS: Record<string, string> = {
  PNL: 'الربح ($)',
  TRADE_COUNT: 'عدد الصفقات',
  WIN_RATE: 'نسبة النجاح (%)',
  DISCIPLINE: 'متوسط الانضباط (1-5)',
}

export const PERIOD_LABELS: Record<string, string> = {
  DAILY: 'يومي',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
}

/** Start of the current period window (local server time). */
export function periodStart(period: string, now = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (period === 'WEEKLY') {
    // Monday as week start
    const day = (d.getDay() + 6) % 7 // 0 = Monday
    d.setDate(d.getDate() - day)
  } else if (period === 'MONTHLY') {
    d.setDate(1)
  }
  return d
}

export interface GoalProgress {
  current: number
  target: number
  pct: number
  achieved: boolean
  unit: string
}

export function computeGoalProgress(
  goal: GoalInput,
  trades: GoalTrade[],
  journals: GoalJournal[],
  now = new Date()
): GoalProgress {
  const start = periodStart(goal.period, now)
  const periodTrades = trades.filter((t) => t.entryTime >= start && t.pnl !== null)
  const closed = periodTrades.filter((t) => t.pnl !== null)

  let current = 0
  let unit = ''
  switch (goal.metric) {
    case 'PNL':
      current = closed.reduce((s, t) => s + Number(t.pnl), 0)
      unit = '$'
      break
    case 'TRADE_COUNT':
      current = closed.length
      unit = 'صفقة'
      break
    case 'WIN_RATE': {
      const wins = closed.filter((t) => Number(t.pnl) > 0).length
      current = closed.length > 0 ? (wins / closed.length) * 100 : 0
      unit = '%'
      break
    }
    case 'DISCIPLINE': {
      const periodJournals = journals.filter(
        (j) => j.date >= start && j.disciplineRating != null
      )
      current =
        periodJournals.length > 0
          ? periodJournals.reduce((s, j) => s + (j.disciplineRating || 0), 0) /
            periodJournals.length
          : 0
      unit = '/5'
      break
    }
  }

  const target = goal.target
  const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0
  return { current, target, pct, achieved: current >= target, unit }
}
