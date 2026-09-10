/**
 * JK TRADING — how a Tradovate fill pair becomes a trade's P&L.
 *
 * The journal stores P&L in points — the price move per contract — which is what
 * a student types into the trade form. Sync used to write net dollars into the
 * same column, which would have mixed two units the moment any account synced.
 * Dollars stay recoverable as points × point value × quantity, and the
 * commission is kept on its own in `fees`.
 */

export interface FillPair {
  entryPrice: number
  exitPrice: number
  direction: 'LONG' | 'SHORT'
}

/** Price move in the trade's favour, per contract. Negative for a loss. */
export function pointsFromFills({ entryPrice, exitPrice, direction }: FillPair): number {
  const move = direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice
  // Fill prices arrive as binary floats; two decimals is what the column holds.
  return Math.round(move * 100) / 100
}
