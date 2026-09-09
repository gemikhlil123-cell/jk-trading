/**
 * Tests for the JK model rule engine.
 *
 * Run (ts-node is already a devDependency, no new packages needed):
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --require ts-node/register --test tests/jk-rules.test.ts
 *
 * All timestamps are UTC. New York is UTC-4 in July (EDT) and UTC-5 in
 * January (EST), so the same NY wall-clock time is a different UTC instant in
 * each — which is exactly what the DST cases below pin down.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nyClock,
  slotOf,
  riskCapFor,
  plannedR,
  checkJkRules,
  ruleBreakCost,
  JK_RULES,
  type JkRuleInput,
  type RuleCode,
} from '../lib/jk-rules'

// Wed 2026-07-15 · Mon 2026-07-13 · Thu 2026-07-16 · Fri 2026-07-17 (all EDT)
const WED_0900 = new Date('2026-07-15T13:00:00Z')
const WED_0915 = new Date('2026-07-15T13:15:00Z')
const WED_1000 = new Date('2026-07-15T14:00:00Z')
const WED_1005 = new Date('2026-07-15T14:05:00Z')
const WED_0859 = new Date('2026-07-15T12:59:00Z')
const WED_1029 = new Date('2026-07-15T14:29:00Z')
const WED_1030 = new Date('2026-07-15T14:30:00Z')
const MON_0915 = new Date('2026-07-13T13:15:00Z')
const FRI_0915 = new Date('2026-07-17T13:15:00Z')
const FRI_1000 = new Date('2026-07-17T14:00:00Z')

/** A trade that satisfies every rule: Wed, 10:00 NY, 3R, risk under the cap. */
function cleanTrade(over: Partial<JkRuleInput> = {}): JkRuleInput {
  return {
    entryTime: WED_1000,
    direction: 'LONG',
    entryPrice: 100,
    stopPrice: 98,
    targetPrice: 106,
    riskAmount: 500,
    entryTrigger: 'FVG',
    mssConfirmed: true,
    sameDayTrades: [],
    ...over,
  }
}

const codes = (i: JkRuleInput): RuleCode[] => checkJkRules(i).violations.map((v) => v.code)

// ─── New York clock, both sides of DST ───────────────────────────────────────

test('nyClock reads 09:45 NY in summer (EDT, UTC-4)', () => {
  const c = nyClock(new Date('2026-07-15T13:45:00Z'))
  assert.equal(c.weekday, 3) // Wednesday
  assert.equal(c.minutes, 9 * 60 + 45)
  assert.equal(c.dayKey, '2026-07-15')
})

test('nyClock reads 09:45 NY in winter (EST, UTC-5)', () => {
  const c = nyClock(new Date('2026-01-14T14:45:00Z'))
  assert.equal(c.weekday, 3)
  assert.equal(c.minutes, 9 * 60 + 45)
  assert.equal(c.dayKey, '2026-01-14')
})

test('nyClock folds NY midnight to minute 0, not 1440', () => {
  // 00:30 NY on 2026-07-15 is 04:30 UTC the same day.
  const c = nyClock(new Date('2026-07-15T04:30:00Z'))
  assert.equal(c.minutes, 30)
  assert.equal(c.dayKey, '2026-07-15')
})

// ─── Risk cap: the Friday × before-09:30 interaction ─────────────────────────

test('risk cap is $600 on a normal day after 09:30', () => {
  assert.equal(riskCapFor(nyClock(WED_1000)), 600)
})

test('risk cap halves to $300 before 09:30', () => {
  assert.equal(riskCapFor(nyClock(WED_0915)), 300)
})

test('risk cap halves to $300 on Friday after 09:30', () => {
  assert.equal(riskCapFor(nyClock(FRI_1000)), 300)
})

test('risk cap is $150 on Friday before 09:30 — both halvings apply', () => {
  assert.equal(riskCapFor(nyClock(FRI_0915)), 150)
})

test('a $200 risk is fine on Wednesday but breaks the Friday pre-09:30 cap', () => {
  assert.ok(!codes(cleanTrade({ riskAmount: 200 })).includes('RISK_OVER_CAP'))
  const fri = codes(cleanTrade({ entryTime: FRI_0915, riskAmount: 200 }))
  assert.ok(fri.includes('RISK_OVER_CAP'))
})

// ─── Blocked day ─────────────────────────────────────────────────────────────

test('Monday is blocked', () => {
  assert.ok(codes(cleanTrade({ entryTime: MON_0915, riskAmount: 200 })).includes('MONDAY_BLOCKED'))
})

// ─── Entry window boundaries ─────────────────────────────────────────────────

test('09:00 opens the window and 08:59 is outside it', () => {
  assert.ok(!codes(cleanTrade({ entryTime: WED_0900, riskAmount: 200 })).includes('OUTSIDE_ENTRY_WINDOW'))
  assert.ok(codes(cleanTrade({ entryTime: WED_0859, riskAmount: 200 })).includes('OUTSIDE_ENTRY_WINDOW'))
})

test('10:29 is inside the window and 10:30 is outside it', () => {
  assert.ok(!codes(cleanTrade({ entryTime: WED_1029 })).includes('OUTSIDE_ENTRY_WINDOW'))
  assert.ok(codes(cleanTrade({ entryTime: WED_1030 })).includes('OUTSIDE_ENTRY_WINDOW'))
})

// ─── Two daily slots ─────────────────────────────────────────────────────────

test('slotOf splits the day at 09:30', () => {
  assert.equal(slotOf(nyClock(WED_0915)), 'EARLY')
  assert.equal(slotOf(nyClock(WED_1000)), 'LATE')
})

