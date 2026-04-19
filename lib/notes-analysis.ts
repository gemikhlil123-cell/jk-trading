/**
 * Arabic notes analysis — keyword extraction + emotional sentiment detection.
 * Runs server-side on the user's trade notes.
 */

import { prisma } from './prisma'

// Emotional / behavioural sentiment buckets — Arabic keywords and synonyms
const SENTIMENT_BUCKETS: Record<
  string,
  { label: string; keywords: string[]; tone: 'negative' | 'positive' | 'neutral' }
> = {
  FOMO: {
    label: 'FOMO',
    keywords: ['fomo', 'خوف من الفوت', 'فرصه فاتت', 'فرصة فاتت', 'تاخرت', 'دخلت متأخر', 'دخلت متاخر'],
    tone: 'negative',
  },
  REVENGE: {
    label: 'الانتقام',
    keywords: ['انتقام', 'انتقامي', 'لتعويض', 'تعويض الخساره', 'تعويض الخسارة', 'ردة فعل', 'بغضب', 'بعصبيه'],
    tone: 'negative',
  },
  FEAR: {
    label: 'الخوف',
    keywords: ['خوف', 'خايف', 'قلق', 'قلقان', 'متوتر', 'تردد', 'ترددت', 'ما قدرت', 'خفت'],
    tone: 'negative',
  },
  GREED: {
    label: 'الطمع',
    keywords: ['طمع', 'طامع', 'طمعت', 'ما اخذت الربح', 'ما قفلت', 'تركتها اكتر', 'رجعت خساره', 'رجعت خسارة'],
    tone: 'negative',
  },
  OVERTRADING: {
    label: 'الإفراط بالتداول',
    keywords: ['صفقات كثير', 'كثرت', 'دخلت كثير', 'زياده', 'فوق الحد', 'اكتر من اللازم', 'تداول زايد'],
    tone: 'negative',
  },
  IMPATIENCE: {
    label: 'قلة الصبر',
    keywords: ['ما صبرت', 'استعجلت', 'بسرعه', 'بدون ما استنى', 'ما انتظرت', 'تسرع', 'قفلت بدري'],
    tone: 'negative',
  },
  CONFIRMATION: {
    label: 'التأكيد',
    keywords: ['تاكيد', 'تأكيد', 'تاكد', 'تأكد', 'واضح', 'نظيف', 'setup نظيف', 'PSP', 'smt', 'cisd', 'ifvg', 'fvg'],
    tone: 'positive',
  },
  DISCIPLINE: {
    label: 'الانضباط',
    keywords: ['التزمت', 'انضبطت', 'خطتي', 'خطه', 'خطة', 'قاعدتي', 'ما كسرت', 'سيستم'],
    tone: 'positive',
  },
  PATIENCE: {
    label: 'الصبر',
    keywords: ['صبرت', 'انتظرت', 'استنيت', 'هدوء', 'هادي', 'هادئ', 'ما استعجلت'],
    tone: 'positive',
  },
  CONFIDENCE: {
    label: 'الثقة',
    keywords: ['واثق', 'ثقه', 'ثقة', 'مرتاح', 'مركز', 'مركّز', 'وضوح'],
    tone: 'positive',
  },
}

const STOP_WORDS = new Set([
  'من', 'في', 'على', 'الى', 'إلى', 'عن', 'مع', 'بعد', 'قبل', 'عند', 'ان', 'أن', 'إن',
  'هذا', 'هذه', 'ذلك', 'تلك', 'هو', 'هي', 'انا', 'أنا', 'نحن', 'انت', 'أنت', 'هم', 'كان',
  'كانت', 'يكون', 'ما', 'ماذا', 'لا', 'لم', 'لن', 'ليس', 'او', 'أو', 'و', 'ف', 'ثم',
  'قد', 'كل', 'جدا', 'ايضا', 'أيضا', 'لكن', 'لكنه', 'لكنها', 'بس', 'يعني', 'مش', 'شي',
  'الصفقه', 'الصفقة', 'صفقه', 'صفقة', 'دخول', 'خروج', 'الى', 'السعر', 'السوق', 'ستوب',
  'هدف', 'اخر', 'آخر', 'بدون', 'اني', 'إني', 'عشان', 'علشان', 'حتى', 'اذا', 'إذا',
  '__meta',
])

function cleanNotes(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/__meta:.*$/s, '').trim()
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
}

export interface SentimentHit {
  key: string
  label: string
  tone: 'negative' | 'positive' | 'neutral'
  count: number
}

