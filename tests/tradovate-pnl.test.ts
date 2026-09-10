import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pointsFromFills } from '../lib/tradovate/pnl'

test('a winning long is the price rise in points', () => {
  assert.equal(pointsFromFills({ entryPrice: 18000, exitPrice: 18012.5, direction: 'LONG' }), 12.5)
})

test('a winning short is the price fall in points', () => {
  assert.equal(pointsFromFills({ entryPrice: 18000, exitPrice: 17990, direction: 'SHORT' }), 10)
})

test('losses come out negative', () => {
  assert.equal(pointsFromFills({ entryPrice: 18000, exitPrice: 17992.75, direction: 'LONG' }), -7.25)
  assert.equal(pointsFromFills({ entryPrice: 18000, exitPrice: 18004, direction: 'SHORT' }), -4)
})

test('float dust from fill prices is rounded to two decimals', () => {
  assert.equal(pointsFromFills({ entryPrice: 17999.5, exitPrice: 18000.25, direction: 'LONG' }), 0.75)
  assert.equal(pointsFromFills({ entryPrice: 0.1, exitPrice: 0.3, direction: 'LONG' }), 0.2)
})
