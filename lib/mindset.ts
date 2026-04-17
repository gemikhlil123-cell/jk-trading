import { DeepAnalysis } from './deep-analysis'

export interface MindsetTip {
  id: string
  category: 'RISK' | 'PSYCHOLOGY' | 'DISCIPLINE' | 'RECOVERY'
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
  title: string
  body: string
  source: 'STATIC' | 'DYNAMIC'
}

const STATIC_RULES: MindsetTip[] = [
  {
    id: 'risk-1',
    category: 'RISK',
    severity: 'INFO',
    title: 'قاعدة الـ 1%',
    body: 'لا تخاطر بأكثر من 1% من رأس مالك في الصفقة الواحدة. حتى لو خسرت 10 صفقات متتالية، تبقى معك 90% من حسابك.',
    source: 'STATIC',
  },
  {
    id: 'risk-2',
    category: 'RISK',
    severity: 'INFO',
    title: 'ضع SL قبل الدخول',
    body: 'حدّد نقطة وقف الخسارة قبل الضغط على زر الشراء/البيع. إذا لم تستطع تحديد SL، لا تدخل الصفقة.',
    source: 'STATIC',
  },
  {
    id: 'risk-3',
    category: 'RISK',
    severity: 'INFO',
    title: 'لا تحرّك SL',
    body: 'قاعدة ذهبية: لا تحرّك وقف الخسارة ضد اتجاهك أبداً. يمكنك فقط تقريبه لصالحك (تأمين الربح).',
    source: 'STATIC',
  },
  {
    id: 'psych-1',
    category: 'PSYCHOLOGY',
    severity: 'INFO',
    title: 'لا تنتقم من السوق',
    body: 'الانتقام من خسارة بصفقة كبيرة هو أسرع طريق لتفجير الحساب. إذا خسرت، تنفّس، قم من المكتب، ولا تدخل لمدة 30 دقيقة على الأقل.',
    source: 'STATIC',
  },
  {
    id: 'psych-2',
    category: 'PSYCHOLOGY',
    severity: 'INFO',
    title: 'السوق لا ينتظرك',
    body: 'ستأتي فرصة أفضل خلال ساعة. لا تجبر الدخول لأنك خائف من "فوت الفرصة".',
    source: 'STATIC',
  },
  {
    id: 'disc-1',
    category: 'DISCIPLINE',
    severity: 'INFO',
    title: 'حد أقصى للصفقات يومياً',
    body: 'ضع حد أقصى 3 صفقات في اليوم. الإفراط في التداول (overtrading) يقتل الربحية.',
    source: 'STATIC',
  },
  {
    id: 'disc-2',
    category: 'DISCIPLINE',
    severity: 'INFO',
    title: 'قاعدة خسارتين متتاليتين',
    body: 'بعد خسارتين متتاليتين في نفس اليوم: توقّف، راجع الصفقات، ولا تدخل إلا إذا فهمت سبب الخسارة.',
    source: 'STATIC',
  },
  {
    id: 'disc-3',
    category: 'DISCIPLINE',
    severity: 'INFO',
    title: 'سجّل كل صفقة',
    body: 'الصفقة التي لم تُسجَّل لم تحدث. سجّل السبب، الصورة، الشعور، والدرس — وإلا لن تتطور.',
    source: 'STATIC',
  },
  {
    id: 'recov-1',
    category: 'RECOVERY',
    severity: 'INFO',
    title: 'الخروج بعد صفقة رابحة',
    body: 'إذا حقّقت هدفك اليومي — اخرج. كثير من المتداولين يحقّقون أرباحاً ثم يعيدونها في اليوم نفسه.',
    source: 'STATIC',
  },
]

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

