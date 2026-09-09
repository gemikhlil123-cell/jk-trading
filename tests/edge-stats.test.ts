/**
 * Tests for the edge-statistics primitives.
 *
 * The t-distribution values below are checked against a standard two-tailed
 * t-table, so a regression in the incomplete-beta implementation shows up here
 * rather than as a quietly wrong confidence interval in a student's report.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  confidenceFor,
  mean,
  stdev,
  tTestP,
  tCritical,
  edgeStat,
  liftStat,
  benjaminiHochberg,
  rankFindings,
  isReportable,
  SAMPLE_TIERS,
  type TradeSample,
} from '../lib/edge-stats'

const close = (a: number, b: number, tol = 0.01) =>
  assert.ok(Math.abs(a - b) <= tol, `expected ${a} ≈ ${b} (±${tol})`)

/** n trades, each with the given R; P&L mirrors R at $100 per R. */
function rs(...pairs: [count: number, r: number][]): TradeSample[] {
  const out: TradeSample[] = []
  for (const [count, r] of pairs) {
    for (let i = 0; i < count; i++) out.push({ r, pnl: r * 100 })
  }
  return out
}

// ─── Sample tiers ────────────────────────────────────────────────────────────

test('sample tiers follow the documented thresholds', () => {
  assert.equal(confidenceFor(0), 'INSUFFICIENT')
  assert.equal(confidenceFor(SAMPLE_TIERS.emerging - 1), 'INSUFFICIENT')
  assert.equal(confidenceFor(SAMPLE_TIERS.emerging), 'EMERGING')
  assert.equal(confidenceFor(SAMPLE_TIERS.usable), 'USABLE')
  assert.equal(confidenceFor(SAMPLE_TIERS.established), 'ESTABLISHED')
})

// ─── Descriptives ────────────────────────────────────────────────────────────

test('stdev uses the n−1 denominator', () => {
  close(stdev([2, 4, 4, 4, 5, 5, 7, 9]), 2.1381, 0.0001)
  assert.equal(stdev([5]), 0)
  assert.equal(mean([]), 0)
})

// ─── Student's t against published table values ──────────────────────────────

test('tCritical matches the two-tailed t-table', () => {
  close(tCritical(1, 0.1), 6.314)
  close(tCritical(5, 0.1), 2.015)
  close(tCritical(10, 0.1), 1.812)
  close(tCritical(10, 0.05), 2.228)
  close(tCritical(30, 0.05), 2.042)
  close(tCritical(100, 0.05), 1.984)
})

test('tCritical converges on the normal quantile at large df', () => {
  close(tCritical(100000, 0.05), 1.96, 0.005)
  close(tCritical(100000, 0.1), 1.645, 0.005)
})

test('tTestP inverts tCritical', () => {
  close(tTestP(2.228, 10), 0.05, 0.001)
  close(tTestP(1.812, 10), 0.1, 0.001)
  assert.equal(tTestP(0, 10), 1)
})

test('tTestP is safe on degenerate input', () => {
  assert.equal(tTestP(2, 0), 1)
  assert.equal(tTestP(NaN, 10), 1)
})

// ─── edgeStat ────────────────────────────────────────────────────────────────

test('a real edge is reported as significant', () => {
  // 20 wins at +2R, 20 losses at −1R → +0.5R expectancy.
  const s = edgeStat(rs([20, 2], [20, -1]))
  assert.equal(s.n, 40)
  assert.equal(s.nWithR, 40)
  close(s.expectancyR as number, 0.5)
  close(s.expectancyUsd, 50)
  assert.equal(s.winRate, 50)
  assert.equal(s.confidence, 'EMERGING')
  assert.ok(s.significant, 'CI should exclude zero')
  assert.ok((s.pValue as number) < 0.1)
  assert.ok((s.ciLowR as number) > 0)
})

test('a coin-flip sample is not reported as an edge', () => {
  const s = edgeStat(rs([20, 1], [20, -1]))
  close(s.expectancyR as number, 0)
  assert.equal(s.significant, false)
  assert.ok((s.ciLowR as number) < 0 && (s.ciHighR as number) > 0)
})

test('a losing setup is significant in the negative direction', () => {
  const s = edgeStat(rs([10, 1], [30, -1]))
  close(s.expectancyR as number, -0.5)
  assert.ok(s.significant)
  assert.ok((s.ciHighR as number) < 0)
})

