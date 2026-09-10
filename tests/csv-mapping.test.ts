/**
 * Tests for broker-file column detection.
 *
 * The Tradovate Orders header row below is quoted verbatim from TradeZella's
 * own import guide — the one Tradovate header set that is publicly documented.
 * The rest cover the shapes the detector has to survive: fill-level files,
 * round-turn files, odd capitalisation, and columns it cannot place.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeHeader, detectMapping, assessMapping, readField,
  parseSide, rootSymbol, dedupeKey,
} from '../lib/import/csv-mapping'

const TRADOVATE_ORDERS = [
  'orderId', 'Account', 'Order ID', 'B/S', 'Contract', 'Product',
  'Product Description', 'avgPrice', 'filledQty', 'Fill Time',
  'lastCommandId', 'Status', 'Timestamp', 'Date', 'Quantity', 'Type',
  'Limit Price', 'Stop Price', 'Filled Qty', 'Avg Fill Price',
]

test('headers normalise across spacing, case and separators', () => {
  const forms = ['Avg Fill Price', 'avg_fill_price', 'avgFillPrice', 'AVG-FILL-PRICE', 'avg.fill.price']
  for (const f of forms) assert.equal(normalizeHeader(f), 'avgfillprice', f)
})

test('the documented Tradovate Orders export is understood', () => {
  const m = detectMapping(TRADOVATE_ORDERS)
  assert.equal(m.byField.symbol, 'Contract')
  assert.equal(m.byField.side, 'B/S')
  assert.equal(m.byField.account, 'Account')
  assert.ok(m.byField.quantity, 'quantity should be found')
  assert.ok(m.byField.price, 'a price column should be found')
  assert.ok(m.byField.orderId, 'an order id should be found')
  assert.equal(assessMapping(m).ready, true)
})

test('each header is claimed by at most one field', () => {
  const m = detectMapping(TRADOVATE_ORDERS)
  const used = m.matches.map((x) => x.header)
  assert.equal(new Set(used).size, used.length, `header reused: ${used.join(', ')}`)
})

test('an exact match is preferred over a partial one', () => {
  // "Realized PnL" only contains the alias; "PnL" is the alias exactly.
  const m = detectMapping(['Realized PnL', 'PnL'])
  assert.equal(m.byField.pnl, 'PnL')
  assert.equal(m.matches.find((x) => x.field === 'pnl')?.confidence, 'exact')
})

test('a round-turn file is not treated as fill level', () => {
  const m = detectMapping(['Symbol', 'Side', 'Qty', 'Entry Price', 'Exit Price', 'Entry Time', 'Exit Time', 'PnL'])
  const a = assessMapping(m)
  assert.equal(a.ready, true)
  assert.equal(a.isFillLevel, false)
})

test('a fill-level file is flagged so its rows get paired', () => {
  const m = detectMapping(['Symbol', 'B/S', 'Quantity', 'Price', 'Timestamp'])
  const a = assessMapping(m)
  assert.equal(a.ready, true)
  assert.equal(a.isFillLevel, true)
})

test('a file missing the essentials reports exactly what is absent', () => {
  const a = assessMapping(detectMapping(['Notes', 'Screenshot']))
  assert.equal(a.ready, false)
  assert.ok(a.missing.includes('symbol'))
  assert.ok(a.missing.includes('side'))
  assert.ok(a.missing.includes('quantity'))
})

test('columns the detector cannot place are reported rather than dropped', () => {
  const m = detectMapping(['Symbol', 'Side', 'Qty', 'Price', 'Timestamp', 'Strategy Tag', 'Screenshot URL'])
  assert.deepEqual(m.unmatched.sort(), ['Screenshot URL', 'Strategy Tag'])
})

test('values are read through the detected mapping, blanks as undefined', () => {
  const m = detectMapping(['Contract', 'B/S', 'Quantity'])
  const row = { Contract: 'NQZ5', 'B/S': 'Buy', Quantity: '' }
  assert.equal(readField(row, m, 'symbol'), 'NQZ5')
  assert.equal(readField(row, m, 'side'), 'Buy')
  assert.equal(readField(row, m, 'quantity'), undefined)
  assert.equal(readField(row, m, 'pnl'), undefined)
})

test('side is read in every form brokers use', () => {
  for (const v of ['B', 'Buy', 'buy', 'LONG', 'Bought', '1']) assert.equal(parseSide(v), 'LONG', v)
  for (const v of ['S', 'Sell', 'short', 'Sold', '-1']) assert.equal(parseSide(v), 'SHORT', v)
  for (const v of ['', 'maybe', undefined]) assert.equal(parseSide(v as string), null, String(v))
})

test('futures contract names reduce to their root', () => {
  assert.equal(rootSymbol('NQZ5'), 'NQ')
  assert.equal(rootSymbol('MESH6'), 'MES')
  assert.equal(rootSymbol('esu25'), 'ES')
  assert.equal(rootSymbol('GCZ25'), 'GC')
  assert.equal(rootSymbol('NQ'), 'NQ')       // already a root
  assert.equal(rootSymbol('EURUSD'), 'EURUSD') // not a futures code — left alone
  assert.equal(rootSymbol(undefined), '')
})

test('the dedupe key prefers the broker id over the row contents', () => {
  assert.equal(dedupeKey({ fillId: 'f1', orderId: 'o1' }), 'fill:f1')
  assert.equal(dedupeKey({ orderId: 'o1' }), 'order:o1')
})

test('identical fills share a key and differing ones do not', () => {
  const a = { symbol: 'NQ', side: 'Buy', quantity: '2', price: '18000', timestamp: 't' }
  assert.equal(dedupeKey(a), dedupeKey({ ...a }))
  assert.notEqual(dedupeKey(a), dedupeKey({ ...a, price: '18001' }))
  assert.notEqual(dedupeKey(a), dedupeKey({ ...a, timestamp: 'u' }))
})
