# JK Trading Journal — מפת דרכים לרווחיות (Profitability Roadmap)

> מטרה: להפוך את JK Trading Journal ליומן מסחר ברמה של TradeZella / Edgewonk / Tradervue —
> אבל מותאם לקהל ה‑ICT/Quarterly‑Theory הערבי ולמודל המנטור של JK.
> כל הפיצ'רים פתוחים לכל התלמידים (ללא נעילת שכבות). בנייה phased.
> נכתב: 2026‑07 · מבוסס על benchmark מול המובילים ב‑2026 + פרויקטי open‑source (Deltalytix, TradeNote).

---

## עקרונות מנחים
1. **רווחיות = הרגל + אמת.** כל פיצ'ר חייב לענות על "איך זה עוזר לסוחר להיות רווחי", לא רק לתעד.
2. **דטרמיניסטי לפני AI.** מנועי חוקים (כמו ה‑Coach) לפני קריאות AI יקרות. AI רק איפה שהוא באמת מוסיף (מיפוי ייבוא).
3. **מנטור‑first.** כל מודול צריך גם תצוגת תלמיד וגם תצוגת מנטור.
4. **RTL ערבית, פלטת שחור/זהב, Cairo.** בלי שינוי מותג.
5. **תואם ל‑stack:** Next.js 14 App Router, Prisma 7 + Supabase, `prisma db push`, Netlify.

---

## מצב קיים (בסיס חזק — לא לבנות מחדש)
- **קלט:** ידני, Tradovate sync, CSV import, backtest sessions, chart images.
- **אנליטיקה:** dashboard, deep-analysis, advanced-stats (session/day/symbol), equity curve, weekly-review.
- **פסיכולوגיה:** mindset, daily journal, emotionalState, selfRating.
- **תכנון:** plan (rules/risk), checklist, goals, prep hub, bias, strategy.
- **חינוך:** jk-trading hub + קורס Quarterly Theory (חלק 1).
- **מנטور:** student review, comments, live/backtest toggle.
- **AI:** claude/gemini notes analysis (ai-provider).
- **המדرّب (Coach):** מנוע חוקים דטרמיניסטי — בנוי, ממתין ל‑deploy.

---

## פערים מול המובילים (2026) → מודולים חדשים
| מודול | מה נותן | סטטוס |
|-------|---------|-------|
| Playbook סטאפים | סטאפ = חוקים + סטטיסטיקה חיה + דוגמאות | חדש |
| מרכז Prop Firm | יעד רווח / max daily loss / trailing DD + התראות | חדש |
| מטריקות מתקדמות + דוחות | Expectancy, R‑dist, MAE/MFE, drawdown, exit‑efficiency | חלקי → הרחבה |
| מחשבון סיכון/גודל פוזיציה | חוזים לפי stop + risk% | חדש |
| ייבוא "כל ברוקר" ב‑AI | AI ממפה כל CSV | חדש |
| דוחות PDF/Excel + שיתוף | דוח חודשי תלמיד↔מנטור | חדש |
| Trade Replay (מוקטן) | סקירת צ'ארטים ממוסגרת | חדש |
| Tags + מעקב טעויות | תיוג גמיש + טעויות חוזרות | חלקי → הרחבה |

---

## PHASE 0 — לסגור את הפתוח (מהיר, low‑risk)
**0.1 Deploy ה‑Coach** — הקוד בנוי (`lib/coach.ts`, `components/coach/coach-report.tsx`, `/coach`, אינטגרציית מנטור, קישור prep). צריך רק build+deploy תקין (תלוי בדיסק המקומי).

**0.2 מחשבון סיכון וגודל פוזיציה** — `components/tools/risk-calculator.tsx` (client) + עמוד `/tools` (או כרטיס ב‑prep).
- קלט: גודל חשבון, risk% (או $ סיכון), מחיר כניסה, stop, יעד.
- פלט: מס' חוזים, $ סיכון, R ליעד, ערך לכל point/tick.
- presets לאדוات: NQ ($20/pt), MNQ ($2), ES ($50), MES ($5), GC ($100), CL ($1000), וכו'.

