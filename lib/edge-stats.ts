/**
 * JK TRADING — إحصاء الحافة (Edge statistics)
 *
 * البدائل الصحيحة لترتيب النتائج في المدرّب: التوقّع بالـ R مع مجال ثقة،
 * درجات حجم العيّنة، قياس إضافة كل تأكيد (lift)، وتصحيح Benjamini–Hochberg.
 *
 * ليش هذا ضروري: `bucketize()` القديمة كانت بترتّب حسب مجموع الربح وبتحكم حسب
 * نسبة الفوز — يعني الإعداد اللي عليه صفقات كتير بيفوز أوتوماتيكياً، ونسبة الفوز
 * لحالها بتضلّل. وفوق هيك، فحص عشرات المقاطع على نفس الصفقات بيولّد "نتائج"
 * بالصدفة: 80 فحص بيعطي ~4 نتائج تبيّن مهمّة وهي مش مهمّة.
 *
 * Nothing here is user-facing text; callers translate from the returned data.
 */

// ─── Sample-size tiers ───────────────────────────────────────────────────────

/** Below `emerging` nothing may be stated as a conclusion. */
export const SAMPLE_TIERS = {
  emerging: 20,
  usable: 50,
  established: 100,
} as const

export type Confidence = 'INSUFFICIENT' | 'EMERGING' | 'USABLE' | 'ESTABLISHED'

export function confidenceFor(n: number): Confidence {
  if (n >= SAMPLE_TIERS.established) return 'ESTABLISHED'
  if (n >= SAMPLE_TIERS.usable) return 'USABLE'
  if (n >= SAMPLE_TIERS.emerging) return 'EMERGING'
  return 'INSUFFICIENT'
}

/** Default two-sided alpha for confidence intervals and significance. */
export const DEFAULT_ALPHA = 0.1

// ─── Inputs and outputs ──────────────────────────────────────────────────────

export interface TradeSample {
  /** Realised R. Trades without one are excluded from every R statistic. */
  r: number | null
  pnl: number
}

export interface EdgeStat {
  /** Trades in the bucket. */
  n: number
  /** Of those, how many carry an R value — the sample the R stats actually use. */
  nWithR: number
  /** Mean realised R. The primary ranking metric. */
  expectancyR: number | null
  ciLowR: number | null
  ciHighR: number | null
  /** Mean P&L per trade, in account currency. */
  expectancyUsd: number
  totalPnl: number
  winRate: number
  confidence: Confidence
  /** Two-sided p-value against "mean R is zero". Null when R data is too thin. */
  pValue: number | null
  /** The confidence interval excludes zero. Statistical only — see isReportable. */
  significant: boolean
}

/**
 * A finding is only worth telling a trader when it is both statistically real
 * and backed by enough trades. Significance alone is not enough.
 */
export function isReportable(stat: Pick<EdgeStat, 'significant' | 'confidence'>): boolean {
  return stat.significant && stat.confidence !== 'INSUFFICIENT'
}

// ─── Descriptive helpers ─────────────────────────────────────────────────────

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Sample standard deviation (n − 1). Zero for fewer than two values. */
export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const ss = xs.reduce((a, x) => a + (x - m) * (x - m), 0)
  return Math.sqrt(ss / (xs.length - 1))
}

// ─── Student's t ─────────────────────────────────────────────────────────────

/** Continued fraction for the incomplete beta function (Lentz's method). */
function betacf(a: number, b: number, x: number): number {
  const TINY = 1e-30
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < TINY) d = TINY
  d = 1 / d
  let h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-12) break
  }
  return h
}

