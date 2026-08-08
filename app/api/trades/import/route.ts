import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeKillzone, computeCyclePhase } from '@/lib/autoTag'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Bulk import trades from CSV.
 *
 * Expected columns (case-insensitive, comma-separated):
 *   dateLocal, entryTimeLocal, exitTimeLocal, entryTime, exitTime,
 *   symbol, direction, entryPrice, exitPrice, pnl,
 *   rrPlanned, rrAchieved, isBacktest, entryReasons, notes
 *
 * Either provide `entryTime`/`exitTime` as ISO UTC strings, OR
 * `dateLocal` + `entryTimeLocal` (Jerusalem wall-clock, "HH:mm").
 *
 * `entryReasons` is a `;`-separated list of EntryReason.name values.
 */

type Row = Record<string, string>

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []

  const header = splitCSVLine(lines[0]).map(h => h.trim())
  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i])
    const row: Row = {}
    header.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

// Minimal CSV line splitter with "..." quoting support
function splitCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

// Jerusalem wall-clock → UTC Date
function jerusalemWallToUTC(dateStr: string, timeStr: string): Date | null {
  const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const tm = timeStr.match(/^(\d{2}):(\d{2})$/)
  if (!dm || !tm) return null
  const y = +dm[1], mo = +dm[2], d = +dm[3], h = +tm[1], mi = +tm[2]
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi))
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(guess)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || '0', 10)
  let hour = get('hour'); if (hour === 24) hour = 0
  const jerusalemAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  const offsetMin = Math.round((jerusalemAsUTC - guess.getTime()) / 60000)
  return new Date(guess.getTime() - offsetMin * 60000)
}

function resolveEntryTime(row: Row): { entry: Date; exit: Date | null } | null {
  // Prefer ISO UTC if present
  if (row.entryTime) {
    const e = new Date(row.entryTime)
    if (isNaN(e.getTime())) return null
    const x = row.exitTime ? new Date(row.exitTime) : null
    return { entry: e, exit: x && !isNaN(x.getTime()) ? x : null }
  }
  // Fall back to Jerusalem wall-clock
  if (row.dateLocal && row.entryTimeLocal) {
    const e = jerusalemWallToUTC(row.dateLocal, row.entryTimeLocal)
    if (!e) return null
    const x = row.exitTimeLocal ? jerusalemWallToUTC(row.dateLocal, row.exitTimeLocal) : null
    return { entry: e, exit: x }
  }
  return null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user!.id as string

  let csvText = ''
  let dryRun = false

  const ct = req.headers.get('content-type') || ''
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    csvText = await file.text()
    dryRun = form.get('dryRun') === 'true'
  } else {
    const body = await req.json()
    csvText = body.csv || ''
    dryRun = !!body.dryRun
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'Empty CSV' }, { status: 400 })
  }

  const rows = parseCSV(csvText)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 })
  }

  // Load entry reasons once
  const allReasons = await prisma.entryReason.findMany()
  const reasonByName = new Map(allReasons.map(r => [r.name.toLowerCase().trim(), r.id]))

  const errors: { line: number; msg: string }[] = []
  type Parsed = {
    line: number
    data: Prisma.TradeCreateManyInput
    reasonIds: string[]
  }
  const parsed: Parsed[] = []

  rows.forEach((row, idx) => {
    const line = idx + 2 // line in file (1-based, +1 for header)

    const times = resolveEntryTime(row)
    if (!times) {
      errors.push({ line, msg: 'Missing or invalid entryTime' })
      return
    }
    const { entry, exit } = times

    const symbol = (row.symbol || '').toUpperCase().trim()
    const validSymbols = ['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']
    if (!validSymbols.includes(symbol)) {
      errors.push({ line, msg: `Invalid symbol "${row.symbol}"` })
      return
    }

    const direction = (row.direction || '').toUpperCase().trim()
    if (direction !== 'LONG' && direction !== 'SHORT') {
      errors.push({ line, msg: `Invalid direction "${row.direction}"` })
      return
    }

    const entryPrice = parseFloat(row.entryPrice)
    if (isNaN(entryPrice)) {
      errors.push({ line, msg: 'Invalid entryPrice' })
      return
    }

    const exitPrice = row.exitPrice ? parseFloat(row.exitPrice) : null
    const pnl = row.pnl ? parseFloat(row.pnl) : null
    const rrPlanned = row.rrPlanned ? parseFloat(row.rrPlanned) : null
    const rrAchieved = row.rrAchieved ? parseFloat(row.rrAchieved) : null
    const isBacktest = String(row.isBacktest || 'false').toLowerCase() === 'true'

    const killzone = computeKillzone(entry)
    const cyclePhase = computeCyclePhase(entry, killzone)

    // Resolve entry reasons
    const reasonNames = (row.entryReasons || '')
      .split(/[;|]/)
      .map(s => s.trim())
      .filter(Boolean)
    const reasonIds: string[] = []
    const unknownReasons: string[] = []
    for (const name of reasonNames) {
      const id = reasonByName.get(name.toLowerCase())
      if (id) reasonIds.push(id)
      else unknownReasons.push(name)
    }
    if (unknownReasons.length > 0) {
      errors.push({ line, msg: `Unknown entry reasons: ${unknownReasons.join(', ')}` })
      // continue anyway with the known ones
    }

    parsed.push({
      line,
      data: {
        userId,
        symbol: symbol as Prisma.TradeCreateManyInput['symbol'],
        direction: direction as Prisma.TradeCreateManyInput['direction'],
        entryPrice: new Prisma.Decimal(entryPrice),
        exitPrice: exitPrice !== null ? new Prisma.Decimal(exitPrice) : null,
        entryTime: entry,
        exitTime: exit,
        pnl: pnl !== null ? new Prisma.Decimal(pnl) : null,
        rrPlanned: rrPlanned !== null ? new Prisma.Decimal(rrPlanned) : null,
        rrAchieved: rrAchieved !== null ? new Prisma.Decimal(rrAchieved) : null,
        isBacktest,
        notes: row.notes || null,
        killzone,
        cyclePhase,
      },
      reasonIds,
    })
  })

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalRows: rows.length,
      validRows: parsed.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      sample: parsed.slice(0, 3).map(p => ({
        line: p.line,
        entryTime: p.data.entryTime,
        symbol: p.data.symbol,
        direction: p.data.direction,
        killzone: p.data.killzone,
        cyclePhase: p.data.cyclePhase,
        pnl: p.data.pnl,
        reasonCount: p.reasonIds.length,
      })),
    })
  }

  if (parsed.length === 0) {
    return NextResponse.json({
      error: 'No valid rows to import',
      errors,
    }, { status: 400 })
  }

  // Bulk insert in batches
  let inserted = 0
  const BATCH = 50
  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH)
    await prisma.$transaction(async (tx) => {
      for (const p of batch) {
        const trade = await tx.trade.create({
          data: {
            ...p.data,
            entryReasons: p.reasonIds.length > 0
              ? { create: p.reasonIds.map(id => ({ entryReasonId: id })) }
              : undefined,
          },
        })
        if (trade) inserted++
      }
    })
  }

  return NextResponse.json({
    inserted,
    totalRows: rows.length,
    errorCount: errors.length,
    errors: errors.slice(0, 50),
  })
}
