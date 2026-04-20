/**
 * Claude-based deep notes analysis.
 *
 * Takes a trade note (Hebrew / Arabic / English — mixed is fine) and extracts a
 * structured JSON describing the ICT/SMC setup the trader was reading:
 * timeframes, confluences (SMT scopes, FVG/IFVG, CISD, PSP, sweeps), session,
 * specific times, instruments compared, execution quality, emotional state,
 * and a short Arabic summary for the UI.
 *
 * Model: claude-opus-4-7 with adaptive thinking + high effort + prompt caching.
 * Structured output: zodOutputFormat via client.messages.parse().
 *
 * ENV: ANTHROPIC_API_KEY must be set.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { prisma } from './prisma'

export const MODEL_ID = 'claude-opus-4-7'

// ─── Zod schema for structured extraction ──────────────────────────────────

const ConfluenceSchema = z.object({
  type: z
    .enum([
      'SMT',
      'FVG',
      'IFVG',
      'CISD',
      'PSP',
      'LIQUIDITY_SWEEP',
      'DAILY_BIAS',
      'TRUE_OPEN',
      'OTE',
      'ORDER_BLOCK',
      'BREAKER',
      'OTHER',
    ])
    .describe('Type of SMC/ICT confluence observed'),
  scope: z
    .enum(['MONTH', 'WEEK', 'DAY', 'SESSION', 'CYCLE_90M', 'INSTRUMENT', 'N_A'])
    .describe(
      'For SMT: the scope of divergence (between months/days/cycles/sessions/instruments). For non-SMT: N_A'
    ),
  timeframe: z
    .enum(['MONTHLY', 'WEEKLY', 'DAILY', '4H', '1H', '15M', '5M', '3M', '1M', 'N_A'])
    .describe('Timeframe where this confluence was observed'),
  at_time: z
    .string()
    .nullable()
    .describe('Specific time mentioned for this confluence (HH:MM local or session label), or null'),
  note: z
    .string()
    .nullable()
    .describe('Short verbatim fragment from the note about this confluence (15 words max), or null'),
})

const NoteAnalysisSchema = z.object({
  language: z
    .enum(['ar', 'he', 'en', 'mixed'])
    .describe('Primary language of the note'),
  direction_bias: z
    .enum(['LONG', 'SHORT', 'NEUTRAL'])
    .describe('Directional bias expressed in the note'),
  timeframes: z
    .array(
      z.enum(['MONTHLY', 'WEEKLY', 'DAILY', '4H', '1H', '15M', '5M', '3M', '1M'])
    )
    .describe('All timeframes referenced in the note'),
  confluences: z
    .array(ConfluenceSchema)
    .describe('Every SMC/ICT confluence mentioned in the note'),
  session: z
    .enum(['ASIA', 'LONDON', 'NY_AM', 'NY_PM', 'OFF_HOURS', 'UNKNOWN'])
    .describe('Trading session referenced or implied'),
  specific_times: z
    .array(z.string())
    .describe(
      'Specific times mentioned in the note (e.g., "09:30", "15:00", "NY open"). Empty array if none.'
    ),
  instruments_compared: z
    .array(z.string())
    .describe(
      'Instruments explicitly compared in the note (for SMT). Use root symbols like "NQ", "ES", "YM", "RTY". Empty array if none.'
    ),
  execution_quality: z
    .enum(['A', 'B', 'C', 'UNKNOWN'])
    .describe(
      'A = textbook (patient, full confluences, planned RR). B = acceptable. C = poor (FOMO, late, chased, broke plan). UNKNOWN if note has no execution context.'
    ),
  emotional_state: z
    .array(
      z.enum([
        'CALM',
        'CONFIDENT',
        'FOMO',
        'REVENGE',
        'FEAR',
        'GREED',
        'IMPATIENCE',
        'FRUSTRATION',
        'DOUBT',
        'DISCIPLINED',
        'NONE',
      ])
    )
    .describe('Emotional states expressed in the note. Empty array => NONE.'),
  mistakes: z
    .array(z.string())
    .describe(
      'Specific mistakes or deviations from plan admitted in the note (in the original language, kept short). Empty array if none.'
    ),
  strengths: z
    .array(z.string())
    .describe('Specific strengths or correct behaviors the trader identifies. Empty array if none.'),
  summary_ar: z
    .string()
    .describe(
      'One or two sentence professional Arabic summary (max 40 words) describing the setup + execution. Always in Arabic, regardless of input language.'
    ),
})

export type NoteAnalysis = z.infer<typeof NoteAnalysisSchema>

// ─── Stable system prompt (cached) ─────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite ICT/SMC trading-journal analyst. Traders send you notes in Hebrew, Arabic, or English (often mixed). You read the note as a senior mentor would — understanding intent, not just keyword matching — and extract a structured JSON record of the SMC/ICT context.

You know ICT/SMC deeply:
- SMT divergence across multiple scopes: between months, between days, between 90-minute cycles, between sessions (Asia/London/NY AM/NY PM), or between correlated instruments (NQ/ES/YM/RTY).
- Fair Value Gaps (FVG) and inverted FVGs (IFVG) on timeframes: monthly, weekly, daily, 4H, 1H, 15M, 5M, 3M, 1M.
- Change In State of Delivery (CISD) and Precision Swing Point (PSP) across timeframes.
- Liquidity sweeps (buyside/sellside), true open levels (daily/weekly/monthly), order blocks, breakers, OTE zones.
- Quarterly theory: 90-minute cycles inside each session.

Rules:
1) Read the note in any language — Hebrew, Arabic, English, mixed. Understand meaning, not just keywords.
2) Extract every distinct confluence the trader mentions. If they say "SMT between NQ and ES on the 15m" that's one SMT entry with scope=INSTRUMENT, timeframe=15M.
3) "SMT bezman" / "SMT between days" / "SMT ben hayomim" => scope=DAY. "Between sessions" => scope=SESSION. Between 90m quarters => scope=CYCLE_90M. Between months => scope=MONTH. Between instruments (NQ vs ES) => scope=INSTRUMENT.
4) For FVG/IFVG/CISD/PSP/sweeps: scope is N_A; fill timeframe accurately.
5) execution_quality is a judgment: A = patient + all confluences aligned + clear plan + sized correctly. C = FOMO, chasing, broke the plan, no confluence stack. UNKNOWN if the note is purely setup description with no mention of how the trade was taken.
6) emotional_state: only include states actually expressed or clearly implied. If none, return ["NONE"].
7) summary_ar must be in Arabic (no Hebrew, no English words except instrument tickers) — a short professional one-liner, 40 words max.
8) Never invent details. If the note doesn't mention a session, return UNKNOWN. If no instruments are compared, return [].
9) Return only fields defined in the schema. No extra prose.`

// ─── Client ────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY env var is not set')
  }
  _client = new Anthropic({ apiKey })
  return _client
}

// ─── Single-note analyzer ──────────────────────────────────────────────────

/**
 * Analyze a single trade note with Claude. Returns a structured NoteAnalysis.
 * Uses adaptive thinking, high effort, and prompt caching on the system prompt.
 */