export function detectSentimentsInText(raw: string): SentimentHit[] {
  const norm = normalize(cleanNotes(raw))
  if (!norm) return []
  const hits: SentimentHit[] = []
  for (const [key, bucket] of Object.entries(SENTIMENT_BUCKETS)) {
    let count = 0
    for (const kw of bucket.keywords) {
      const kwNorm = normalize(kw)
      if (!kwNorm) continue
      const parts = norm.split(kwNorm)
      count += parts.length - 1
    }
    if (count > 0) hits.push({ key, label: bucket.label, tone: bucket.tone, count })
  }
  return hits.sort((a, b) => b.count - a.count)
}

export interface NotesAnalysis {
  totalNotes: number
  totalWords: number
  winKeywords: { word: string; count: number }[]
  lossKeywords: { word: string; count: number }[]
  sentimentInWins: SentimentHit[]
  sentimentInLosses: SentimentHit[]
  dominantNegative: SentimentHit | null
  dominantPositive: SentimentHit | null
}

export async function analyzeUserNotes(userId: string): Promise<NotesAnalysis> {
  const trades = await prisma.trade.findMany({
    where: { userId, isBacktest: false, notes: { not: null } },
    select: { notes: true, pnl: true },
    take: 500,
    orderBy: { entryTime: 'desc' },
  })

  const winTokens = new Map<string, number>()
  const lossTokens = new Map<string, number>()
  const winSentiment = new Map<string, SentimentHit>()
  const lossSentiment = new Map<string, SentimentHit>()
  let totalWords = 0
  let notesCount = 0

  for (const t of trades) {
    const cleaned = cleanNotes(t.notes)
    if (!cleaned) continue
    notesCount++
    const pnl = t.pnl !== null ? Number(t.pnl) : null
    const isWin = pnl !== null && pnl > 0
    const isLoss = pnl !== null && pnl <= 0

    const tokens = tokenize(cleaned)
    totalWords += tokens.length
    const bucket = isWin ? winTokens : isLoss ? lossTokens : null
    if (bucket) {
      for (const tk of tokens) {
        bucket.set(tk, (bucket.get(tk) ?? 0) + 1)
      }
    }

    const hits = detectSentimentsInText(cleaned)
    const sentBucket = isWin ? winSentiment : isLoss ? lossSentiment : null
    if (sentBucket) {
      for (const h of hits) {
        const prev = sentBucket.get(h.key)
        sentBucket.set(h.key, prev ? { ...prev, count: prev.count + h.count } : h)
      }
    }
  }

  const toArr = (m: Map<string, number>, n = 8) =>
    Array.from(m.entries())
      .map(([word, count]) => ({ word, count }))
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, n)

  const sentToArr = (m: Map<string, SentimentHit>) =>
    Array.from(m.values()).sort((a, b) => b.count - a.count)

  const lossArr = sentToArr(lossSentiment)
  const winArr = sentToArr(winSentiment)

  return {
    totalNotes: notesCount,
    totalWords,
    winKeywords: toArr(winTokens),
    lossKeywords: toArr(lossTokens),
    sentimentInWins: winArr,
    sentimentInLosses: lossArr,
    dominantNegative: lossArr.find((s) => s.tone === 'negative') ?? null,
    dominantPositive: winArr.find((s) => s.tone === 'positive') ?? null,
  }
}

export interface NotesTip {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO'
  title: string
  body: string
}

/**
 * Dynamic tips built from notes patterns.
 */
