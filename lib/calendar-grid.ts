/**
 * JK TRADING — month grid for the P&L calendar.
 *
 * Weekday math runs in UTC so the grid never depends on the server's or the
 * browser's local timezone.
 */

/** Sunday-first weeks of seven cells, each a day number or null. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** YYYY-MM-DD for a zero-based month. */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export interface WeekTotal {
  pnl: number
  days: number
  trades: number
}

/** Sum each week row of the grid from per-day totals. */
export function weekTotals(
  weeks: readonly (readonly (number | null)[])[],
  totals: ReadonlyMap<string, { pnl: number; count: number }>,
  year: number,
  month: number,
): WeekTotal[] {
  return weeks.map((week) => {
    const acc: WeekTotal = { pnl: 0, days: 0, trades: 0 }
    for (const day of week) {
      if (day == null) continue
      const v = totals.get(dateKey(year, month, day))
      if (!v) continue
      acc.pnl += v.pnl
      acc.days += 1
      acc.trades += v.count
    }
    return acc
  })
}