test('one trade per slot is allowed', () => {
  const v = codes(cleanTrade({ sameDayTrades: [{ entryTime: WED_0915 }] }))
  assert.deepEqual(v, [])
})

test('a second trade in the same slot is a violation', () => {
  const v = codes(cleanTrade({ sameDayTrades: [{ entryTime: WED_1005 }] }))
  assert.ok(v.includes('SLOT_ALREADY_USED'))
})

test('a third trade in a day exceeds the limit', () => {
  const v = codes(cleanTrade({ sameDayTrades: [{ entryTime: WED_0915 }, { entryTime: WED_1005 }] }))
  assert.ok(v.includes('DAILY_TRADE_LIMIT'))
})

test('trades on other days do not count toward the daily limit', () => {
  const v = codes(cleanTrade({ sameDayTrades: [{ entryTime: FRI_0915 }, { entryTime: MON_0915 }] }))
  assert.deepEqual(v, [])
})

// ─── Planned R ───────────────────────────────────────────────────────────────

test('plannedR computes 3R for a long', () => {
  assert.equal(plannedR({ direction: 'LONG', entryPrice: 100, stopPrice: 98, targetPrice: 106 }), 3)
})

test('plannedR computes 3R for a short', () => {
  assert.equal(plannedR({ direction: 'SHORT', entryPrice: 100, stopPrice: 102, targetPrice: 94 }), 3)
})

test('plannedR is null when the stop is on the wrong side of entry', () => {
  assert.equal(plannedR({ direction: 'LONG', entryPrice: 100, stopPrice: 102, targetPrice: 106 }), null)
})

test('a target under 2R is rejected', () => {
  const v = codes(cleanTrade({ targetPrice: 103 })) // 1.5R
  assert.ok(v.includes('TARGET_BELOW_2R'))
})

test('exactly 2R is accepted', () => {
  const v = codes(cleanTrade({ targetPrice: 104 })) // 2.0R
  assert.ok(!v.includes('TARGET_BELOW_2R'))
  assert.equal(JK_RULES.minPlannedR, 2)
})

// ─── Trader-judgement rules ──────────────────────────────────────────────────

test('a CISD entry without a retest is a violation', () => {
  const v = codes(cleanTrade({ entryTrigger: 'CISD', cisdRetested: false }))
  assert.ok(v.includes('CISD_NO_RETEST'))
})

test('the retest rule only applies to CISD entries', () => {
  const v = codes(cleanTrade({ entryTrigger: 'FVG', cisdRetested: false }))
  assert.ok(!v.includes('CISD_NO_RETEST'))
})

test('an unconfirmed MSS is a violation', () => {
  assert.ok(codes(cleanTrade({ mssConfirmed: false })).includes('MSS_NOT_CONFIRMED'))
})

// ─── Missing data is reported as unchecked, never as compliant ───────────────

test('a missing risk amount leaves the cap rule unchecked rather than passing it', () => {
  const r = checkJkRules(cleanTrade({ riskAmount: null }))
  assert.ok(r.unchecked.includes('RISK_OVER_CAP'))
  assert.ok(!r.violations.some((v) => v.code === 'RISK_OVER_CAP'))
})

test('a missing target leaves the 2R rule unchecked', () => {
  const r = checkJkRules(cleanTrade({ targetPrice: null }))
  assert.ok(r.unchecked.includes('TARGET_BELOW_2R'))
  assert.equal(r.plannedR, null)
})

test('an unanswered MSS flag is unchecked, not a violation', () => {
  const r = checkJkRules(cleanTrade({ mssConfirmed: null }))
  assert.ok(r.unchecked.includes('MSS_NOT_CONFIRMED'))
  assert.ok(r.followedPlan)
})

// ─── The happy path ──────────────────────────────────────────────────────────

test('a fully compliant trade reports no violations', () => {
  const r = checkJkRules(cleanTrade())
  assert.deepEqual(r.violations, [])
  assert.equal(r.followedPlan, true)
  assert.equal(r.riskCapUsd, 600)
  assert.equal(r.plannedR, 3)
  assert.equal(r.slot, 'LATE')
  assert.equal(r.nyDayKey, '2026-07-15')
})

test('violations are reported together, not one at a time', () => {
  const v = codes(cleanTrade({ entryTime: MON_0915, riskAmount: 900, targetPrice: 103 }))
  assert.ok(v.includes('MONDAY_BLOCKED'))
  assert.ok(v.includes('RISK_OVER_CAP'))
  assert.ok(v.includes('TARGET_BELOW_2R'))
})

// ─── Cost of broken rules ────────────────────────────────────────────────────

test('ruleBreakCost separates the cost of broken rules from compliant P&L', () => {
  const r = ruleBreakCost([
    { pnl: 400, followedPlan: true },
    { pnl: -200, followedPlan: true },
    { pnl: -900, followedPlan: false, violations: [{ code: 'MONDAY_BLOCKED', severity: 'BLOCKING' }] },
    { pnl: -600, followedPlan: false, violations: [{ code: 'RISK_OVER_CAP', severity: 'BLOCKING' }] },
    { pnl: 100, followedPlan: null }, // never checked — excluded everywhere
  ])
  assert.equal(r.checkedCount, 4)
  assert.equal(r.brokenCount, 2)
  assert.equal(r.costUsd, -1500)
  assert.equal(r.compliantPnlUsd, 200)
  assert.equal(r.adherencePct, 50)
  assert.equal(r.byRule[0].code, 'MONDAY_BLOCKED') // most expensive first
})

test('ruleBreakCost is safe on an empty set', () => {
  const r = ruleBreakCost([])
  assert.equal(r.adherencePct, 0)
  assert.equal(r.costUsd, 0)
  assert.deepEqual(r.byRule, [])
})
