/**
 * JK TRADING — التعرّف على أعمدة ملف الصفقات
 *
 * معظم الطلاب على حسابات prop، و Tradovate بتقول إن حسابات الـ prop والتقييم
 * ما إلها صلاحية API. يعني الربط التلقائي مش خيار لأغلبهم، ورفع الملف هو
 * الطريق الأساسي مش البديل.
 *
 * Tradovate exports three different reports (Orders, Fills, Performance) and
 * their exact headers are not documented anywhere public — every third-party
 * guide describes a different one. Hardcoding a single header row would produce
 * an importer that fails silently the first time a student picks another report
 * or Tradovate renames a column.
 *
 * So instead of assuming a format, this matches each column by name against a
 * list of aliases and reports how confident it is. The UI shows that mapping and
 * lets the trader correct it, which also makes the importer work for brokers we
 * have never seen.
 */

/** The fields a trade row can supply. */
export type ImportField =
  | 'symbol'
  | 'side'
  | 'quantity'
  | 'price'
  | 'entryPrice'
  | 'exitPrice'
  | 'timestamp'
  | 'entryTime'
  | 'exitTime'
  | 'pnl'
  | 'fees'
  | 'orderId'
  | 'fillId'
  | 'account'

/**
 * Header aliases, lower-cased and stripped of spaces/underscores before compare.
 * The verbatim Tradovate Orders headers are included: orderId, Account,
 * Order ID, B/S, Contract, Product, avgPrice, filledQty, Fill Time, Timestamp,
 * Date, Quantity, Type, Limit Price, Stop Price, Filled Qty, Avg Fill Price.
 */
const ALIASES: Record<ImportField, string[]> = {
  symbol:     ['symbol', 'contract', 'instrument', 'ticker', 'product', 'productdescription'],
  side:       ['side', 'bs', 'b/s', 'buysell', 'direction', 'action', 'ordertype'],
  quantity:   ['quantity', 'qty', 'filledqty', 'size', 'contracts', 'volume', 'amount'],
  price:      ['price', 'avgprice', 'avgfillprice', 'fillprice', 'executionprice'],
  entryPrice: ['entryprice', 'buyprice', 'openprice', 'priceopen'],
  exitPrice:  ['exitprice', 'sellprice', 'closeprice', 'priceclose'],
  timestamp:  ['timestamp', 'filltime', 'time', 'datetime', 'executiontime', 'date'],
  entryTime:  ['entrytime', 'boughttimestamp', 'opentime', 'entrydatetime', 'openedat'],
  exitTime:   ['exittime', 'soldtimestamp', 'closetime', 'exitdatetime', 'closedat'],
  pnl:        ['pnl', 'p/l', 'profit', 'netpnl', 'realizedpnl', 'grosspnl', 'profitloss'],
  fees:       ['fees', 'fee', 'commission', 'commissions', 'cost', 'costs'],
  orderId:    ['orderid', 'order', 'lastcommandid'],
  fillId:     ['fillid', 'executionid', 'buyfillid', 'sellfillid', 'tradeid', 'id'],
  account:    ['account', 'accountid', 'accountname'],
}

/** Normalise a header so "Avg Fill Price", "avg_fill_price" and "avgFillPrice" agree. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-./\\]/g, '').trim()
}

export interface FieldMatch {
  field: ImportField
  /** The header exactly as it appears in the file. */
  header: string
  /** 'exact' when the normalised header equals an alias, 'partial' when it contains one. */
  confidence: 'exact' | 'partial'
}

export interface DetectedMapping {
  matches: FieldMatch[]
  /** Headers no field claimed — shown to the trader so nothing looks lost. */
  unmatched: string[]
  /** Convenience lookup: field -> header. */
  byField: Partial<Record<ImportField, string>>
}

/**
 * Guess which column holds which field.
 *
 * Exact alias matches win over partial ones, and each header is claimed by at
 * most one field, so "Avg Fill Price" cannot be read as both price and fees.
 */
