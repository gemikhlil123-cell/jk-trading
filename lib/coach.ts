/**
 * JK TRADING — المدرّب الآلي (Rule-based Coach)
 *
 * محرّك تحليل حتمي (بدون AI/توكنز) بياخد صفقات المتداول ويطلّع تقرير تدريب:
 * الكومبو الرابح، قائمة "متى في صفقة"، القواعد (حافظ/طوّر/أوقف)،
 * أفضل الأوقات والجلسات، والأعلام النفسية. بالعربية.
 *
 * يُستعمل في صفحة المتداول (/coach) وفي صفحة الطالب عند المنتور.
 *
 * الترتيب مبني على التوقّع بالـ R (expectancy) — مش على مجموع الربح ولا على
 * نسبة الفوز. الفرق مهم: الإعداد اللي عليه صفقات كتير كان بيتصدّر لحاله، ونسبة
 * الفوز بتخلّي إعداد 40% بمكافأة 3R يبيّن أسوأ من إعداد 70% بمكافأة 0.5R.
 *
 * والنصائح (rules) ما بتنقال إلا لما تعدّي فحص العيّنة و Benjamini–Hochberg —
 * لأن فحص عشرات المقاطع على نفس الصفقات بيولّد "نتائج" بالصدفة. الأرقام بتنعرض
 * دايماً؛ اللي بينحجب هو الحكم عليها.
 */
import { jerusalemHour, jerusalemDayOfWeek } from './timezone'
import {
  edgeStat,
  liftStat,
  rankFindings,
  isReportable,
  confidenceFor,
  type Confidence,
  type TradeSample,
} from './edge-stats'

export interface CoachTrade {
  pnl: number
  rr: number | null
  direction: string
  symbol: string
  killzone: string | null
  cyclePhase: string | null
  entryTime: Date
  reasons: string[]
  selfRating: number | null
  emotionalState: string | null
}

/** Statistics attached to every bucket and reason so the UI can show its weight. */
export interface EdgeFields {
  /** Mean realised R. Null when no trade in the bucket carries an R. */
  expectancyR: number | null
  ciLowR: number | null
  ciHighR: number | null
  confidence: Confidence
  /** The confidence interval excludes zero. */
  significant: boolean
  /** True when the finding also survived the multiple-comparison correction. */
  established: boolean
}

export interface ReasonStat extends EdgeFields {
  name: string
  n: number
  winRate: number
  totalPnl: number
  avgPnl: number
  /** Mean R with this reason minus mean R without it — what it actually adds. */
  liftR: number | null
}

export interface Bucket extends EdgeFields {
  key: string
  label: string
  n: number
  winRate: number
  pnl: number
}

