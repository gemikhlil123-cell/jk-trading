/**
 * Server-side wrapper around the JK rule engine.
 *
 * `lib/jk-rules.ts` stays pure and database-free so it can be unit-tested; this
 * module is the only place that reaches for Prisma. It supplies the one input
 * the pure engine cannot derive on its own — the trader's other trades on the
 * same New York session day, which the daily-limit and slot rules need.
 */
import { prisma } from './prisma'
import { checkJkRules, type JkRuleInput, type RuleCheck } from './jk-rules'

/** The columns a rule check writes back onto the trade row. */
export interface RuleCheckPersist {
  followedPlan: boolean
  ruleViolations: string
  rulesCheckedAt: Date
}

/**
 * A window wide enough to contain the whole NY session day for any UTC entry
 * time; the pure engine narrows it down by comparing NY day keys.
 */
const DAY_WINDOW_MS = 36 * 60 * 60 * 1000

export async function checkTradeRules(params: {
  userId: string
  entryTime: Date
  /** Backtest trades are counted against other backtests, never against live ones. */
  isBacktest: boolean
  /** Set when re-checking an existing trade so it does not count itself. */
  excludeTradeId?: string
  input: Omit<JkRuleInput, 'entryTime' | 'sameDayTrades'>
}): Promise<{ check: RuleCheck; persist: RuleCheckPersist }> {
  const neighbours = await prisma.trade.findMany({
    where: {
      userId: params.userId,
      isBacktest: params.isBacktest,
      entryTime: {
        gte: new Date(params.entryTime.getTime() - DAY_WINDOW_MS),
        lte: new Date(params.entryTime.getTime() + DAY_WINDOW_MS),
      },
      ...(params.excludeTradeId ? { id: { not: params.excludeTradeId } } : {}),
    },
    select: { entryTime: true },
  })

  const check = checkJkRules({
    ...params.input,
    entryTime: params.entryTime,
    sameDayTrades: neighbours,
  })

  return {
    check,
    persist: {
      followedPlan: check.followedPlan,
      ruleViolations: JSON.stringify(check.violations),
      rulesCheckedAt: new Date(),
    },
  }
}
