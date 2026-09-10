import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compactNumber, formatPnl, unitLabel, unitPhrase, DEFAULT_PNL_UNIT } from '../lib/pnl-format'

test('the journal unit is points', () => {
  assert.equal(DEFAULT_PNL_UNIT, 'points')
  assert.equal(unitLabel('points'), 'نقطة')
  assert.equal(unitLabel('usd'), '$')
  assert.equal(unitPhrase('points'), 'القيم بالنقاط')
})

test('P&L is signed, rounded, and zero carries no sign', () => {
  assert.equal(formatPnl(109), '+109')
  assert.equal(formatPnl(-42.4), '-42')
  assert.equal(formatPnl(0), '0')
  assert.equal(formatPnl(0.3), '0')
  assert.equal(formatPnl(-0.2), '0')
  assert.equal(formatPnl(12.5, 'points', { decimals: 1 }), '+12.5')
})

test('dollars get the symbol after the sign', () => {
  assert.equal(formatPnl(250, 'usd'), '+$250')
  assert.equal(formatPnl(-80, 'usd'), '-$80')
})

test('compact figures stay short enough for a calendar cell', () => {
  assert.equal(formatPnl(1240, 'usd', { compact: true }), '+$1.2k')
  assert.equal(formatPnl(-15000, 'points', { compact: true }), '-15k')
  assert.equal(formatPnl(2_500_000, 'usd', { compact: true }), '+$2.5m')
  assert.equal(compactNumber(999), '999')
  assert.equal(compactNumber(1000), '1k')
  assert.equal(compactNumber(1260), '1.3k')
  assert.equal(compactNumber(10400), '10k')
})

test('non-finite values render as a dash', () => {
  assert.equal(formatPnl(NaN), '—')
  assert.equal(formatPnl(Infinity), '—')
})
