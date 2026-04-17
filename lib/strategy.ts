import { DeepAnalysis, ReasonRow, BreakdownRow } from './deep-analysis'

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface StrategyRule {
  type: 'TAKE' | 'AVOID' | 'OBSERVE'
  title: string
  description: string
  winRate: number
  sample: number
  confidence: ConfidenceLevel
}

export interface GeneratedStrategy {
  overview: string
  confidence: ConfidenceLevel
  totalTrades: number
  rules: {
    take: StrategyRule[]
    avoid: StrategyRule[]
    observe: StrategyRule[]
  }
  positionSizing: string[]
  sessionPlan: string[]
  redFlags: string[]
}

function confidenceFromSample(sample: number): ConfidenceLevel {
  if (sample >= 30) return 'HIGH'
  if (sample >= 15) return 'MEDIUM'
  if (sample >= 5) return 'LOW'
  return 'NONE'
}

function overallConfidence(total: number): ConfidenceLevel {
  if (total >= 100) return 'HIGH'
  if (total >= 40) return 'MEDIUM'
  if (total >= 15) return 'LOW'
  return 'NONE'
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

export function generateStrategy(analysis: DeepAnalysis): GeneratedStrategy {
  const take: StrategyRule[] = []
  const avoid: StrategyRule[] = []
  const observe: StrategyRule[] = []

  // From winning reasons
  analysis.winningReasons.slice(0, 8).forEach((r: ReasonRow) => {
    if (r.winRate >= 0.65) {
      take.push({
        type: 'TAKE',
        title: `ادخل عند ظهور ${r.label}`,
        description: `نسبة نجاحك على هذا السبب ${pct(r.winRate)} من ${r.trades} صفقة — هذا من أقوى أسبابك.`,
        winRate: r.winRate,
        sample: r.trades,
        confidence: confidenceFromSample(r.trades),
      })
    } else if (r.winRate >= 0.55) {
      observe.push({
        type: 'OBSERVE',
        title: `راقب ${r.label}`,
        description: `نسبة نجاحك ${pct(r.winRate)} من ${r.trades} صفقة — جيد لكن ليس قوياً بعد.`,
        winRate: r.winRate,
        sample: r.trades,
        confidence: confidenceFromSample(r.trades),
      })
    }
  })

  // From losing reasons
  analysis.losingReasons.slice(0, 8).forEach((r: ReasonRow) => {
    avoid.push({
      type: 'AVOID',
      title: `تجنّب الدخول بـ ${r.label}`,
      description: `خسرت ${pct(1 - r.winRate)} من ${r.trades} صفقة على هذا السبب — هذا سبب ضعيف لك.`,
      winRate: r.winRate,
      sample: r.trades,
      confidence: confidenceFromSample(r.trades),
    })
  })

  // From killzones
  analysis.killzonePerf.forEach((kz: BreakdownRow) => {
    if (kz.status === 'STRONG' && kz.trades >= 5) {
      take.push({
        type: 'TAKE',
        title: `ركّز على جلسة ${kz.label}`,
        description: `${pct(kz.winRate)} نجاح من ${kz.trades} صفقة، إجمالي ${kz.totalPnl.toFixed(0)} نقطة.`,
        winRate: kz.winRate,
        sample: kz.trades,
        confidence: confidenceFromSample(kz.trades),
      })
    } else if (kz.status === 'WEAK' && kz.trades >= 5) {
      avoid.push({
        type: 'AVOID',
        title: `ابتعد عن جلسة ${kz.label}`,
        description: `${pct(kz.winRate)} نجاح فقط من ${kz.trades} صفقة — الخسارة الصافية ${kz.totalPnl.toFixed(0)} نقطة.`,
        winRate: kz.winRate,
        sample: kz.trades,
        confidence: confidenceFromSample(kz.trades),
      })
    }
  })

  // From cycle phases
  analysis.cycleperf.forEach((c: BreakdownRow) => {
    if (c.status === 'STRONG' && c.trades >= 5) {
      take.push({
        type: 'TAKE',
        title: `الدخول في ${c.label}`,
        description: `${pct(c.winRate)} نجاح من ${c.trades} صفقة.`,
        winRate: c.winRate,
        sample: c.trades,
        confidence: confidenceFromSample(c.trades),
      })
    } else if (c.status === 'WEAK' && c.trades >= 5) {
      avoid.push({
        type: 'AVOID',
        title: `تجنّب ${c.label}`,
        description: `${pct(c.winRate)} فقط من ${c.trades} صفقة.`,
        winRate: c.winRate,
        sample: c.trades,
        confidence: confidenceFromSample(c.trades),
      })
    }
  })

  // From direction
  analysis.directionPerf.forEach((d: BreakdownRow) => {
    if (d.status === 'STRONG' && d.trades >= 8) {
      take.push({
        type: 'TAKE',
        title: `تميّزك في صفقات ${d.label}`,
        description: `${pct(d.winRate)} نجاح من ${d.trades} صفقة.`,
        winRate: d.winRate,
        sample: d.trades,
        confidence: confidenceFromSample(d.trades),
      })
    } else if (d.status === 'WEAK' && d.trades >= 8) {
      avoid.push({
        type: 'AVOID',
        title: `ضعفك في صفقات ${d.label}`,
        description: `${pct(d.winRate)} فقط من ${d.trades} صفقة — قلّل الحجم أو تجنّبها.`,
        winRate: d.winRate,
        sample: d.trades,
        confidence: confidenceFromSample(d.trades),
      })
    }
  })

  // Position sizing rules based on performance
  const positionSizing: string[] = []
  if (analysis.avgWin > 0 && analysis.avgLoss > 0) {
    const rr = analysis.avgWin / analysis.avgLoss
    positionSizing.push(
      `متوسط ربحك ${analysis.avgWin.toFixed(0)} نقطة، متوسط خسارتك ${analysis.avgLoss.toFixed(
        0
      )} نقطة — نسبة الربح/الخسارة = ${rr.toFixed(2)}:1`
    )
    if (rr < 1.5) {
      positionSizing.push(
        '⚠️ نسبة R:R أقل من 1.5 — احرص على أخذ أهداف أبعد قبل الخروج أو قلّص SL.'
      )
    } else if (rr >= 2) {
      positionSizing.push('✅ نسبة R:R ممتازة — حافظ على هذا الانضباط بالخروج.')
    }
  }
  positionSizing.push('قاعدة: لا تخاطر بأكثر من 1% من حسابك في الصفقة الواحدة.')
  positionSizing.push('قاعدة: بعد خسارتين متتاليتين، قلّل الحجم 50% أو توقّف لهذا اليوم.')

  // Session plan
  const sessionPlan: string[] = []
  const bestKillzone = analysis.killzonePerf
    .filter((k) => k.status === 'STRONG')
    .sort((a, b) => b.totalPnl - a.totalPnl)[0]
  if (bestKillzone) {
    sessionPlan.push(`ابدأ يومك بالتركيز على جلسة ${bestKillzone.label} — أفضل جلساتك.`)
  }
  const worstKillzone = analysis.killzonePerf
    .filter((k) => k.status === 'WEAK')
    .sort((a, b) => a.totalPnl - b.totalPnl)[0]
  if (worstKillzone) {
    sessionPlan.push(`⛔ لا تتداول في جلسة ${worstKillzone.label} حتى تحسّن أداءك فيها.`)
  }
  const bestDay = analysis.dayOfWeekPerf
    .filter((d) => d.status === 'STRONG')
    .sort((a, b) => b.totalPnl - a.totalPnl)[0]
  if (bestDay) {
    sessionPlan.push(`يوم ${bestDay.label} هو يومك الذهبي — كُن مستعدّاً.`)
  }
  const worstDay = analysis.dayOfWeekPerf
    .filter((d) => d.status === 'WEAK')
    .sort((a, b) => a.totalPnl - b.totalPnl)[0]
  if (worstDay) {
    sessionPlan.push(`⛔ يوم ${worstDay.label} تاريخياً يوم خسارتك — تداول بحذر أو لا تتداول.`)
  }
  if (sessionPlan.length === 0) {
    sessionPlan.push('سجّل عدداً أكبر من الصفقات لبناء خطة جلسات مخصصة لك.')
  }

  // Red flags (warnings)
  const redFlags: string[] = []
  if (analysis.streak.longestLossStreak >= 4) {
    redFlags.push(
      `سلسلة خسارتك الأطول وصلت ${analysis.streak.longestLossStreak} صفقات — ضع حد توقف يومي.`
    )
  }
  if (analysis.profitFactor < 1) {
    redFlags.push(
      `Profit Factor = ${analysis.profitFactor.toFixed(
        2
      )} أقل من 1 — خسارتك أكبر من ربحك. راجع استراتيجيتك قبل زيادة الحجم.`
    )
  }
  if (analysis.winRate < 0.4 && analysis.totalTrades >= 20) {
    redFlags.push(
      `نسبة نجاحك ${pct(analysis.winRate)} — مشكلة في اختيار الصفقات أو التوقيت.`
    )
  }
  if (analysis.best10Recent < 0.3 && analysis.totalTrades >= 15) {
    redFlags.push(
      `آخر 10 صفقات: ${pct(analysis.best10Recent)} نجاح — أنت في فترة جفاف، قلّل الحجم.`
    )
  }

  // Overview
  const overview =
    analysis.totalTrades === 0
      ? 'لم تسجّل صفقات بعد. ابدأ بتسجيل صفقاتك لتحصل على استراتيجية مبنية على بياناتك.'
      : `بناءً على ${analysis.totalTrades} صفقة مغلقة، حقّقت ${pct(
          analysis.winRate
        )} نجاح وإجمالي ${analysis.totalPnl.toFixed(0)} نقطة. ${
          take.length > 0
            ? `استراتيجيتك تعتمد على ${take.length} عامل قوي.`
            : 'لا توجد أنماط قوية كافية بعد.'
        }`

  return {
    overview,
    confidence: overallConfidence(analysis.totalTrades),
    totalTrades: analysis.totalTrades,
    rules: {
      take: take.slice(0, 10),
      avoid: avoid.slice(0, 10),
      observe: observe.slice(0, 6),
    },
    positionSizing,
    sessionPlan,
    redFlags,
  }
}