function lnGamma(z: number): number {
  const g = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let x = z
  let y = z
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += g[j] / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

/** Regularized incomplete beta I_x(a, b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b
}

/**
 * Two-sided p-value for a t statistic: P(|T| > |t|) with `df` degrees of freedom.
 * Uses P = I_{df/(df+t²)}(df/2, 1/2).
 */
export function tTestP(t: number, df: number): number {
  if (!(df > 0) || !Number.isFinite(t)) return 1
  return incompleteBeta(df / 2, 0.5, df / (df + t * t))
}

/** The t value whose two-sided tail probability equals `alpha`. */
export function tCritical(df: number, alpha: number = DEFAULT_ALPHA): number {
  if (!(df > 0)) return Infinity
  let lo = 0
  let hi = 200
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2
    // tTestP decreases as t grows.
    if (tTestP(mid, df) > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ─── The bucket statistic ────────────────────────────────────────────────────

/**
 * Summarise one bucket of trades — a setup, an hour, a confluence, a weekday.
 *
 * R statistics need at least two trades carrying an R value; with fewer, the
 * expectancy is still reported but the interval and p-value are null rather
 * than a made-up number.
 */
export function edgeStat(
  trades: readonly TradeSample[],
  alpha: number = DEFAULT_ALPHA,
): EdgeStat {
  const n = trades.length
  const pnls = trades.map((t) => t.pnl)
  const rs = trades.filter((t) => t.r != null && Number.isFinite(t.r)).map((t) => t.r as number)

  const base: EdgeStat = {
    n,
    nWithR: rs.length,
    expectancyR: rs.length ? mean(rs) : null,
    ciLowR: null,
    ciHighR: null,
    expectancyUsd: mean(pnls),
    totalPnl: pnls.reduce((a, b) => a + b, 0),
    winRate: n ? (trades.filter((t) => t.pnl > 0).length / n) * 100 : 0,
    confidence: confidenceFor(n),
    pValue: null,
    significant: false,
  }

  if (rs.length < 2) return base

  const m = mean(rs)
  const sd = stdev(rs)
  const se = sd / Math.sqrt(rs.length)
  const df = rs.length - 1

  if (se === 0) {
    // Every trade returned the same R. The mean is exact; there is no spread to
    // build an interval from, so report the point and stay silent on the rest.
    return { ...base, ciLowR: m, ciHighR: m, pValue: m === 0 ? 1 : 0, significant: m !== 0 }
  }

  const tCrit = tCritical(df, alpha)
  const pValue = tTestP(m / se, df)
  const ciLowR = m - tCrit * se
  const ciHighR = m + tCrit * se

  return {
    ...base,
    ciLowR,
    ciHighR,
    pValue,
    significant: ciLowR > 0 || ciHighR < 0,
  }
}

// ─── Lift: what a confluence actually adds ───────────────────────────────────

export interface LiftStat {
  withN: number
  withoutN: number
  withR: number | null
  withoutR: number | null
  /** Mean R with the confluence minus mean R without it. */
  liftR: number | null
  ciLowR: number | null
  ciHighR: number | null
  pValue: number | null
  confidence: Confidence
  significant: boolean
}

/**
 * Compare a confluence's trades against the trades that lacked it (Welch's t).
 *
 * This is the fix for the same reason appearing in both the best and the worst
 * list: membership in a group says nothing on its own. What matters is the
 * difference the confluence makes against the trader's own baseline.
 */
export function liftStat(
  withIt: readonly TradeSample[],
  withoutIt: readonly TradeSample[],
  alpha: number = DEFAULT_ALPHA,
): LiftStat {
  const a = withIt.filter((t) => t.r != null && Number.isFinite(t.r)).map((t) => t.r as number)
  const b = withoutIt.filter((t) => t.r != null && Number.isFinite(t.r)).map((t) => t.r as number)

  const base: LiftStat = {
    withN: withIt.length,
    withoutN: withoutIt.length,
    withR: a.length ? mean(a) : null,
    withoutR: b.length ? mean(b) : null,
    liftR: a.length && b.length ? mean(a) - mean(b) : null,
    ciLowR: null,
    ciHighR: null,
    pValue: null,
    confidence: confidenceFor(Math.min(withIt.length, withoutIt.length)),
    significant: false,
  }

  if (a.length < 2 || b.length < 2) return base

  const va = stdev(a) ** 2 / a.length
  const vb = stdev(b) ** 2 / b.length
  const se = Math.sqrt(va + vb)
  if (se === 0) return base

  // Welch–Satterthwaite degrees of freedom.
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1))
  const diff = mean(a) - mean(b)
  const tCrit = tCritical(df, alpha)

  return {
    ...base,
    liftR: diff,
    ciLowR: diff - tCrit * se,
    ciHighR: diff + tCrit * se,
    pValue: tTestP(diff / se, df),
    significant: diff - tCrit * se > 0 || diff + tCrit * se < 0,
  }
}

// ─── Multiple comparisons ────────────────────────────────────────────────────

export interface Finding<T> {
  item: T
  /** Null p-values are treated as "not established" and never pass. */
  pValue: number | null
  /** Signed effect size in R — used for impact ranking, not for the FDR test. */
  effectR: number
  n: number
}

export type CheckedFinding<T> = Finding<T> & {
  passesFdr: boolean
  /** |effect| × √n — how much this finding is worth saying out loud. */
  impact: number
}

/**
 * Benjamini–Hochberg over every cut tested on the same trades.
 *
 * Running 14 cuts across ~6 values each is 80-odd tests; at alpha 0.1 roughly
 * eight of them look real by chance alone. BH controls the share of false
 * findings among those reported, so a coach that surfaces the top three is
 * surfacing three findings rather than three coincidences.
 */
export function benjaminiHochberg<T>(
  findings: readonly Finding<T>[],
  q: number = DEFAULT_ALPHA,
): CheckedFinding<T>[] {
  const withP = findings.filter((f) => f.pValue != null)
  const m = withP.length

  const ordered = withP.slice().sort((x, y) => (x.pValue as number) - (y.pValue as number))
  let cutoffRank = 0
  for (let i = 0; i < m; i++) {
    if ((ordered[i].pValue as number) <= ((i + 1) / m) * q) cutoffRank = i + 1
  }
  const threshold = cutoffRank > 0 ? (ordered[cutoffRank - 1].pValue as number) : -1

  return findings.map((f) => ({
    ...f,
    passesFdr: f.pValue != null && f.pValue <= threshold,
    impact: Math.abs(f.effectR) * Math.sqrt(Math.max(f.n, 0)),
  }))
}

/** Findings that survived BH, most impactful first — what the mentor talks about. */
export function rankFindings<T>(
  findings: readonly Finding<T>[],
  q: number = DEFAULT_ALPHA,
): CheckedFinding<T>[] {
  return benjaminiHochberg(findings, q)
    .filter((f) => f.passesFdr)
    .sort((x, y) => y.impact - x.impact)
}