---

## PHASE 1 — מנוע האמת (מטריקות + דוחות)
**1.1 `lib/metrics.ts`** — פונקציות דטרמיניסטיות:
- Expectancy per trade, R‑multiple distribution (buckets), profit factor, avg win/loss.
- Drawdown curve (peak‑to‑trough) + max drawdown, recovery.
- Exit efficiency (יציאה בפועל מול יעד מתוכנן), hold‑time analysis.
- Commission impact, best/worst hour·session·day·symbol (reuse advanced-stats).
- MAE/MFE — דורש שדות אופציונליים (ראה שינויי DB).

**1.2 עמוד `/reports`** — מרכז דוחות מאורגן (~12–15 דוחות אצורים, לא 50 עמוסים). RTL, recharts.

**שינויי DB (Prisma, `prisma db push`):**
```
Trade  += maeTicks Int?  mfeTicks Int?  commission Decimal?(10,2)  plannedTarget Decimal?(12,5)
```
(כולם אופציונליים — לא שוברים נתונים קיימים.)

---

## PHASE 2 — המערכת (Playbook + Prop Firm)
**2.1 Playbook סטאפים**
- Prisma: `Setup { id, userId, name, description, rules @db.Text(JSON), checklist @db.Text(JSON), isActive, createdAt }`.
- קישור: `Trade.setupId String?` (או להישען על entryReasons).
- עמוד `/playbook`: רשימת סטאפים; לכל סטאפ סטטיסטיקה חיה מחושבת מהעסקאות המקושרות (winrate, expectancy, best session) + דוגמאות (chart images) + חוקים.
- מתחבר ל‑Coach: "הקומבו הרובح" הופך לסטאפ שמור.

**2.2 מרכز Prop Firm**
- Prisma: `PropAccount { id, userId, firm, alias, phase(EVAL|FUNDED), startingBalance, profitTarget, maxDailyLoss, maxTotalDrawdown, trailing Boolean, currentBalance, status(ACTIVE|PASSED|FAILED), createdAt }`.
- עמוד `/prop`: כרטיס לכל חשבון — progress bar ליעד, מרחק מ‑daily loss ומ‑trailing DD, ימי מסחר, סטטוס.
- התראות: קרוב ל‑daily loss / קרוב ליעד / חריגה. (מחובר ל‑alerts הקיים.)
- ערך גבוה לקהל: רוב התלמידים סוחרים דרך prop firms.

---

## PHASE 3 — קלט חכם
**3.1 ייבוא "כל ברוקר" ב‑AI** — הרחבת `/trades/import`:
- `lib/ai-import.ts` משתמש ב‑ai-provider (claude/gemini) למיפוי עמודות CSV שרירותי → סכמת Trade.
- fallback לכללי מיפוי מוכרים (Tradovate/NinjaTrader/Rithmic).

**3.2 Tags + מעקב טעויות**
- Prisma: `Tag`/`TradeTag` (או קטגוריות ב‑entryReasons) + mistake tags.
- דוח "טעויות חוזרות" (ממופה ל‑Coach: "أوقف هذا").

---

## PHASE 4 — ליטוש והרחבה
- **דוחות PDF** (skill `pdf`) — דוח ביצועים חודשי לתלמיד/מנטור.
- **ייצוא Excel** (skill `xlsx`).
- **Trade‑Replay מוקטן** — סקירת chart images ממוסגרת עם annotation כניסה/יציאה.
- **המשך קורס Quarterly Theory** — חלקים 2–5 (Bucko's Edge concepts, Models, Psychology, Prop, Roadmap) בערבית שאמية מקורית.

---

## מדדי הצלחה
- לכל תלמיד: Coach report + Playbook + prop tracking פעילים.
- מנטור רואה per‑student: Coach, סטאפים, סטטוס prop, טעויות חוזרות.
- כל המטריקות המקצועיות (expectancy/R‑dist/drawdown/exit) זמינות בעמוד reports.

## סדר ביצוע מומלץ
Phase 0 → 1 → 2 → 3 → 4. כל פאза: build + deploy + אימות לפני הבאה.
