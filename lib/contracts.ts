/**
 * JK TRADING — مواصفات العقود (Contract specifications)
 *
 * بيحوّل النقاط لدولارات. بدون هالتحويل، قواعد المخاطرة بالدولار ($600 سقف،
 * $150 يوم الجمعة قبل 9:30) ما بتقدر تشتغل، وثبات حجم المخاطرة ما بينقاس.
 *
 * "Point" here means one full unit of price (1.00), not one tick. NQ moves in
 * ticks of 0.25, so one point is four ticks and worth $20 on a full contract.
 *
 * The CME futures values below are contract specifications, not estimates.
 * The three marked `assumed` are instruments whose sizing depends on how the
 * broker defines the lot, so they are a starting point the mentor should
 * confirm rather than a fact — `isAssumed()` reports which.
 */

export interface ContractSpec {
  /** Smallest price increment. */
  tickSize: number
  /** Dollars earned per contract when price moves one tick. */
  tickValueUsd: number
  /** Dollars per full point (1.00) per contract — derived from the two above. */
  pointValueUsd: number
  /** Display label. */
  label: string
  /**
   * True when the sizing depends on broker or lot convention rather than a
   * published contract spec. These need confirming before the dollar rules
   * can be trusted for that instrument.
   */
  assumed?: boolean
}

function spec(label: string, tickSize: number, tickValueUsd: number, assumed = false): ContractSpec {
  return {
    label,
    tickSize,
    tickValueUsd,
    pointValueUsd: tickValueUsd / tickSize,
    ...(assumed ? { assumed: true } : {}),
  }
}

/** Keyed by the Symbol enum in prisma/schema.prisma. */
export const CONTRACTS: Record<string, ContractSpec> = {
  // ─── CME futures — published contract specifications ───
  NQ: spec('E-mini Nasdaq-100', 0.25, 5.0),      // $20 / point
  ES: spec('E-mini S&P 500', 0.25, 12.5),        // $50 / point
  GC: spec('Gold futures', 0.1, 10.0),           // $100 / point
  CL: spec('Crude oil futures', 0.01, 10.0),     // $1,000 / point

  // ─── Sizing depends on the broker's lot convention — confirm before trusting ───
  BTC: spec('Bitcoin futures', 5.0, 25.0, true),     // CME BTC = 5 coins/contract
  XAU: spec('Spot gold', 0.01, 1.0, true),           // assumes a 100 oz lot
  EURUSD: spec('EUR/USD', 0.0001, 10.0, true),       // assumes a 100k standard lot

  OTHER: spec('Other', 1, 1, true),
}

export function getContract(symbol: string): ContractSpec | null {
  return CONTRACTS[symbol?.toUpperCase()] ?? null
}

/** True when this instrument's sizing is a starting assumption, not a spec. */
export function isAssumed(symbol: string): boolean {
  return getContract(symbol)?.assumed === true
}

/**
 * Convert a move in points into dollars.
 * Returns null for an unknown symbol rather than guessing a value — a wrong
 * dollar figure in a risk rule is worse than no figure at all.
 */
export function pointsToUsd(symbol: string, points: number, quantity = 1): number | null {
  const c = getContract(symbol)
  if (!c || !Number.isFinite(points) || !Number.isFinite(quantity)) return null
  return points * c.pointValueUsd * quantity
}

/** Dollars back into points — for showing a dollar cap as a stop distance. */
export function usdToPoints(symbol: string, usd: number, quantity = 1): number | null {
  const c = getContract(symbol)
  if (!c || !Number.isFinite(usd) || !(quantity > 0)) return null
  return usd / (c.pointValueUsd * quantity)
}

/**
 * The planned dollar risk of a trade: stop distance × point value × contracts.
 * This is what the model's $600 / $300 / $150 caps are checked against.
 */
export function plannedRiskUsd(
  symbol: string,
  stopPoints: number,
  quantity: number,
): number | null {
  if (!(stopPoints > 0) || !(quantity > 0)) return null
  return pointsToUsd(symbol, stopPoints, quantity)
}

/**
 * How many contracts fit inside a dollar risk budget, rounded down.
 * Rounding down matters: rounding up would silently breach the cap.
 */
export function contractsForRisk(
  symbol: string,
  stopPoints: number,
  riskBudgetUsd: number,
): number | null {
  const perContract = pointsToUsd(symbol, stopPoints, 1)
  if (perContract == null || !(perContract > 0) || !(riskBudgetUsd > 0)) return null
  return Math.floor(riskBudgetUsd / perContract)
}

/** Round a price to the instrument's tick grid. */
export function roundToTick(symbol: string, price: number): number | null {
  const c = getContract(symbol)
  if (!c || !Number.isFinite(price)) return null
  const ticks = Math.round(price / c.tickSize)
  // Re-derive from tick count to avoid floating-point dust like 17999.999999997.
  return Number((ticks * c.tickSize).toFixed(10))
}
