/**
 * Economic calendar — fetches high-impact events from Financial Modeling Prep
 * (free tier), caches them in the EconomicEvent table, and falls back to a
 * generated list of well-known recurring events (NFP, CPI) when the API key
 * is missing or the request fails.
 *
 * All dates are stored/returned as real UTC instants; display conversion to
 * Asia/Jerusalem happens in the UI via lib/timezone helpers.
 */
import { prisma } from '@/lib/prisma'

export interface CalendarEvent {
  date: string // ISO UTC
  currency: string
  title: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  actual: string | null
  forecast: string | null
  previous: string | null
}

const FMP_URL = 'https://financialmodelingprep.com/api/v3/economic_calendar'

/** Currencies we care about for index/futures day traders (USD-led). */
const RELEVANT_CURRENCIES = new Set(['USD'])

function normImpact(raw: unknown): 'HIGH' | 'MEDIUM' | 'LOW' | null {
  const s = String(raw || '').toUpperCase()
  if (s === 'HIGH') return 'HIGH'
  if (s === 'MEDIUM') return 'MEDIUM'
  if (s === 'LOW') return 'LOW'
  return null
}

/** Fetch raw events from FMP for a date range. Returns [] on any failure. */
async function fetchFromFMP(from: string, to: string): Promise<CalendarEvent[]> {
  const key = process.env.FMP_API_KEY
  if (!key) return []
  try {
    const url = `${FMP_URL}?from=${from}&to=${to}&apikey=${key}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []

    const out: CalendarEvent[] = []
    for (const row of data as Record<string, unknown>[]) {
      const currency = String(row.currency || row.country || '').toUpperCase()
      if (!RELEVANT_CURRENCIES.has(currency)) continue
      const impact = normImpact(row.impact)
      if (impact !== 'HIGH' && impact !== 'MEDIUM') continue // only meaningful events
      const rawDate = String(row.date || '')
      if (!rawDate) continue
      // FMP returns "YYYY-MM-DD HH:mm:ss" in UTC.
      const iso = new Date(rawDate.replace(' ', 'T') + 'Z').toISOString()
      const val = (v: unknown) => (v == null || v === '' ? null : String(v))
      out.push({
        date: iso,
        currency,
        title: String(row.event || '').trim(),
        impact,
        actual: val(row.actual),
        forecast: val(row.estimate ?? row.forecast),
        previous: val(row.previous),
      })
    }
    return out
  } catch {
    return []
  }
}

/** First Friday of a given month (NFP release day), at 13:30 UTC (8:30 ET, EDT). */
function firstFriday(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1))
  // getUTCDay: 0=Sun..6=Sat; we want Friday=5
  const add = (5 - d.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, month, 1 + add, 13, 30))
}

/**
 * Fallback recurring events — generated locally when FMP is unavailable.
 * Covers the two most market-moving USD releases that follow a predictable
 * schedule: Non-Farm Payrolls (first Friday) and CPI (~mid-month).
 * These are approximate; the FMP feed (when configured) supersedes them.
 */
function recurringFallback(fromMs: number, toMs: number): CalendarEvent[] {
  const out: CalendarEvent[] = []
  const start = new Date(fromMs)
  // iterate months spanning the range
  for (let m = 0; m <= 2; m++) {
    const year = start.getUTCFullYear()
    const month = start.getUTCMonth() + m

    // NFP — first Friday, 13:30 UTC
    const nfp = firstFriday(year, month)
    if (nfp.getTime() >= fromMs && nfp.getTime() <= toMs) {
      out.push({
        date: nfp.toISOString(),
        currency: 'USD',
        title: 'تقرير الوظائف غير الزراعية (NFP)',
        impact: 'HIGH',
        actual: null, forecast: null, previous: null,
      })
    }

    // CPI — approx 13th of month, 13:30 UTC (release time varies)
    const cpi = new Date(Date.UTC(year, month, 13, 13, 30))
    if (cpi.getTime() >= fromMs && cpi.getTime() <= toMs) {
      out.push({
        date: cpi.toISOString(),
        currency: 'USD',
        title: 'مؤشر أسعار المستهلك (CPI) — تقريبي',
        impact: 'HIGH',
        actual: null, forecast: null, previous: null,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Refresh the cache from FMP for the given window and persist into
 * EconomicEvent. Returns the number of events upserted. Used by the cron
 * and the API route.
 */
export async function refreshEconomicEvents(daysAhead = 21): Promise<number> {
  const now = new Date()
  const to = new Date(now.getTime() + daysAhead * 86400_000)
  const events = await fetchFromFMP(dateOnly(now), dateOnly(to))
  if (events.length === 0) return 0

  let count = 0
  for (const e of events) {
    await prisma.economicEvent.upsert({
      where: {
        date_currency_title: {
          date: new Date(e.date),
          currency: e.currency,
          title: e.title,
        },
      },
      create: {
        date: new Date(e.date),
        currency: e.currency,
        title: e.title,
        impact: e.impact,
        actual: e.actual,
        forecast: e.forecast,
        previous: e.previous,
      },
      update: {
        impact: e.impact,
        actual: e.actual,
        forecast: e.forecast,
        previous: e.previous,
        fetchedAt: new Date(),
      },
    })
    count++
  }
  return count
}

/**
 * Get upcoming high/medium-impact events for display.
 * Reads from cache; if the cache is empty for the window, attempts a live
 * refresh, and ultimately falls back to generated recurring events.
 */
export async function getUpcomingEvents(daysAhead = 14): Promise<{ events: CalendarEvent[]; source: 'live' | 'fallback' }> {
  const now = new Date()
  const to = new Date(now.getTime() + daysAhead * 86400_000)

  let rows = await prisma.economicEvent.findMany({
    where: { date: { gte: now, lte: to } },
    orderBy: { date: 'asc' },
  })

  // Cache miss → try a live refresh once
  if (rows.length === 0) {
    const fetched = await refreshEconomicEvents(Math.max(daysAhead, 21))
    if (fetched > 0) {
      rows = await prisma.economicEvent.findMany({
        where: { date: { gte: now, lte: to } },
        orderBy: { date: 'asc' },
      })
    }
  }

  if (rows.length > 0) {
    return {
      source: 'live',
      events: rows.map((r) => ({
        date: r.date.toISOString(),
        currency: r.currency,
        title: r.title,
        impact: (r.impact as CalendarEvent['impact']) || 'MEDIUM',
        actual: r.actual,
        forecast: r.forecast,
        previous: r.previous,
      })),
    }
  }

  // Final fallback — generated recurring events
  return { source: 'fallback', events: recurringFallback(now.getTime(), to.getTime()) }
}
