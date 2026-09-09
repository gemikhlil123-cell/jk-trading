/**
 * Tests for the points-to-dollars conversion.
 *
 * The CME values are published contract specs, so they are asserted exactly —
 * a change here means someone edited a spec, which should fail loudly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTRACTS, getContract, isAssumed, pointsToUsd, usdToPoints,
  plannedRiskUsd, contractsForRisk, roundToTick,
} from '../lib/contracts'

test('CME point values match the published contract specs', () => {
  assert.equal(CONTRACTS.NQ.pointValueUsd, 20)     // 0.25 tick @ $5.00
  assert.equal(CONTRACTS.ES.pointValueUsd, 50)     // 0.25 tick @ $12.50
  assert.equal(CONTRACTS.GC.pointValueUsd, 100)    // 0.10 tick @ $10.00
  assert.equal(CONTRACTS.CL.pointValueUsd, 1000)   // 0.01 tick @ $10.00
})

test('instruments whose lot size is an assumption are flagged as such', () => {
  for (const s of ['NQ', 'ES', 'GC', 'CL']) assert.equal(isAssumed(s), false, s)
  for (const s of ['BTC', 'XAU', 'EURUSD', 'OTHER']) assert.equal(isAssumed(s), true, s)
})

test('points convert to dollars per contract', () => {
  assert.equal(pointsToUsd('NQ', 50), 1000)      // 50 pts × $20
  assert.equal(pointsToUsd('NQ', 50, 2), 2000)   // two contracts
  assert.equal(pointsToUsd('ES', 10, 3), 1500)   // 10 × $50 × 3
})

test('a losing move converts to a negative figure', () => {
  assert.equal(pointsToUsd('NQ', -25), -500)
})

test('an unknown symbol returns null instead of a guessed value', () => {
  assert.equal(pointsToUsd('TSLA', 10), null)
  assert.equal(getContract('TSLA'), null)
  assert.equal(pointsToUsd('NQ', NaN), null)
})

test('the symbol lookup is case-insensitive', () => {
  assert.equal(pointsToUsd('nq', 1), 20)
})

test('dollars convert back to points', () => {
  assert.equal(usdToPoints('NQ', 600), 30)       // $600 cap = 30 pts on one contract
  assert.equal(usdToPoints('NQ', 600, 2), 15)    // half the distance on two
})

test('planned risk is the stop distance in dollars', () => {
  assert.equal(plannedRiskUsd('NQ', 30, 1), 600)
  assert.equal(plannedRiskUsd('NQ', 30, 2), 1200) // breaches the $600 cap
  assert.equal(plannedRiskUsd('NQ', 0, 1), null)  // no stop, no risk figure
  assert.equal(plannedRiskUsd('NQ', 30, 0), null)
})

test('position sizing rounds down so the cap is never breached', () => {
  // $600 budget, 25-point stop on NQ = $500 per contract.
  assert.equal(contractsForRisk('NQ', 25, 600), 1)  // not 1.2
  assert.equal(contractsForRisk('NQ', 10, 600), 3)  // $200 each → 3
  assert.equal(contractsForRisk('NQ', 40, 600), 0)  // $800 each → the trade is too big
})

test('prices snap to the tick grid without floating-point dust', () => {
  assert.equal(roundToTick('NQ', 18000.13), 18000.25)
  assert.equal(roundToTick('NQ', 18000.12), 18000.0)
  assert.equal(roundToTick('CL', 78.456), 78.46)
  assert.equal(roundToTick('TSLA', 1), null)
})
