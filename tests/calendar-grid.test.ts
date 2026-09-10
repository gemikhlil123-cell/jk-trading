import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateKey, monthGrid, weekTotals } from '../lib/calendar-grid'

test('September 2026 starts on a Tuesday and spans five weeks', () => {
  const g = monthGrid(2026, 8)
  assert.equal(g.length, 5)
  assert.deepEqual(g[0], [null, null, 1, 2, 3, 4, 5])
  assert.deepEqual(g[4], [27, 28, 29, 30, null, null, null])
})

test('February 2026 fills exactly four weeks', () => {
  const g = monthGrid(2026, 1)
  assert.equal(g.length, 4)
  assert.equal(g.flat().filter((d) => d === null).length, 0)
})

test('every week has seven cells and every day appears once, in order', () => {
  for (let month = 0; month < 12; month++) {
    const g = monthGrid(2027, month)
    assert.ok(g.every((w) => w.length === 7))
    const days = g.flat().filter((d): d is number => d !== null)
    assert.equal(days.length, new Date(Date.UTC(2027, month + 1, 0)).getUTCDate())
    assert.deepEqual(days, days.map((_, i) => i + 1))
  }
})

test('date keys are zero padded', () => {
  assert.equal(dateKey(2026, 0, 5), '2026-01-05')
  assert.equal(dateKey(2026, 11, 31), '2026-12-31')
})

test('week totals add up only the days that traded', () => {
  const g = monthGrid(2026, 8)
  const totals = new Map([
    ['2026-09-01', { pnl: 40, count: 2 }],
    ['2026-09-03', { pnl: -15, count: 1 }],
    ['2026-09-08', { pnl: 25, count: 1 }],
  ])
  const w = weekTotals(g, totals, 2026, 8)
  assert.deepEqual(w[0], { pnl: 25, days: 2, trades: 3 })
  assert.deepEqual(w[1], { pnl: 25, days: 1, trades: 1 })
  assert.deepEqual(w[2], { pnl: 0, days: 0, trades: 0 })
})