export function generateNotesTips(a: NotesAnalysis): NotesTip[] {
  const tips: NotesTip[] = []

  if (a.totalNotes < 3) {
    tips.push({
      id: 'notes-few',
      severity: 'INFO',
      title: 'ابدأ بكتابة ملاحظات تفصيلية',
      body: 'ملاحظاتك قليلة حالياً. اكتب بعد كل صفقة: لماذا دخلت؟ كيف كانت حالتك النفسية؟ ماذا رأيت؟ كلما كتبت أكثر، كلما اكتشفنا أنماط أدائك.',
    })
    return tips
  }

  if (a.dominantNegative && a.dominantNegative.count >= 3) {
    const n = a.dominantNegative
    const tipMap: Record<string, { title: string; body: string }> = {
      FOMO: {
        title: '🚨 FOMO هو نمطك المتكرر في الخسائر',
        body: `ظهر FOMO في ${n.count} من ملاحظاتك الخاسرة. القاعدة: إذا فاتتك الحركة، اتركها وابحث عن setup جديد. أضف قاعدة صارمة: لا دخول بعد 15 دقيقة من بداية الحركة.`,
      },
      REVENGE: {
        title: '⛔ تداول الانتقام يدمّر حسابك',
        body: `ظهر الانتقام في ${n.count} ملاحظات خاسرة. بعد أي خسارة، قم من المكتب 30 دقيقة. قاعدة: 2 خسائر متتالية = توقف لليوم.`,
      },
      FEAR: {
        title: '😰 الخوف يسبّب خسائرك',
        body: `كلمة "خوف" أو "تردد" ظهرت ${n.count} مرات في ملاحظات خاسرة. قلّل حجم الصفقة 50% حتى تستعيد ثقتك. الثقة تبنى بصفقات صغيرة رابحة متتالية.`,
      },
      GREED: {
        title: '🤑 الطمع يأكل أرباحك',
        body: `ظهر الطمع في ${n.count} ملاحظات خاسرة. ضع Target قبل الدخول، ولا تحرّكه أبداً ضد نفسك. التزم بخروج جزئي عند RR 1.5.`,
      },
      OVERTRADING: {
        title: '📉 أنت تتداول أكثر من اللازم',
        body: `ذُكر الإفراط في ${n.count} ملاحظات خاسرة. ضع حد يومي: ${Math.max(2, Math.floor(a.totalNotes / 10))} صفقات كحد أقصى. جودة > كمية.`,
      },
      IMPATIENCE: {
        title: '⏳ قلة الصبر = خسائر',
        body: `ظهرت قلة الصبر في ${n.count} ملاحظات خاسرة. قبل أي دخول، انتظر 5 دقائق. إذا كانت الفرصة حقيقية، ستبقى هناك.`,
      },
    }
    const m = tipMap[n.key]
    if (m) {
      tips.push({
        id: `notes-neg-${n.key}`,
        severity: 'CRITICAL',
        ...m,
      })
    }
  }

  if (a.dominantPositive && a.dominantPositive.count >= 3) {
    const p = a.dominantPositive
    const tipMap: Record<string, { title: string; body: string }> = {
      CONFIRMATION: {
        title: '✨ "التأكيد" سلاحك الرابح',
        body: `ذكرت التأكيدات/الـsetups في ${p.count} صفقات رابحة. هذا نمطك الذهبي — لا تدخل بدون تأكيد واضح متعدد الإطارات.`,
      },
      DISCIPLINE: {
        title: '💎 الانضباط يربحك',
        body: `"التزمت بخطتي" ظهرت ${p.count} مرات في صفقاتك الرابحة. أكمل على نفس النهج — اكتب خطتك قبل كل جلسة والتزم بها.`,
      },
      PATIENCE: {
        title: '🎯 الصبر = ربح',
        body: `"صبرت/انتظرت" ظهرت ${p.count} مرات في صفقاتك الرابحة. الصبر هو أهم ميزة في سلوكك — حافظ عليها.`,
      },
      CONFIDENCE: {
        title: '🔥 الثقة تربحك',
        body: `كلمات الثقة ظهرت ${p.count} مرات في صفقاتك الرابحة. أنت تتخذ قراراتك بثقة عندما تكون الإعدادات واضحة — لا تدخل بدون هذا الشعور.`,
      },
    }
    const m = tipMap[p.key]
    if (m) {
      tips.push({
        id: `notes-pos-${p.key}`,
        severity: 'SUCCESS',
        ...m,
      })
    }
  }

  // Keyword-level tip — most frequent word in losses that doesn't appear much in wins
  if (a.lossKeywords.length > 0) {
    const top = a.lossKeywords[0]
    const inWins = a.winKeywords.find((w) => w.word === top.word)?.count ?? 0
    if (top.count >= 3 && top.count > inWins * 2) {
      tips.push({
        id: `notes-loss-kw-${top.word}`,
        severity: 'WARNING',
        title: `كلمة "${top.word}" تظهر كثيراً في خسائرك`,
        body: `"${top.word}" تكرّرت ${top.count} مرات في ملاحظات خسائرك. راجع هذه الصفقات — هل هناك نمط مشترك؟`,
      })
    }
  }

  if (a.winKeywords.length > 0) {
    const top = a.winKeywords[0]
    const inLosses = a.lossKeywords.find((w) => w.word === top.word)?.count ?? 0
    if (top.count >= 3 && top.count > inLosses * 2) {
      tips.push({
        id: `notes-win-kw-${top.word}`,
        severity: 'SUCCESS',
        title: `"${top.word}" موجودة في صفقاتك الرابحة`,
        body: `"${top.word}" تكرّرت ${top.count} مرات في ملاحظات صفقاتك الرابحة. هذا مؤشر على إعداد ناجح — ركّز عليه.`,
      })
    }
  }

  return tips
}
