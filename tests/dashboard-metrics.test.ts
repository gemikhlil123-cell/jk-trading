import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics, consistencyPct, dailyTotals, equitySeries, performanceScore, recoveryFactor } from '../lib/dashboard-metrics'

const at = (iso: string) => new Date(iso)

test('days are grouped by the Israel calendar day, not UTC', () => {
  // 22:30 UTC on 14 July is 01:30 on 15 July in Israel (UTC+3 in summer).
  assert.deepEqual([...dailyTotals([{ entryTime: at('2026-07-14T22:30:00Z'), pnl: 50 }]).keys()], ['2026-07-15'])
})

test('trades on the same Israel day are summed with their count; open trades are skipped', () => {
  const totals = dailyTotals([
    { entryTime: at('2026-07-15T13:10:00Z'), pnl: 40 },
    { entryTime: at('2026-07-15T14:05:00Z'), pnl: -15 },
    { entryTime: at('2026-07-16T13:10:00Z'), pnl: null },
  ])
  assert.deepEqual(totals.get('2026-07-15'), { pnl: 25, count: 2 })
  assert.equal(totals.has('2026-07-16'), false)
})

test('a trade without an exit time stays on the equity curve', () => {
  const s = equitySeries([
    { entryTime: at('2026-07-15T13:00:00Z'), exitTime: at('2026-07-15T13:40:00Z'), pnl: 30 },
    { entryTime: at('2026-07-15T14:00:00Z'), exitTime: null, pnl: -10 },
  ])
  assert.equal(s.length, 2)
  assert.equal(s[1].equity, 20)
})

test('equity follows exit order', () => {
  const s = equitySeries([
    { entryTime: at('2026-07-15T13:00:00Z'), exitTime: at('2026-07-15T16:00:00Z'), pnl: 100 },
    { entryTime: at('2026-07-15T13:30:00Z'), exitTime: at('2026-07-15T13:45:00Z'), pnl: -40 },
  ])
  assert.deepEqual(s.map((p) => p.pnl), [-40, 100])
  assert.deepEqual(s.map((p) => p.equity), [-40, 60])
})

test('max drawdown is the deepest fall from a running peak', () => {
  const base = Date.parse('2026-07-01T13:00:00Z')
  const trades = [100, -50, -80, 200, -30].map((pnl, i) => ({ entryTime: new Date(base + i * 86_400_000), pnl }))
  // equity 100, 50, -30, 170, 140 → the deepest fall is 100 → -30 = 130
  assert.equal(computeMetrics(trades).maxDrawdown, 130)
})

test('headline figures keep the existing conventions', () => {
  const base = Date.parse('2026-07-01T13:00:00Z')
  const m = computeMetrics([
    { entryTime: new Date(base), pnl: 60 },
    { entryTime: new Date(base + 3_600_000), pnl: -20 },
    { entryTime: new Date(base + 86_400_000), pnl: 0 }, // breakeven counts with losses
    { entryTime: new Date(base + 2 * 86_400_000), pnl: 40 },
  ])
  assert.equal(m.trades, 4)
  assert.equal(m.netPnl, 80)
  assert.equal(m.wins, 2)
  assert.equal(m.losses, 2)
  assert.equal(m.winRate, 50)
  assert.equal(m.profitFactor, 5)
  assert.equal(m.avgWin, 50)
  assert.equal(m.avgLoss, -10)
  assert.equal(m.avgWinLossRatio, 5)
  assert.equal(m.tradingDays, 3)
  assert.equal(m.winDays, 2)
  assert.equal(m.lossDays, 0)
  assert.deepEqual(m.bestDay, { key: '2026-07-01', pnl: 40 })
})

test('profit factor is infinite with wins and no losses, zero with no wins', () => {
  const t = (pnl: number) => ({ entryTime: at('2026-07-15T13:00:00Z'), pnl })
  assert.equal(computeMetrics([t(10), t(5)]).profitFactor, Infinity)
  assert.equal(computeMetrics([t(-10)]).profitFactor, 0)
})

test('an empty journal produces zeros, not NaN', () => {
  const m = computeMetrics([])
  for (const v of [m.netPnl, m.winRate, m.profitFactor, m.avgWin, m.avgLoss, m.avgWinLossRatio, m.dayWinRate, m.maxDrawdown]) {
    assert.equal(v, 0)
  }
  assert.equal(m.bestDay, null)
})

test('consistency, recovery and score keep the previous formulas', () => {
  assert.equal(consistencyPct([]), 0)
  assert.equal(consistencyPct([10, 20, -30, 100]), 75) // avg 25 → band 62.5 → 3 of 4 inside
  assert.equal(recoveryFactor(300, 100), 3)
  assert.equal(recoveryFactor(50, 0), 5)
  assert.equal(recoveryFactor(-50, 0), 0)
  // 60·0.3 + 1·100·0.25 + 0.5·100·0.2 + 80·0.15 + 0.4·100·0.1 = 18 + 25 + 10 + 12 + 4
  assert.equal(performanceScore({ winRate: 60, profitFactor: 4, avgWinLossRatio: 1.5 }, 80, 2), 69)
  assert.equal(performanceScore({ winRate: 60, profitFactor: Infinity, avgWinLossRatio: 1.5 }, 80, 2), 69)
})