export function generateMindsetTips(analysis: DeepAnalysis): MindsetTip[] {
  const dynamic: MindsetTip[] = []

  // Streak warnings
  if (analysis.streak.currentStreakType === 'LOSS' && analysis.streak.currentStreak >= 2) {
    dynamic.push({
      id: 'dyn-streak-loss',
      category: 'RECOVERY',
      severity: 'CRITICAL',
      title: `⛔ ${analysis.streak.currentStreak} خسائر متتالية`,
      body: 'أنت حالياً في سلسلة خسارة. توقّف الآن، قم من المكتب، ولا تعد قبل 30 دقيقة. قلّل الحجم في صفقتك القادمة 50%.',
      source: 'DYNAMIC',
    })
  }

  if (analysis.streak.currentStreakType === 'WIN' && analysis.streak.currentStreak >= 3) {
    dynamic.push({
      id: 'dyn-streak-win',
      category: 'PSYCHOLOGY',
      severity: 'WARNING',
      title: `⚠️ ${analysis.streak.currentStreak} صفقات رابحة متتالية`,
      body: 'الثقة الزائدة أخطر من الخوف. لا ترفع الحجم فجأة، التزم بخطتك. كثير من المتداولين يخسرون كل أرباحهم بعد سلسلة مكاسب.',
      source: 'DYNAMIC',
    })
  }

  // Longest loss streak warning
  if (analysis.streak.longestLossStreak >= 4) {
    dynamic.push({
      id: 'dyn-longest-loss',
      category: 'RISK',
      severity: 'WARNING',
      title: 'أطول سلسلة خسارة لك',
      body: `أطول سلسلة خسارة تاريخياً لديك ${analysis.streak.longestLossStreak} صفقات. ضع حد توقف يومي = 3 خسائر، بعدها أغلق المنصة.`,
      source: 'DYNAMIC',
    })
  }

  // Profit factor warning
  if (analysis.profitFactor < 1 && analysis.totalTrades >= 15) {
    dynamic.push({
      id: 'dyn-pf-low',
      category: 'RISK',
      severity: 'CRITICAL',
      title: 'Profit Factor أقل من 1',
      body: `Profit Factor = ${analysis.profitFactor.toFixed(
        2
      )} يعني خسارتك أكبر من ربحك. لا ترفع الحجم. راجع أسباب الخسارة في التحليل وعدّل استراتيجيتك.`,
      source: 'DYNAMIC',
    })
  } else if (analysis.profitFactor >= 2 && analysis.totalTrades >= 20) {
    dynamic.push({
      id: 'dyn-pf-high',
      category: 'RISK',
      severity: 'SUCCESS',
      title: `Profit Factor ممتاز (${analysis.profitFactor.toFixed(2)})`,
      body: 'استراتيجيتك رابحة بشكل منهجي. حافظ على الانضباط ولا تغيّر ما يعمل.',
      source: 'DYNAMIC',
    })
  }

  // Win rate patterns
  if (analysis.winRate < 0.4 && analysis.totalTrades >= 20) {
    dynamic.push({
      id: 'dyn-wr-low',
      category: 'DISCIPLINE',
      severity: 'WARNING',
      title: `نسبة نجاحك ${pct(analysis.winRate)}`,
      body: 'نسبة نجاح منخفضة قد تعمل إذا كانت R:R عالية (3:1+). إذا لم يكن كذلك، المشكلة في اختيار الصفقات. ركّز على أسبابك الرابحة فقط.',
      source: 'DYNAMIC',
    })
  }

  // Recent trend
  if (analysis.best10Recent < 0.3 && analysis.totalTrades >= 10) {
    dynamic.push({
      id: 'dyn-recent-dry',
      category: 'RECOVERY',
      severity: 'WARNING',
      title: 'فترة جفاف حالية',
      body: `آخر 10 صفقات: ${pct(
        analysis.best10Recent
      )} نجاح فقط. قلّل الحجم 50%، راجع أسبابك الرابحة، وابتعد عن الأسباب الخاسرة.`,
      source: 'DYNAMIC',
    })
  } else if (analysis.best10Recent >= 0.7 && analysis.totalTrades >= 10) {
    dynamic.push({
      id: 'dyn-recent-hot',
      category: 'PSYCHOLOGY',
      severity: 'SUCCESS',
      title: 'أنت في حالة ممتازة',
      body: `آخر 10 صفقات: ${pct(
        analysis.best10Recent
      )} نجاح. حافظ على نفس الحجم، لا ترفعه — الثقة المفرطة قاتلة.`,
      source: 'DYNAMIC',
    })
  }

  // Worst day warning
  const worstDay = analysis.dayOfWeekPerf
    .filter((d) => d.status === 'WEAK' && d.trades >= 5)
    .sort((a, b) => a.totalPnl - b.totalPnl)[0]
  if (worstDay) {
    dynamic.push({
      id: 'dyn-bad-day',
      category: 'DISCIPLINE',
      severity: 'WARNING',
      title: `يوم ${worstDay.label} يومك الصعب`,
      body: `${pct(worstDay.winRate)} نجاح فقط من ${worstDay.trades} صفقة يوم ${
        worstDay.label
      }. تداول بحذر شديد هذا اليوم أو اعتبره يوم راحة.`,
      source: 'DYNAMIC',
    })
  }

  // Worst killzone warning
  const worstKz = analysis.killzonePerf
    .filter((k) => k.status === 'WEAK' && k.trades >= 5)
    .sort((a, b) => a.totalPnl - b.totalPnl)[0]
  if (worstKz) {
    dynamic.push({
      id: 'dyn-bad-kz',
      category: 'DISCIPLINE',
      severity: 'WARNING',
      title: `جلسة ${worstKz.label} ضعيفة لك`,
      body: `خسرت ${Math.abs(worstKz.totalPnl).toFixed(0)} نقطة في ${
        worstKz.trades
      } صفقة في هذه الجلسة. تجنّبها أو قلّص الحجم فيها.`,
      source: 'DYNAMIC',
    })
  }

  // Expectancy
  if (analysis.totalTrades >= 20 && analysis.expectancy < 0) {
    dynamic.push({
      id: 'dyn-exp-neg',
      category: 'RISK',
      severity: 'CRITICAL',
      title: 'التوقع الإحصائي سلبي',
      body: `كل صفقة تفتحها ستخسر ${Math.abs(analysis.expectancy).toFixed(
        0
      )} نقطة في المتوسط. توقّف عن التداول الحقيقي، ارجع للباك تست حتى يصبح التوقع إيجابياً.`,
      source: 'DYNAMIC',
    })
  }

  // Direction weakness
  const weakDir = analysis.directionPerf.find((d) => d.status === 'WEAK' && d.trades >= 10)
  if (weakDir) {
    dynamic.push({
      id: 'dyn-weak-dir',
      category: 'DISCIPLINE',
      severity: 'INFO',
      title: `ضعف في صفقات ${weakDir.label}`,
      body: `${pct(weakDir.winRate)} نجاح من ${weakDir.trades} صفقة ${
        weakDir.label
      }. ركّز على الاتجاه الآخر أو قلّل حجم هذه الصفقات.`,
      source: 'DYNAMIC',
    })
  }

  return [...dynamic, ...STATIC_RULES]
}

export function getChecklistFor(analysis: DeepAnalysis): string[] {
  const checklist: string[] = [
    '✅ حدّدت وقف الخسارة (SL) قبل الدخول',
    '✅ حدّدت هدف الربح (TP) قبل الدخول',
    '✅ المخاطرة لا تتجاوز 1% من الحساب',
  ]

  const bestReason = analysis.winningReasons[0]
  if (bestReason) {
    checklist.push(`✅ السبب الحالي من أسبابي الرابحة (مثل ${bestReason.label})`)
  }

  const bestKz = analysis.killzonePerf
    .filter((k) => k.status === 'STRONG' && k.trades >= 5)
    .sort((a, b) => b.totalPnl - a.totalPnl)[0]
  if (bestKz) {
    checklist.push(`✅ أتداول في جلسة ${bestKz.label} (جلستي الأقوى)`)
  }

  checklist.push(
    '✅ لست في حالة غضب/انتقام',
    '✅ نمت ساعات كافية',
    '✅ لم أتجاوز الحد الأقصى اليومي للصفقات',
  )

  return checklist
}