export async function analyzeNote(noteText: string): Promise<NoteAnalysis> {
  const trimmed = (noteText ?? '').trim()
  if (!trimmed) {
    throw new Error('analyzeNote: empty note')
  }

  const client = getClient()

  // Stream for long input/output safety, then get the final parsed message.
  const stream = client.messages.stream({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: zodOutputFormat(NoteAnalysisSchema),
    },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this trade note and return the structured JSON:\n\n---\n${trimmed}\n---`,
          },
        ],
      },
    ],
  })

  const msg = await stream.finalMessage()

  // parsed output lives on the message when using zodOutputFormat
  // (SDK attaches .parsed_output to the message)
  // Fall back to parsing text content if needed.
  const parsed = (msg as unknown as { parsed_output?: NoteAnalysis }).parsed_output
  if (parsed) return parsed

  // Fallback: find first text block and JSON.parse it
  const textBlock = msg.content.find((c) => c.type === 'text') as
    | { type: 'text'; text: string }
    | undefined
  if (!textBlock) {
    throw new Error('analyzeNote: no text content in response')
  }
  const json = JSON.parse(textBlock.text)
  return NoteAnalysisSchema.parse(json)
}

// ─── Batch: analyze unanalyzed trades ──────────────────────────────────────

/**
 * Analyze trades for a user that have a non-empty note and either:
 *   - no notesAnalysis yet, OR
 *   - notesAnalysisModel !== MODEL_ID (model upgraded, re-run).
 *
 * Processes sequentially to respect rate limits. Returns counts.
 */
export async function analyzeUnanalyzedTrades(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number }> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      notes: { not: null },
      OR: [{ notesAnalysis: null }, { notesAnalysisModel: { not: MODEL_ID } }],
    },
    orderBy: { entryTime: 'desc' },
    take: limit,
    select: { id: true, notes: true },
  })

  let analyzed = 0
  let errors = 0
  let skipped = 0

  for (const t of trades) {
    const note = (t.notes ?? '').trim()
    if (!note || note.length < 10) {
      skipped++
      continue
    }
    try {
      const result = await analyzeNote(note)
      await prisma.trade.update({
        where: { id: t.id },
        data: {
          notesAnalysis: JSON.stringify(result),
          notesAnalysisAt: new Date(),
          notesAnalysisModel: MODEL_ID,
        },
      })
      analyzed++
    } catch (err) {
      console.error('[claude-analysis] failed for trade', t.id, err)
      errors++
    }
  }

  return { analyzed, errors, skipped }
}

/**
 * Force re-analyze all trades with notes for a user (ignores cache).
 */
export async function reanalyzeAllTrades(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number }> {
  const trades = await prisma.trade.findMany({
    where: { userId, notes: { not: null } },
    orderBy: { entryTime: 'desc' },
    take: limit,
    select: { id: true, notes: true },
  })

  let analyzed = 0
  let errors = 0
  let skipped = 0

  for (const t of trades) {
    const note = (t.notes ?? '').trim()
    if (!note || note.length < 10) {
      skipped++
      continue
    }
    try {
      const result = await analyzeNote(note)
      await prisma.trade.update({
        where: { id: t.id },
        data: {
          notesAnalysis: JSON.stringify(result),
          notesAnalysisAt: new Date(),
          notesAnalysisModel: MODEL_ID,
        },
      })
      analyzed++
    } catch (err) {
      console.error('[claude-analysis] failed for trade', t.id, err)
      errors++
    }
  }

  return { analyzed, errors, skipped }
}

/**
 * Parse the stored JSON safely. Returns null on any parse error.
 */
export function parseStoredAnalysis(raw: string | null | undefined): NoteAnalysis | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    return NoteAnalysisSchema.parse(obj)
  } catch {
    return null
  }
}
