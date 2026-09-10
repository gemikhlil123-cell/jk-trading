/**
 * JK TRADING — how a P&L figure is written.
 *
 * One place decides the unit so every screen shows the same one. The charts and
 * the calendar used to print "$" while the stat cards printed "نقطة" for the very
 * same numbers.
 */

export type PnlUnit = 'points' | 'usd'

/**
 * Confirmed by the owner on 2026-09-11: students enter points in the trade form,
 * and Tradovate sync now stores points as well (see lib/tradovate/pnl.ts).
 */
export const DEFAULT_PNL_UNIT: PnlUnit = 'points'

export function unitLabel(unit: PnlUnit): string {
  return unit === 'usd' ? '$' : 'نقطة'
}

export function unitPhrase(unit: PnlUnit): string {
  return unit === 'usd' ? 'القيم بالدولار' : 'القيم بالنقاط'
}

function oneDecimal(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '')
}

/** 1240 → "1.2k", 15000 → "15k", 2500000 → "2.5m". The sign is left to the caller. */
export function compactNumber(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${oneDecimal(a / 1_000_000)}m`
  if (a >= 10_000) return `${Math.round(a / 1_000)}k`
  if (a >= 1_000) return `${oneDecimal(a / 1_000)}k`
  return a >= 10 || Number.isInteger(a) ? a.toFixed(0) : a.toFixed(1)
}

/**
 * Signed P&L text: "+109", "-42", "+$1.2k". A value that rounds to zero carries no
 * sign. For points the unit word is left to the caller, so tight cells such as the
 * calendar can leave it out.
 */
export function formatPnl(
  n: number,
  unit: PnlUnit = DEFAULT_PNL_UNIT,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const body = opts.compact ? compactNumber(abs) : abs.toFixed(opts.decimals ?? 0)
  const isZero = Number(body.replace(/[km]$/, '')) === 0
  const sign = isZero ? '' : n > 0 ? '+' : '-'
  return unit === 'usd' ? `${sign}$${body}` : `${sign}${body}`
}