export function detectMapping(headers: readonly string[]): DetectedMapping {
  const norm = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }))
  const takenHeaders = new Set<string>()
  const matches: FieldMatch[] = []

  // Two passes so an exact match is never beaten by a partial one elsewhere.
  for (const pass of ['exact', 'partial'] as const) {
    for (const field of Object.keys(ALIASES) as ImportField[]) {
      if (matches.some((m) => m.field === field)) continue
      const aliases = ALIASES[field]

      // Rank candidates by which alias they hit: the aliases are listed
      // canonical-first, so a column called "PnL" beats "Realized PnL" instead
      // of whichever happened to appear first in the file.
      let hit: { raw: string; key: string } | undefined
      let bestRank = Infinity
      for (const h of norm) {
        if (takenHeaders.has(h.raw)) continue
        const rank = pass === 'exact'
          ? aliases.indexOf(h.key)
          : aliases.findIndex((a) => a.length >= 3 && h.key.includes(a))
        if (rank === -1 || rank >= bestRank) continue
        hit = h
        bestRank = rank
      }

      if (hit) {
        matches.push({ field, header: hit.raw, confidence: pass })
        takenHeaders.add(hit.raw)
      }
    }
  }

  return {
    matches,
    unmatched: headers.filter((h) => !takenHeaders.has(h)),
    byField: Object.fromEntries(matches.map((m) => [m.field, m.header])),
  }
}

/** What the importer needs before it can create a trade. */
export const REQUIRED_FIELDS: ImportField[] = ['symbol', 'side', 'quantity']

export interface MappingReadiness {
  ready: boolean
  missing: ImportField[]
  /** True when the file looks like one row per fill rather than per round turn. */
  isFillLevel: boolean
}

/**
 * Whether a detected mapping is usable, and which shape the file is in.
 *
 * A file carrying entry and exit on the same row is already a round turn. One
 * carrying a single price and timestamp is fill-level and its rows have to be
 * paired before they mean anything.
 */
export function assessMapping(m: DetectedMapping): MappingReadiness {
  const has = (f: ImportField) => m.byField[f] !== undefined
  const missing = REQUIRED_FIELDS.filter((f) => !has(f))

  const hasRoundTurn = (has('entryPrice') && has('exitPrice')) || (has('entryTime') && has('exitTime'))
  const hasSingleFill = has('price') || has('timestamp')

  if (!hasRoundTurn && !hasSingleFill) missing.push('price')

  return {
    ready: missing.length === 0,
    missing,
    isFillLevel: !hasRoundTurn && hasSingleFill,
  }
}

/** Read a value for a field out of a row, using the detected mapping. */
export function readField(
  row: Record<string, string>,
  m: DetectedMapping,
  field: ImportField,
): string | undefined {
  const header = m.byField[field]
  if (!header) return undefined
  const v = row[header]
  return v === undefined || v === '' ? undefined : v
}

/** LONG / SHORT from whatever the broker calls it. Null when it is not a side. */
export function parseSide(raw: string | undefined): 'LONG' | 'SHORT' | null {
  if (!raw) return null
  const v = raw.toLowerCase().trim()
  if (['b', 'buy', 'long', 'bought', '1'].includes(v)) return 'LONG'
  if (['s', 'sell', 'short', 'sold', '-1'].includes(v)) return 'SHORT'
  return null
}

/**
 * Pull the root symbol out of a futures contract name: NQZ5 -> NQ, MESH6 -> MES.
 * Falls back to the input so an unrecognised instrument is still imported.
 */
export function rootSymbol(contract: string | undefined): string {
  if (!contract) return ''
  const c = contract.toUpperCase().trim()
  // Root letters, then a month code, then a one or two digit year.
  const m = /^([A-Z]{1,4})[FGHJKMNQUVXZ]\d{1,2}$/.exec(c)
  return m ? m[1] : c
}

/**
 * A stable identity for a row, so importing the same file twice does not double
 * every trade. Prefers the broker's own id; otherwise the facts of the fill.
 */
export function dedupeKey(parts: {
  fillId?: string
  orderId?: string
  symbol?: string
  side?: string
  quantity?: string
  price?: string
  timestamp?: string
}): string {
  if (parts.fillId) return `fill:${parts.fillId}`
  if (parts.orderId) return `order:${parts.orderId}`
  return [
    'row',
    parts.symbol ?? '',
    parts.side ?? '',
    parts.quantity ?? '',
    parts.price ?? '',
    parts.timestamp ?? '',
  ].join('|')
}
