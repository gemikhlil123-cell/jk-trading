/**
 * JK TRADING — المدرّب الآلي (Rule-based Coach)
 *
 * محرّك تحليل حتمي (بدون AI/توكنز) بياخد صفقات المتداول ويطلّع تقرير تدريب:
 * الكومبو الرابح، قائمة "متى في صفقة"، القواعد (حافظ/طوّر/أوقف)،
 * أفضل الأوقات والجلسات، والأعلام النفسية. بالعربية.
 *
 * يُستعمل في صفحة المتداول (/coach) وفي صفحة الطالب عند المنتور.
 */
import { jerusalemHour, jerusalemDayOfWeek } from './timezone'

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

export interface ReasonStat {
  name: string
  n: number
  winRate: number
  totalPnl: number
  avgPnl: number
}

export interface Bucket {
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
}

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const KZ_LABELS: Record<string, string> = {
  ASIA: 'آسيا', LONDON: 'لندن', NY_AM: 'نيويورك صباحاً', NY_PM: 'نيويورك مساءً', OFF_HOURS: 'خارج الأوقات',
}

function money(n: number): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
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
    .map(([key, arr]) => ({
      key,
      label: labelFn(key),
      n: arr.length,
      winRate: (arr.filter((t) => t.pnl > 0).length / arr.length) * 100,
      pnl: arr.reduce((s, t) => s + t.pnl, 0),
    }))
    .filter((b) => b.n >= minN)
    .sort((a, b) => b.pnl - a.pnl)
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
  }
  if (total < 8) return empty

  // Sample-adaptive minimum bucket size
  const minN = Math.max(3, Math.round(total * 0.06))

  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl <= 0)
  const sum = (a: CoachTrade[]) => a.reduce((s, t) => s + t.pnl, 0)
  const totalPnl = sum(closed)
  const winRate = (wins.length / total) * 100
  const avgWin = wins.length ? sum(wins) / wins.length : 0
  const avgLoss = losses.length ? sum(losses) / losses.length : 0
  const grossW = sum(wins)
  const grossL = Math.abs(sum(losses))
  const profitFactor = grossL > 0 ? grossW / grossL : grossW > 0 ? 999 : 0
  const rrArr = closed.filter((t) => t.rr != null).map((t) => t.rr as number)
  const avgR = rrArr.length ? rrArr.reduce((s, r) => s + r, 0) / rrArr.length : null
  const p = wins.length / total
  const expectancy = p * avgWin + (1 - p) * avgLoss

  // ─── Buckets ───
  const sessions = bucketize(closed, (t) => t.killzone ?? 'OFF_HOURS', (k) => KZ_LABELS[k] ?? k, minN)
  const bestSession = sessions[0] ?? null
  const hours = bucketize(closed, (t) => String(jerusalemHour(t.entryTime)), (k) => `${k.padStart(2, '0')}:00`, minN)
    .filter((b) => b.winRate >= 60)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 4)
  const days = bucketize(closed, (t) => String(jerusalemDayOfWeek(t.entryTime)), (k) => DAY_NAMES[Number(k)], Math.max(2, Math.round(minN * 0.7)))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 4)
  const symbols = bucketize(closed, (t) => (t.symbol || '').toUpperCase(), (k) => k, minN)
  const bestSymbol = symbols.length > 1 ? symbols[0] : null

  // ─── Entry reasons ───
  const rmap: Record<string, CoachTrade[]> = {}
  for (const t of closed) for (const r of t.reasons) (rmap[r] = rmap[r] || []).push(t)
  const reasonStats: ReasonStat[] = Object.entries(rmap)
    .map(([name, arr]) => ({
      name,
      n: arr.length,
      winRate: (arr.filter((t) => t.pnl > 0).length / arr.length) * 100,
      totalPnl: sum(arr),
      avgPnl: sum(arr) / arr.length,
    }))
    .filter((r) => r.n >= Math.max(3, minN))

  const keepReasons = reasonStats
    .filter((r) => r.winRate >= 65 && r.avgPnl > 0)
    .map((r) => ({ ...r, score: (r.winRate / 100) * Math.log2(r.n + 1) * Math.max(r.avgPnl, 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
  const keepNames = new Set(keepReasons.map((r) => r.name))

  const avoidReasons = reasonStats
    .filter((r) => !keepNames.has(r.name) && (r.winRate <= 45 || r.totalPnl < 0))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 4)
  const avoidNames = new Set(avoidReasons.map((r) => r.name))

  const developReasons = reasonStats
    .filter((r) => !keepNames.has(r.name) && !avoidNames.has(r.name))
    .sort((a, b) => b.avgPnl - a.avgPnl)
    .slice(0, 4)

  // ─── Winning combo: reasons most present among the top-quartile winners ───
  const topWinners = [...wins].sort((a, b) => b.pnl - a.pnl).slice(0, Math.max(3, Math.ceil(wins.length * 0.25)))
  const comboCount: Record<string, number> = {}
  for (const t of topWinners) for (const r of t.reasons) comboCount[r] = (comboCount[r] || 0) + 1
  const winningCombo = Object.entries(comboCount)
    .filter(([, c]) => c >= Math.max(2, Math.ceil(topWinners.length * 0.5)))
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5)

  // ─── Psychology flags: emotional states that underperform ───
  const emap: Record<string, CoachTrade[]> = {}
  for (const t of closed) {
    if (!t.emotionalState) continue
    ;(emap[t.emotionalState] = emap[t.emotionalState] || []).push(t)
  }
  const psychFlags = Object.entries(emap)
    .map(([state, arr]) => ({
      state,
      n: arr.length,
      winRate: (arr.filter((t) => t.pnl > 0).length / arr.length) * 100,
      pnl: sum(arr),
    }))
    .filter((e) => e.n >= Math.max(2, Math.round(minN * 0.6)) && (e.winRate < winRate - 12 || e.pnl < 0))
    .sort((a, b) => a.winRate - b.winRate)

  // ─── The "trade / no-trade" checklist ───
  const checklist: string[] = []
  if (bestSession) checklist.push(`أنا بجلسة ${bestSession.label} (أقوى جلسة عندك)`)
  if (hours.length) {
    const hrs = hours.slice(0, 3).map((h) => h.label).join(' أو ')
    checklist.push(`الوقت ضمن نافذتك الرابحة (${hrs} بتوقيت القدس)`)
  }
  winningCombo.slice(0, 3).forEach((r) => checklist.push(`عندي تأكيد: ${r}`))
  if (bestSymbol) checklist.push(`الأداة هي ${bestSymbol.key} (أفضل أداة عندك)`)

  // ─── Generated rules (keep / develop / stop) ───
  const keep: string[] = []
  const develop: string[] = []
  const stop: string[] = []

  if (avgLoss < 0 && Math.abs(avgLoss) < avgWin) {
    keep.push(`متوسط خسارتك (${money(avgLoss)}) أصغر من متوسط ربحك (${money(avgWin)}) — انضباطك بقطع الخسارة ممتاز، حافظ عليه.`)
  }
  if (bestSession) keep.push(`ركّز على جلسة ${bestSession.label}: ${bestSession.n} صفقة، نسبة فوز ${bestSession.winRate.toFixed(0)}%، ${money(bestSession.pnl)}.`)
  if (bestSymbol) keep.push(`أفضل أداة عندك ${bestSymbol.key} (${bestSymbol.winRate.toFixed(0)}% فوز) — خليها أساسك.`)
  keepReasons.slice(0, 2).forEach((r) => keep.push(`استمر باستعمال "${r.name}" (${r.winRate.toFixed(0)}% فوز، متوسط ${money(r.avgPnl)}).`))

  if (hours.length) develop.push(`اجلس للتحليل قبل نافذتك الرابحة (${hours.slice(0, 3).map((h) => h.label).join(' / ')}) وحضّر تحيّزك ومناطقك.`)
  developReasons.slice(0, 2).forEach((r) => {
    if (r.winRate >= 60) develop.push(`"${r.name}" واعد (${r.winRate.toFixed(0)}% فوز) بس عيّنة قليلة — اجمع عليه بيانات أكتر.`)
  })
  if (avgR != null && avgR < 2) develop.push(`متوسط R عندك ${avgR.toFixed(2)} — اشتغل على ترك الرابحة تركض أكتر لرفع متوسط المكافأة.`)

  const weakHours = bucketize(closed, (t) => String(jerusalemHour(t.entryTime)), (k) => `${k.padStart(2, '0')}:00`, minN)
    .filter((b) => b.winRate < 50)
    .sort((a, b) => a.winRate - b.winRate)
  if (weakHours.length) stop.push(`تجنّب التداول الساعة ${weakHours[0].label} — أضعف وقت عندك (${weakHours[0].winRate.toFixed(0)}% فوز فقط).`)
  avoidReasons.slice(0, 2).forEach((r) => stop.push(`لا تدخل بالاعتماد على "${r.name}" لحاله (${r.winRate.toFixed(0)}% فوز).`))
  psychFlags.slice(0, 1).forEach((e) => stop.push(`لما تحسّ حالك "${e.state}" — وقّف أو صغّر الحجم؛ صفقاتك بهالحالة أضعف (${e.winRate.toFixed(0)}% فوز).`))
  if (profitFactor < 1.2 && total >= 12) stop.push('عامل الربح منخفض — قلّل عدد الصفقات وركّز على أفضل الإعدادات فقط.')

  return {
    hasEnoughData: true,
    totalTrades: total,
    overall: { winRate, totalPnl, avgWin, avgLoss, profitFactor, avgR, expectancy },
    bestSession, bestHours: hours, bestDays: days, bestSymbol,
    keepReasons, developReasons, avoidReasons,
    winningCombo, checklist, psychFlags,
    rules: { keep, develop, stop },
  }
}