export interface CoachReport {
  hasEnoughData: boolean
  totalTrades: number
  overall: {
    winRate: number
    totalPnl: number
    avgWin: number
    avgLoss: number
    profitFactor: number
    avgR: number | null
    expectancy: number
  }
  bestSession: Bucket | null
  bestHours: Bucket[]
  bestDays: Bucket[]
  bestSymbol: Bucket | null
  keepReasons: ReasonStat[]
  developReasons: ReasonStat[]
  avoidReasons: ReasonStat[]
  winningCombo: string[]
  checklist: string[]
  psychFlags: { state: string; n: number; winRate: number; pnl: number }[]
  rules: { keep: string[]; develop: string[]; stop: string[] }
  /** How many cuts were tested and how many survived — why advice may be empty. */
  evidence: { tested: number; established: number; tradesWithR: number }
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const KZ_LABELS: Record<string, string> = {
  ASIA: 'آسيا', LONDON: 'لندن', NY_AM: 'نيويورك صباحاً', NY_PM: 'نيويورك مساءً', OFF_HOURS: 'خارج الأوقات',
}

function money(n: number): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function rTxt(r: number | null): string {
  return r == null ? '—' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`
}

const toSample = (t: CoachTrade): TradeSample => ({ r: t.rr, pnl: t.pnl })

const emptyEdge: EdgeFields = {
  expectancyR: null, ciLowR: null, ciHighR: null,
  confidence: 'INSUFFICIENT', significant: false, established: false,
}

/**
 * Order by expectancy per trade, best first.
 * Falls back to dollar expectancy when a bucket has no R data — never to total
 * P&L, which just ranks whichever bucket happens to hold the most trades.
 */
function byExpectancy(a: Bucket | ReasonStat, b: Bucket | ReasonStat): number {
  const av = a.expectancyR ?? ('avgPnl' in a ? a.avgPnl : a.pnl / Math.max(a.n, 1)) / 100
  const bv = b.expectancyR ?? ('avgPnl' in b ? b.avgPnl : b.pnl / Math.max(b.n, 1)) / 100
  return bv - av
}

function bucketize(
  trades: CoachTrade[],
  keyFn: (t: CoachTrade) => string | null,
  labelFn: (k: string) => string,
  minN: number,
): Bucket[] {
  const map: Record<string, CoachTrade[]> = {}
  for (const t of trades) {
    const k = keyFn(t)
    if (k == null) continue
    ;(map[k] = map[k] || []).push(t)
  }
  return Object.entries(map)
    .filter(([, arr]) => arr.length >= minN)
    .map(([key, arr]) => {
      const s = edgeStat(arr.map(toSample))
      return {
        key,
        label: labelFn(key),
        n: arr.length,
        winRate: s.winRate,
        pnl: s.totalPnl,
        expectancyR: s.expectancyR,
        ciLowR: s.ciLowR,
        ciHighR: s.ciHighR,
        confidence: s.confidence,
        significant: s.significant,
        established: false, // set after the multiple-comparison pass
        _p: s.pValue,
      } as Bucket & { _p: number | null }
    })
    .sort(byExpectancy)
}

/** Build the deterministic coaching report from a trader's (ideally closed) trades. */
export function buildCoachReport(trades: CoachTrade[]): CoachReport {
  const closed = trades.filter((t) => Number.isFinite(t.pnl))
  const total = closed.length

  const empty: CoachReport = {
    hasEnoughData: false,
    totalTrades: total,
    overall: { winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, avgR: null, expectancy: 0 },
    bestSession: null, bestHours: [], bestDays: [], bestSymbol: null,
    keepReasons: [], developReasons: [], avoidReasons: [],
    winningCombo: [], checklist: [], psychFlags: [],
    rules: { keep: [], develop: [], stop: [] },
    evidence: { tested: 0, established: 0, tradesWithR: 0 },
  }
  if (total < 8) return empty

  // Sample-adaptive minimum bucket size — governs what is *displayed*.
  // Whether a bucket may drive advice is decided separately, by isReportable.
  const minN = Math.max(3, Math.round(total * 0.06))

  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl <= 0)
  const sum = (a: CoachTrade[]) => a.reduce((s, t) => s + t.pnl, 0)
  const overallStat = edgeStat(closed.map(toSample))
  const totalPnl = overallStat.totalPnl
  const winRate = overallStat.winRate
  const avgWin = wins.length ? sum(wins) / wins.length : 0
  const avgLoss = losses.length ? sum(losses) / losses.length : 0
  const grossW = sum(wins)
  const grossL = Math.abs(sum(losses))
  const profitFactor = grossL > 0 ? grossW / grossL : grossW > 0 ? 999 : 0
  const avgR = overallStat.expectancyR
  const expectancy = overallStat.expectancyUsd
  const tradesWithR = overallStat.nWithR

  // ─── Buckets ───
  const sessions = bucketize(closed, (t) => t.killzone ?? 'OFF_HOURS', (k) => KZ_LABELS[k] ?? k, minN)
  const bestSession = sessions[0] ?? null
  const allHours = bucketize(closed, (t) => String(jerusalemHour(t.entryTime)), (k) => `${k.padStart(2, '0')}:00`, minN)
  const hours = allHours.slice(0, 4)
  const weakHours = allHours.slice().reverse()
  const days = bucketize(closed, (t) => String(jerusalemDayOfWeek(t.entryTime)), (k) => DAY_NAMES[Number(k)], Math.max(2, Math.round(minN * 0.7))).slice(0, 4)
  const symbols = bucketize(closed, (t) => (t.symbol || '').toUpperCase(), (k) => k, minN)
  const bestSymbol = symbols.length > 1 ? symbols[0] : null

  // ─── Entry reasons, measured as lift against the trader's own baseline ───
  // A reason shared by winners and losers alike used to land in both the best
  // and the worst list. Membership says nothing; the difference it makes does.
  const reasonNames = new Set<string>()
  for (const t of closed) for (const r of t.reasons) reasonNames.add(r)

  const reasonStats: (ReasonStat & { _p: number | null })[] = []
  reasonNames.forEach((name) => {
    const withIt = closed.filter((t) => t.reasons.includes(name))
    const withoutIt = closed.filter((t) => !t.reasons.includes(name))
    if (withIt.length < Math.max(3, minN)) return
    const s = edgeStat(withIt.map(toSample))
    const l = liftStat(withIt.map(toSample), withoutIt.map(toSample))
    reasonStats.push({
      name,
      n: withIt.length,
      winRate: s.winRate,
      totalPnl: s.totalPnl,
      avgPnl: s.expectancyUsd,
      liftR: l.liftR,
      expectancyR: s.expectancyR,
      ciLowR: s.ciLowR,
      ciHighR: s.ciHighR,
      confidence: s.confidence,
      significant: l.significant || s.significant,
      established: false,
      _p: l.pValue ?? s.pValue,
    })
  })

  // ─── One multiple-comparison pass over every cut tested above ───
  type Tagged = { kind: 'bucket' | 'reason'; key: string }
  const candidates = [
    ...[...sessions, ...allHours, ...days, ...symbols].map((b) => ({
      item: { kind: 'bucket' as const, key: `${b.label}` },
      pValue: (b as Bucket & { _p: number | null })._p,
      effectR: b.expectancyR ?? 0,
      n: b.n,
      ref: b as Bucket,
    })),
    ...reasonStats.map((r) => ({
      item: { kind: 'reason' as const, key: r.name },
      pValue: r._p,
      effectR: r.liftR ?? r.expectancyR ?? 0,
      n: r.n,
      ref: r as ReasonStat,
    })),
  ]
  const survivors = new Set(
    rankFindings<Tagged>(candidates, 0.1).map((f) => `${f.item.kind}:${f.item.key}`),
  )
  for (const c of candidates) {
    c.ref.established =
      survivors.has(`${c.item.kind}:${c.item.key}`) && isReportable(c.ref)
  }

  /** A finding may drive advice only once it clears both gates. */
  const solid = (x: EdgeFields) => x.established

  const keepReasons = reasonStats
    .filter((r) => (r.liftR ?? r.expectancyR ?? 0) > 0)
    .sort((a, b) => (b.liftR ?? 0) - (a.liftR ?? 0))
    .slice(0, 6)
  const keepNames = new Set(keepReasons.map((r) => r.name))

  const avoidReasons = reasonStats
    .filter((r) => !keepNames.has(r.name) && (r.liftR ?? r.expectancyR ?? 0) < 0)
    .sort((a, b) => (a.liftR ?? 0) - (b.liftR ?? 0))
    .slice(0, 4)
  const avoidNames = new Set(avoidReasons.map((r) => r.name))

  const developReasons = reasonStats
    .filter((r) => !keepNames.has(r.name) && !avoidNames.has(r.name))
    .sort(byExpectancy)
    .slice(0, 4)

  // ─── Winning combo: reasons carrying real lift, best first ───
  const winningCombo = keepReasons.filter(solid).slice(0, 5).map((r) => r.name)

  // ─── Psychology flags: emotional states that underperform ───
  const emap: Record<string, CoachTrade[]> = {}
  for (const t of closed) {
    if (!t.emotionalState) continue
    ;(emap[t.emotionalState] = emap[t.emotionalState] || []).push(t)
  }
  const psychFlags = Object.entries(emap)
    .map(([state, arr]) => {
      const s = edgeStat(arr.map(toSample))
      return { state, n: arr.length, winRate: s.winRate, pnl: s.totalPnl, expR: s.expectancyR }
    })
    .filter((e) => e.n >= Math.max(2, Math.round(minN * 0.6)) && ((e.expR ?? 0) < 0 || e.pnl < 0))
    .sort((a, b) => (a.expR ?? 0) - (b.expR ?? 0))
    .map(({ state, n, winRate, pnl }) => ({ state, n, winRate, pnl }))

  // ─── The "trade / no-trade" checklist ───
  const checklist: string[] = []
  if (bestSession && solid(bestSession)) checklist.push(`أنا بجلسة ${bestSession.label} (أقوى جلسة عندك)`)
  const solidHours = hours.filter(solid)
  if (solidHours.length) {
    const hrs = solidHours.slice(0, 3).map((h) => h.label).join(' أو ')
    checklist.push(`الوقت ضمن نافذتك الرابحة (${hrs} بتوقيت القدس)`)
  }
  winningCombo.slice(0, 3).forEach((r) => checklist.push(`عندي تأكيد: ${r}`))
  if (bestSymbol && solid(bestSymbol)) checklist.push(`الأداة هي ${bestSymbol.key} (أفضل أداة عندك)`)

  // ─── Generated rules (keep / develop / stop) ───
  const keep: string[] = []
  const develop: string[] = []
  const stop: string[] = []

  if (avgLoss < 0 && Math.abs(avgLoss) < avgWin) {
    keep.push(`متوسط خسارتك (${money(avgLoss)}) أصغر من متوسط ربحك (${money(avgWin)}) — انضباطك بقطع الخسارة ممتاز، حافظ عليه.`)
  }
  if (bestSession && solid(bestSession)) {
    keep.push(`ركّز على جلسة ${bestSession.label}: ${bestSession.n} صفقة، توقّع ${rTxt(bestSession.expectancyR)} للصفقة، ${money(bestSession.pnl)}.`)
  }
  if (bestSymbol && solid(bestSymbol)) {
    keep.push(`أفضل أداة عندك ${bestSymbol.key} (توقّع ${rTxt(bestSymbol.expectancyR)} على ${bestSymbol.n} صفقة) — خليها أساسك.`)
  }
  keepReasons.filter(solid).slice(0, 2).forEach((r) => {
    keep.push(`استمر باستعمال "${r.name}" — بيضيف ${rTxt(r.liftR)} للصفقة مقارنة بصفقاتك بدونه (${r.n} صفقة).`)
  })

  if (solidHours.length) {
    develop.push(`اجلس للتحليل قبل نافذتك الرابحة (${solidHours.slice(0, 3).map((h) => h.label).join(' / ')}) وحضّر تحيّزك ومناطقك.`)
  }
  developReasons.slice(0, 2).forEach((r) => {
    if ((r.liftR ?? 0) > 0 && !solid(r)) {
      develop.push(`"${r.name}" واعد (${rTxt(r.liftR)}) بس العيّنة لسا صغيرة (${r.n} صفقة) — اجمع عليه بيانات أكتر قبل ما تبني عليه.`)
    }
  })
  if (avgR != null && avgR < 2) {
    develop.push(`متوسط R عندك ${avgR.toFixed(2)} — اشتغل على ترك الرابحة تركض أكتر لرفع متوسط المكافأة.`)
  }
  if (tradesWithR < total * 0.6) {
    develop.push(`${total - tradesWithR} صفقة من ${total} بدون R مسجّل — بدون الـ R ما فينا نقيس حافتك بشكل صحيح.`)
  }

  const worstHour = weakHours.find((h) => (h.expectancyR ?? 0) < 0 && solid(h))
  if (worstHour) {
    stop.push(`تجنّب التداول الساعة ${worstHour.label} — أضعف وقت عندك (${rTxt(worstHour.expectancyR)} على ${worstHour.n} صفقة).`)
  }
  avoidReasons.filter(solid).slice(0, 2).forEach((r) => {
    stop.push(`لا تدخل بالاعتماد على "${r.name}" لحاله — بيخصم ${rTxt(r.liftR)} من الصفقة (${r.n} صفقة).`)
  })
  psychFlags.slice(0, 1).forEach((e) => {
    stop.push(`لما تحسّ حالك "${e.state}" — وقّف أو صغّر الحجم؛ صفقاتك بهالحالة أضعف (${e.winRate.toFixed(0)}% فوز).`)
  })
  if (profitFactor < 1.2 && total >= 12) {
    stop.push('عامل الربح منخفض — قلّل عدد الصفقات وركّز على أفضل الإعدادات فقط.')
  }

  const strip = <T extends object>(x: T): T => {
    const { _p, ...rest } = x as T & { _p?: unknown }
    return rest as T
  }

  return {
    hasEnoughData: true,
    totalTrades: total,
    overall: { winRate, totalPnl, avgWin, avgLoss, profitFactor, avgR, expectancy },
    bestSession: bestSession ? strip(bestSession) : null,
    bestHours: hours.map(strip),
    bestDays: days.map(strip),
    bestSymbol: bestSymbol ? strip(bestSymbol) : null,
    keepReasons: keepReasons.map(strip),
    developReasons: developReasons.map(strip),
    avoidReasons: avoidReasons.map(strip),
    winningCombo,
    checklist,
    psychFlags,
    rules: { keep, develop, stop },
    evidence: {
      tested: candidates.length,
      established: candidates.filter((c) => c.ref.established).length,
      tradesWithR,
    },
  }
}

/** Re-exported so callers can label a bucket without importing edge-stats. */
export { confidenceFor }
