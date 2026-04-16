'use client'

import { useState, useEffect } from 'react'

const CHECKLIST_ITEMS = [
  // ما قبل الجلسة
  { id: 'bias_done',     text: 'راجعتُ التحيز اليومي والـ 6H و 4H', category: 'قبل', stop: false },
  { id: 'to_marked',     text: 'حددتُ True Opens على الشارت', category: 'قبل', stop: false },
  { id: 'killzone',      text: 'الجلسة الحالية: لندن أو NY AM فقط', category: 'قبل', stop: false },
  { id: 'news_check',    text: 'تحققتُ من الأخبار الاقتصادية (FOMC / NFP)', category: 'قبل', stop: false },
  { id: 'sl_ready',      text: 'وضعتُ مستوى Stop Loss الأقصى لليوم', category: 'قبل', stop: false },
  // شروط الدخول
  { id: 'smt_confirm',   text: 'يوجد Double SMT مؤكد على الإطار الزمني', category: 'دخول', stop: false },
  { id: 'psp_seen',      text: 'رأيتُ PSP واضح (15M أو 5M)', category: 'دخول', stop: false },
  { id: 'to_align',      text: 'True Opens تدعم الاتجاه', category: 'دخول', stop: false },
  { id: 'rr_ok',         text: 'نسبة المخاطرة/العائد ≥ 2:1', category: 'دخول', stop: false },
  // شروط الإيقاف (Stop)
  { id: 'no_3trades',    text: 'لم أتجاوز 3 صفقات اليوم', category: 'حدود', stop: true },
  { id: 'no_2losses',    text: 'لم أسجّل خسارتين متتاليتين', category: 'حدود', stop: true },
  { id: 'no_daily_loss', text: 'لم أتجاوز حد الخسارة اليومية', category: 'حدود', stop: true },
  { id: 'no_revenge',    text: 'لا أدخل بعد خسارة من Revenge Trading', category: 'حدود', stop: true },
  // نهاية الجلسة
  { id: 'journal_done',  text: 'سجّلتُ الصفقة في اليومية كاملة', category: 'نهاية', stop: false },
  { id: 'screenshot_ok', text: 'أخذتُ لقطات الشاشة (Daily، 15M، 5M)', category: 'نهاية', stop: false },
  { id: 'review_done',   text: 'راجعتُ الأداء وكتبتُ ملاحظاتي', category: 'نهاية', stop: false },
]

const OATH = `أنا متداول مُنضبط.
لا أدخل إلا بتأكيد، ولا أخرج إلا بخطة.
الخسارة جزء من اللعبة، والانضباط سلاحي.
سأحترم القواعد اليوم — مهما كانت النتيجة.`

const TODAY = () => new Date().toISOString().slice(0, 10)
const STORAGE_KEY = () => `jk_checklist_${TODAY()}`

export function DailyChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY())
      if (raw) setChecked(JSON.parse(raw))
      // Clean old keys
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('jk_checklist_') && k !== STORAGE_KEY()) {
          localStorage.removeItem(k)
        }
      })
    } catch {}
    setMounted(true)
  }, [])

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    try { localStorage.setItem(STORAGE_KEY(), JSON.stringify(next)) } catch {}
  }

  function reset() {
    setChecked({})
    try { localStorage.removeItem(STORAGE_KEY()) } catch {}
  }

  const total = CHECKLIST_ITEMS.length
  const done = Object.values(checked).filter(Boolean).length
  const pct = Math.round((done / total) * 100)
  const allDone = done === total

  const categories = ['قبل', 'دخول', 'حدود', 'نهاية']
  const catLabels: Record<string, string> = {
    'قبل': 'ما قبل الجلسة',
    'دخول': 'شروط الدخول',
    'حدود': 'حدود الإيقاف',
    'نهاية': 'نهاية الجلسة',
  }

  return (
    <div className="space-y-0">
      {/* Oath card */}
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#162035] p-5 mt-4 mb-1">
        <div
          className="absolute top-0 right-3 text-[90px] leading-none font-serif text-[#D4AF37] select-none pointer-events-none"
          style={{ opacity: 0.06 }}
        >
          &ldquo;
        </div>
        <p className="text-[#8899BB] text-[13px] leading-8 italic whitespace-pre-line relative z-10">
          {OATH}
        </p>
        <p className="text-[#D4AF37] text-xs font-bold mt-3 relative z-10">— عهد المتداول المنضبط</p>
      </div>

      {/* Progress */}
      <div className="card-dark p-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#D4AF37] text-xs font-bold tracking-wide">تقدم اليوم</span>
          <span className="text-[#8899BB] text-xs">{done}/{total} — {pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {allDone && (
          <div className="mt-3 text-center bg-[rgba(29,185,84,0.1)] border border-[rgba(29,185,84,0.3)] rounded-xl py-2.5 text-[#1DB954] text-sm font-bold">
            ✓ أكملتَ الشيكلست — الآن تداول بثقة
          </div>
        )}
      </div>

      {/* Items by category */}
      {categories.map(cat => (
        <div key={cat} className="mt-1">
          <div className="sec-title">{catLabels[cat]}</div>
          {CHECKLIST_ITEMS.filter(item => item.category === cat).map(item => {
            const isDone = !!checked[item.id]
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={[
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border mb-1.5 text-right transition-all active:scale-[0.98]',
                  isDone
                    ? 'bg-[rgba(29,185,84,0.08)] border-[rgba(29,185,84,0.3)]'
                    : item.stop
                    ? 'bg-[#162035] border-[rgba(231,76,60,0.25)]'
                    : 'bg-[#162035] border-[rgba(212,175,55,0.12)]',
                ].join(' ')}
              >
                {/* Checkbox */}
                <div className={[
                  'w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  isDone ? 'bg-[#1DB954] border-[#1DB954]' : 'border-[#4A5A7A]',
                ].join(' ')}>
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#080C14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Text */}
                <span className={[
                  'flex-1 text-[13px] text-right leading-snug transition-all',
                  isDone ? 'text-[#1DB954] line-through opacity-70' : 'text-[#C8D8EE]',
                ].join(' ')}>
                  {item.text}
                </span>

                {/* Tag */}
                {item.stop && (
                  <span className={[
                    'text-[10px] px-2 py-0.5 rounded-lg border flex-shrink-0',
                    isDone
                      ? 'bg-[rgba(29,185,84,0.12)] text-[#1DB954] border-[rgba(29,185,84,0.3)]'
                      : 'bg-[rgba(231,76,60,0.1)] text-[#E74C3C] border-[rgba(231,76,60,0.3)]',
                  ].join(' ')}>
                    حد
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}

      {/* Reset */}
      {mounted && done > 0 && (
        <button
          onClick={reset}
          className="w-full mt-2 py-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-transparent text-[#4A5A7A] text-sm hover:text-[#8899BB] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
        >
          إعادة تعيين الشيكلست
        </button>
      )}

      <p className="text-center text-[10px] text-[#2A3A5A] mt-4 pb-2">
        © 2026 <span className="text-[#D4AF37]">JK Trading</span> — جميع الحقوق محفوظة
      </p>
    </div>
  )
}