test('R statistics ignore trades with no R, but n and P&L still count them', () => {
  const s = edgeStat([{ r: 2, pnl: 200 }, { r: 2, pnl: 200 }, { r: null, pnl: -50 }])
  assert.equal(s.n, 3)
  assert.equal(s.nWithR, 2)
  close(s.expectancyR as number, 2)
  close(s.expectancyUsd, 116.67, 0.01)
})

test('fewer than two R values yields no interval instead of a fabricated one', () => {
  const s = edgeStat([{ r: 3, pnl: 300 }])
  close(s.expectancyR as number, 3)
  assert.equal(s.ciLowR, null)
  assert.equal(s.ciHighR, null)
  assert.equal(s.pValue, null)
  assert.equal(s.significant, false)
})

test('an empty bucket is safe', () => {
  const s = edgeStat([])
  assert.equal(s.n, 0)
  assert.equal(s.expectancyR, null)
  assert.equal(s.winRate, 0)
  assert.equal(s.confidence, 'INSUFFICIENT')
})

test('isReportable demands both significance and sample size', () => {
  // 4 trades at +2R: statistically clean, nowhere near enough trades.
  const tiny = edgeStat(rs([4, 2]))
  assert.equal(tiny.confidence, 'INSUFFICIENT')
  assert.equal(isReportable(tiny), false)

  const real = edgeStat(rs([20, 2], [20, -1]))
  assert.equal(isReportable(real), true)
})

// ─── Lift ────────────────────────────────────────────────────────────────────

test('a confluence that helps shows positive lift', () => {
  const withIt = rs([15, 2], [15, 0]) // mean +1.0R
  const withoutIt = rs([15, 0], [15, -1]) // mean −0.5R
  const l = liftStat(withIt, withoutIt)
  close(l.liftR as number, 1.5)
  assert.ok(l.significant)
  assert.ok((l.ciLowR as number) > 0)
  assert.equal(l.confidence, 'EMERGING')
})

test('a confluence that changes nothing shows no lift', () => {
  const l = liftStat(rs([20, 1], [20, -1]), rs([20, 1], [20, -1]))
  close(l.liftR as number, 0)
  assert.equal(l.significant, false)
})

test('lift needs both sides before it says anything', () => {
  const l = liftStat(rs([30, 2]), [{ r: 1, pnl: 100 }])
  assert.equal(l.ciLowR, null)
  assert.equal(l.significant, false)
  assert.equal(l.withoutN, 1)
})

// ─── Multiple comparisons ────────────────────────────────────────────────────

test('Benjamini–Hochberg reproduces the textbook example', () => {
  const ps = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205]
  const checked = benjaminiHochberg(
    ps.map((p, i) => ({ item: i, pValue: p, effectR: 1, n: 50 })),
    0.05,
  )
  const passing = checked.filter((f) => f.passesFdr).map((f) => f.item)
  assert.deepEqual(passing, [0, 1]) // only p ≤ 0.008 survive at q = 0.05
})

test('BH rejects everything when no p-value clears its rank threshold', () => {
  const checked = benjaminiHochberg(
    [0.4, 0.5, 0.6].map((p, i) => ({ item: i, pValue: p, effectR: 1, n: 30 })),
    0.05,
  )
  assert.equal(checked.filter((f) => f.passesFdr).length, 0)
})

test('findings with no p-value never pass', () => {
  const checked = benjaminiHochberg([
    { item: 'no-p', pValue: null, effectR: 5, n: 3 },
    { item: 'strong', pValue: 0.001, effectR: 1, n: 80 },
  ], 0.1)
  assert.equal(checked.find((f) => f.item === 'no-p')?.passesFdr, false)
  assert.equal(checked.find((f) => f.item === 'strong')?.passesFdr, true)
})

test('surviving findings are ranked by impact, not by p-value', () => {
  const ranked = rankFindings([
    { item: 'small-effect-tiny-p', pValue: 0.0001, effectR: 0.1, n: 100 }, // impact 1.0
    { item: 'big-effect', pValue: 0.01, effectR: 0.8, n: 100 },            // impact 8.0
  ], 0.1)
  assert.deepEqual(ranked.map((f) => f.item), ['big-effect', 'small-effect-tiny-p'])
  close(ranked[0].impact, 8)
})

test('BH on an empty set does not blow up', () => {
  assert.deepEqual(benjaminiHochberg([], 0.1), [])
  assert.deepEqual(rankFindings([], 0.1), [])
})
