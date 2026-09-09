/**
 * Tests for the coaching report.
 *
 * This is the file students actually see, and the one that was rewritten, so
 * the cases below pin the two behaviours the rewrite exists to fix: ranking by
 * expectancy rather than by total P&L, and a reason never landing in two lists.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCoachReport, type CoachTrade } from '../lib/coach'

let seq = 0
function trade(over: Partial<CoachTrade> = {}): CoachTrade {
  // Spread entries across weekdays and hours so the time buckets are populated.
  const base = new Date('2026-07-14T12:00:00Z').getTime()
  seq += 1
  return {
    pnl: 100,
    rr: 1,
    direction: 'LONG',
    symbol: 'NQ',
    killzone: 'NY_AM',
    cyclePhase: 'CYCLE_1',
    entryTime: new Date(base + seq * 3600_000),
    reasons: [],
    selfRating: null,
    emotionalState: null,
    ...over,
  }
}

const many = (n: number, over: Partial<CoachTrade> = {}) =>
  Array.from({ length: n }, () => trade(over))

// ─── Guards ──────────────────────────────────────────────────────────────────

test('an empty journal reports no data rather than throwing', () => {
  const r = buildCoachReport([])
  assert.equal(r.hasEnoughData, false)
  assert.equal(r.totalTrades, 0)
  assert.deepEqual(r.rules, { keep: [], develop: [], stop: [] })
})

test('under eight trades stays in the empty state', () => {
  const r = buildCoachReport(many(7))
  assert.equal(r.hasEnoughData, false)
})

test('trades with nothing filled in do not crash the report', () => {
  const r = buildCoachReport(
    many(20, { rr: null, killzone: null, cyclePhase: null, emotionalState: null, reasons: [] }),
  )
  assert.equal(r.hasEnoughData, true)
  assert.equal(r.overall.avgR, null)
  assert.ok(Array.isArray(r.rules.keep))
})

// ─── The ranking fix ─────────────────────────────────────────────────────────

test('a big bucket of thin wins does not outrank a small bucket of strong ones', () => {
  // "SLOW": 30 trades at +0.1R each — $3,000 total, the most money by far.
  // "FAST": 10 trades at +0.8R each — $2,500 total, but far better per trade.
  // Ranking by total P&L puts SLOW first; ranking by expectancy puts FAST first.
  const trades = [
    ...many(30, { symbol: 'SLOW', rr: 0.1, pnl: 100 }),
    ...many(10, { symbol: 'FAST', rr: 0.8, pnl: 250 }),
  ]
  const r = buildCoachReport(trades)
  assert.equal(r.bestSymbol?.key, 'FAST')
  assert.ok((r.bestSymbol?.expectancyR ?? 0) > 0.5)
})

test('win rate alone no longer decides: 40% at 3R beats 70% at 0.3R', () => {
  const trades = [
    // HIGHWR: 70% winners but tiny reward — expectancy +0.11R
    ...many(21, { symbol: 'HIGHWR', rr: 0.3, pnl: 30 }),
    ...many(9, { symbol: 'HIGHWR', rr: -0.33, pnl: -33 }),
    // BIGR: 40% winners at 3R — expectancy +0.6R
    ...many(12, { symbol: 'BIGR', rr: 3, pnl: 300 }),
    ...many(18, { symbol: 'BIGR', rr: -1, pnl: -100 }),
  ]
  const r = buildCoachReport(trades)
  assert.equal(r.bestSymbol?.key, 'BIGR')
  const bigr = r.bestSymbol!
  assert.ok(bigr.winRate < 50, 'the winner here has the lower win rate')
})

// ─── The best+worst fix ──────────────────────────────────────────────────────

test('a reason never appears in more than one of keep / avoid / develop', () => {
  const trades = [
    // Present on winners and losers alike — the shape that used to appear twice.
    ...many(15, { reasons: ['ambiguous', 'good'], rr: 2, pnl: 200 }),
    ...many(15, { reasons: ['ambiguous', 'bad'], rr: -1, pnl: -100 }),
    ...many(10, { reasons: ['good'], rr: 1.5, pnl: 150 }),
    ...many(10, { reasons: ['bad'], rr: -0.8, pnl: -80 }),
  ]
  const r = buildCoachReport(trades)
  const names = [
    ...r.keepReasons.map((x) => x.name),
    ...r.avoidReasons.map((x) => x.name),
    ...r.developReasons.map((x) => x.name),
  ]
  assert.equal(new Set(names).size, names.length, `duplicate across lists: ${names.join(', ')}`)
})

test('lift separates a helpful confluence from a harmful one', () => {
  const trades = [
    ...many(25, { reasons: ['helps'], rr: 2, pnl: 200 }),
    ...many(25, { reasons: ['hurts'], rr: -1, pnl: -100 }),
  ]
  const r = buildCoachReport(trades)
  assert.ok(r.keepReasons.some((x) => x.name === 'helps'), 'helps should be kept')
  assert.ok(r.avoidReasons.some((x) => x.name === 'hurts'), 'hurts should be avoided')
  assert.ok((r.keepReasons.find((x) => x.name === 'helps')?.liftR ?? 0) > 0)
})

// ─── Advice is gated, numbers are not ────────────────────────────────────────

test('a thin journal shows its numbers but withholds advice', () => {
  const r = buildCoachReport(many(12, { rr: 1, pnl: 100 }))
  assert.equal(r.hasEnoughData, true)
  assert.ok(r.overall.totalPnl > 0, 'the numbers are still reported')
  assert.equal(r.evidence.established, 0, 'nothing is established on 12 trades')
})

test('the evidence field explains why advice may be missing', () => {
  const r = buildCoachReport(many(40, { reasons: ['x'], rr: 1, pnl: 100 }))
  assert.ok(r.evidence.tested > 0)
  assert.equal(r.evidence.tradesWithR, 40)
  assert.ok(r.evidence.established <= r.evidence.tested)
})

test('every bucket carries its own confidence label', () => {
  const r = buildCoachReport(many(30, { rr: 1, pnl: 100 }))
  for (const b of [...r.bestHours, ...r.bestDays]) {
    assert.ok(['INSUFFICIENT', 'EMERGING', 'USABLE', 'ESTABLISHED'].includes(b.confidence))
    assert.equal(typeof b.established, 'boolean')
  }
})

test('the report never leaks the internal p-value field', () => {
  const r = buildCoachReport(many(30, { reasons: ['x'], rr: 1, pnl: 100 }))
  const all = [r.bestSession, r.bestSymbol, ...r.bestHours, ...r.keepReasons].filter(Boolean)
  for (const item of all) {
    assert.ok(!('_p' in (item as object)), 'internal _p should be stripped before returning')
  }
})
