/**
 * JK TRADING — محرّك قواعد نموذج JK (Deterministic rule engine)
 *
 * بيفحص كل صفقة مقابل قواعد النموذج المكتوبة في JK_LIQUIDITY_MSS_MODEL_HE.md.
 * حتمي بالكامل: بدون AI، بدون توكنز، نفس المدخل بيرجّع نفس النتيجة دائماً.
 *
 * الفكرة الأساسية: `followedPlan` مش شيك-بوكس بيعبّيه المتداول —
 * سبعة من تسع قواعد النموذج محسوبة أوتوماتيكياً من وقت الدخول والمخاطرة والهدف.
 * وهذا اللي بيخلّي "تكلفة كسر القواعد" رقم دقيق بدل تقدير شخصي.
 *
 * كل الأوقات بتوقيت America/New_York مع التوقيت الصيفي التلقائي.
 * النصوص للمستخدم مش هون — بنرجّع أكواد، والترجمة بتصير في messages/.
 */

// ─── Rule constants (from the JK model risk & time framework) ────────────────

export const JK_RULES = {
  /** 1 = Monday. The model blocks Monday entirely. */
  blockedWeekdays: [1] as readonly number[],
  /** Entry window opens 09:00 NY. */
  windowOpenMin: 9 * 60,
  /** Entry window closes 10:30 NY. */
  windowCloseMin: 10 * 60 + 30,
  /** 09:30 NY splits the two daily slots and halves the risk cap before it. */
  slotSplitMin: 9 * 60 + 30,
  /** One trade before 09:30 and one from 09:30 onward. */
  maxTradesPerDay: 2,
  /** Planned risk ceiling — a cap, not a target. */
  baseRiskCapUsd: 600,
  /** 5 = Friday. Halves the risk cap. */
  halfRiskWeekday: 5,
  /** Target must be the next significant liquidity AND allow at least 2R. */
  minPlannedR: 2,
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

export type RuleCode =
  | 'MONDAY_BLOCKED'
  | 'OUTSIDE_ENTRY_WINDOW'
  | 'DAILY_TRADE_LIMIT'
  | 'SLOT_ALREADY_USED'
  | 'RISK_OVER_CAP'
  | 'TARGET_BELOW_2R'
  | 'CISD_NO_RETEST'
  | 'MSS_NOT_CONFIRMED'

export type RuleSeverity = 'BLOCKING' | 'WARNING'

export interface RuleViolation {
  code: RuleCode
  severity: RuleSeverity
  /** Machine-readable values for the UI to interpolate into translated copy. */
  actual?: number | string
  limit?: number | string
}

export type TradeSlot = 'EARLY' | 'LATE'

export interface JkRuleInput {
  entryTime: Date
  direction: 'LONG' | 'SHORT'
  entryPrice?: number | null
  stopPrice?: number | null
  targetPrice?: number | null
  /** Planned dollar risk at entry. */
  riskAmount?: number | null
  entryTrigger?: 'FVG' | 'IFVG' | 'CISD' | null
  /** CISD entries must wait for the retest — never the first cross. */
  cisdRetested?: boolean | null
  /** MSS must be the swing that led to the sweep/SMT event. */
  mssConfirmed?: boolean | null
  /**
   * The trader's other trades on the same NY session day.
   * Pass every trade of that day except this one; entries outside the day are ignored.
   */
  sameDayTrades?: readonly { entryTime: Date }[]
}

export interface RuleCheck {
  /** True when no BLOCKING violation fired. Warnings do not break the plan. */
  followedPlan: boolean
  violations: RuleViolation[]
  /** The risk cap that applied to this specific entry, in dollars. */
  riskCapUsd: number
  /** Reward-to-risk implied by entry/stop/target, or null when data is missing. */
  plannedR: number | null
  slot: TradeSlot
  /** YYYY-MM-DD in NY local time — the session day this trade belongs to. */
  nyDayKey: string
  /** Rules that could not be evaluated because a field was empty. */
  unchecked: RuleCode[]
}

// ─── New York clock ──────────────────────────────────────────────────────────

const NY_TZ = 'America/New_York'

const nyParts = new Intl.DateTimeFormat('en-US', {
  timeZone: NY_TZ,
  hour12: false,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export interface NyClock {
  /** 0 = Sunday … 6 = Saturday, in New York local time. */
  weekday: number
  /** Minutes since NY midnight. */
  minutes: number
  /** YYYY-MM-DD in NY local time. */
  dayKey: string
}

/** Read a Date as New York wall-clock time, DST included. */
export function nyClock(d: Date): NyClock {
  const parts = nyParts.formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  // en-US with hour12:false renders midnight as "24"; fold it back to 0.
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return {
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    minutes: hour * 60 + minute,
    dayKey: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

// ─── Derived values ──────────────────────────────────────────────────────────

/** Which of the two daily slots an entry falls into. */
export function slotOf(clock: NyClock): TradeSlot {
  return clock.minutes < JK_RULES.slotSplitMin ? 'EARLY' : 'LATE'
}

/**
 * The dollar risk cap for a given entry time.
 * Friday halves it; before 09:30 halves it; both together give $150.
 */
export function riskCapFor(clock: NyClock): number {
  let cap: number = JK_RULES.baseRiskCapUsd
  if (clock.weekday === JK_RULES.halfRiskWeekday) cap /= 2
  if (clock.minutes < JK_RULES.slotSplitMin) cap /= 2
  return cap
}

/** Reward-to-risk from entry, stop and target. Null when the inputs can't produce one. */
export function plannedR(input: Pick<JkRuleInput, 'entryPrice' | 'stopPrice' | 'targetPrice' | 'direction'>): number | null {
  const { entryPrice, stopPrice, targetPrice, direction } = input
  if (entryPrice == null || stopPrice == null || targetPrice == null) return null
  const risk = direction === 'LONG' ? entryPrice - stopPrice : stopPrice - entryPrice
  const reward = direction === 'LONG' ? targetPrice - entryPrice : entryPrice - targetPrice
  if (!(risk > 0)) return null
  return reward / risk
}

// ─── The check ───────────────────────────────────────────────────────────────

/**
 * Validate one trade against the JK model.
 *
 * Seven rules are decided from data alone. Two — the CISD retest and the MSS
 * swing — depend on the trader's own reading of the chart, so they only fire
 * when the trader explicitly marked them false; leaving them empty reports the
 * rule as unchecked rather than as followed.
 */
export function checkJkRules(input: JkRuleInput): RuleCheck {
  const clock = nyClock(input.entryTime)
  const violations: RuleViolation[] = []
  const unchecked: RuleCode[] = []
  const slot = slotOf(clock)
  const riskCapUsd = riskCapFor(clock)
  const rr = plannedR(input)

  // 1 — Monday is blocked.
  if (JK_RULES.blockedWeekdays.includes(clock.weekday)) {
    violations.push({ code: 'MONDAY_BLOCKED', severity: 'BLOCKING' })
  }

  // 2 — Entry window 09:00–10:30 NY.
  if (clock.minutes < JK_RULES.windowOpenMin || clock.minutes >= JK_RULES.windowCloseMin) {
    violations.push({
      code: 'OUTSIDE_ENTRY_WINDOW',
      severity: 'BLOCKING',
      actual: minutesToHHMM(clock.minutes),
      limit: `${minutesToHHMM(JK_RULES.windowOpenMin)}–${minutesToHHMM(JK_RULES.windowCloseMin)}`,
    })
  }

  // 3 — At most two trades a day, one per slot.
  const sameDay = (input.sameDayTrades ?? [])
    .map((t) => nyClock(t.entryTime))
    .filter((c) => c.dayKey === clock.dayKey)

  if (sameDay.length + 1 > JK_RULES.maxTradesPerDay) {
    violations.push({
      code: 'DAILY_TRADE_LIMIT',
      severity: 'BLOCKING',
      actual: sameDay.length + 1,
      limit: JK_RULES.maxTradesPerDay,
    })
  } else if (sameDay.some((c) => slotOf(c) === slot)) {
    violations.push({ code: 'SLOT_ALREADY_USED', severity: 'BLOCKING', actual: slot })
  }

  // 4/5 — Planned risk within the cap for this slot and weekday.
  if (input.riskAmount == null) {
    unchecked.push('RISK_OVER_CAP')
  } else if (input.riskAmount > riskCapUsd) {
    violations.push({
      code: 'RISK_OVER_CAP',
      severity: 'BLOCKING',
      actual: round2(input.riskAmount),
      limit: riskCapUsd,
    })
  }

  // 6 — Target must allow at least 2R, or the trade is rejected.
  if (rr == null) {
    unchecked.push('TARGET_BELOW_2R')
  } else if (rr < JK_RULES.minPlannedR) {
    violations.push({
      code: 'TARGET_BELOW_2R',
      severity: 'BLOCKING',
      actual: round2(rr),
      limit: JK_RULES.minPlannedR,
    })
  }

  // 7 — CISD entries wait for the retest, never the first cross.
  if (input.entryTrigger === 'CISD') {
    if (input.cisdRetested == null) unchecked.push('CISD_NO_RETEST')
    else if (!input.cisdRetested) {
      violations.push({ code: 'CISD_NO_RETEST', severity: 'BLOCKING' })
    }
  }

  // 8 — MSS must be the swing that led to the event.
  if (input.mssConfirmed == null) unchecked.push('MSS_NOT_CONFIRMED')
  else if (!input.mssConfirmed) {
    violations.push({ code: 'MSS_NOT_CONFIRMED', severity: 'BLOCKING' })
  }

  return {
    followedPlan: !violations.some((v) => v.severity === 'BLOCKING'),
    violations,
    riskCapUsd,
    plannedR: rr,
    slot,
    nyDayKey: clock.dayKey,
    unchecked,
  }
}

// ─── Aggregate: what the rule breaks actually cost ───────────────────────────

export interface RuleBreakCost {
  /** Trades that broke at least one blocking rule. */
  brokenCount: number
  /** Trades checked (those with a decided followedPlan). */
  checkedCount: number
  /** Share of checked trades that followed the plan, 0–100. */
  adherencePct: number
  /** Net P&L of the rule-breaking trades. Usually the number that changes behaviour. */
  costUsd: number
  /** Net P&L of the compliant trades, for the side-by-side comparison. */
  compliantPnlUsd: number
  /** Per-rule breakdown, most expensive first. */
  byRule: { code: RuleCode; n: number; pnlUsd: number }[]
}

/**
 * Aggregate the cost of broken rules across a set of trades.
 * Trades whose plan status was never decided are excluded from every figure.
 */
export function ruleBreakCost(
  trades: readonly {
    pnl: number | null
    followedPlan: boolean | null
    violations?: readonly RuleViolation[] | null
  }[],
): RuleBreakCost {
  const checked = trades.filter((t) => t.followedPlan != null)
  const broken = checked.filter((t) => t.followedPlan === false)

  const byRule = new Map<RuleCode, { n: number; pnlUsd: number }>()
  for (const t of broken) {
    const pnl = t.pnl ?? 0
    for (const v of t.violations ?? []) {
      if (v.severity !== 'BLOCKING') continue
      const row = byRule.get(v.code) ?? { n: 0, pnlUsd: 0 }
      row.n += 1
      row.pnlUsd += pnl
      byRule.set(v.code, row)
    }
  }

  return {
    brokenCount: broken.length,
    checkedCount: checked.length,
    adherencePct: checked.length
      ? ((checked.length - broken.length) / checked.length) * 100
      : 0,
    costUsd: sum(broken.map((t) => t.pnl ?? 0)),
    compliantPnlUsd: sum(
      checked.filter((t) => t.followedPlan === true).map((t) => t.pnl ?? 0),
    ),
    byRule: mapToRows(byRule).sort((a, b) => a.pnlUsd - b.pnlUsd),
  }
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Map -> array without spreading an iterator, which the project's target rejects. */
function mapToRows(
  m: Map<RuleCode, { n: number; pnlUsd: number }>,
): { code: RuleCode; n: number; pnlUsd: number }[] {
  const rows: { code: RuleCode; n: number; pnlUsd: number }[] = []
  m.forEach((row, code) => rows.push({ code, n: row.n, pnlUsd: row.pnlUsd }))
  return rows
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}
