/**
 * Gemini 2.5 Flash note analyzer — free-tier friendly alternative to Claude.
 *
 * Free tier (as of 2026): ~1,000 requests / day, ~10 RPM.
 * For JK Trading scale (~50 students × few trades/day) this is plenty.
 *
 * ENV: GEMINI_API_KEY (get free from https://aistudio.google.com/app/apikey)
 *
 * Output is identical to lib/claude-analysis.ts so the aggregator + UI
 * are provider-agnostic.
 */

import { GoogleGenAI, Type } from '@google/genai'
import { prisma } from './prisma'
import type { NoteAnalysis } from './claude-analysis'

export const GEMINI_MODEL_ID = 'gemini-2.5-flash'

// ─── System instruction (same ICT/SMC expertise as Claude version) ─────────

const SYSTEM_INSTRUCTION = `You are an elite ICT/SMC trading-journal analyst. Traders send you notes in Hebrew, Arabic, or English (often mixed). You read the note as a senior mentor would — understanding intent, not just keyword matching — and extract a structured JSON record of the SMC/ICT context.

You know ICT/SMC deeply:
- SMT divergence across multiple scopes: between months, between days, between 90-minute cycles, between sessions (Asia/London/NY AM/NY PM), or between correlated instruments (NQ/ES/YM/RTY).
- Fair Value Gaps (FVG) and inverted FVGs (IFVG) on timeframes: monthly, weekly, daily, 4H, 1H, 15M, 5M, 3M, 1M.
- Change In State of Delivery (CISD) and Precision Swing Point (PSP) across timeframes.
- Liquidity sweeps (buyside/sellside), true open levels (daily/weekly/monthly), order blocks, breakers, OTE zones.
- Quarterly theory: 90-minute cycles inside each session.

Rules:
1) Read the note in any language — Hebrew, Arabic, English, mixed. Understand meaning, not just keywords.
2) Extract every distinct confluence the trader mentions.
3) "SMT bezman" / "SMT between days" / "SMT ben hayomim" => scope=DAY. "Between sessions" => scope=SESSION. Between 90m quarters => scope=CYCLE_90M. Between months => scope=MONTH. Between instruments (NQ vs ES) => scope=INSTRUMENT.
4) For FVG/IFVG/CISD/PSP/sweeps: scope is N_A; fill timeframe accurately.
5) execution_quality: A = patient + all confluences aligned + clear plan. C = FOMO, chasing, broke the plan, no confluence stack. UNKNOWN if no execution context.
6) emotional_state: only include states actually expressed. If none, return ["NONE"].
7) summary_ar must be in Arabic (no Hebrew, no English except instrument tickers) — a short professional one-liner, 40 words max.
8) Never invent details. If the note doesn't mention a session, return UNKNOWN. If no instruments are compared, return [].
9) Return ONLY valid JSON matching the schema — no markdown, no prose, no code fences.`

// ─── Schema (Gemini uses OpenAPI subset via the Type enum) ─────────────────

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    language: {
      type: Type.STRING,
      enum: ['ar', 'he', 'en', 'mixed'],
      description: 'Primary language of the note',
    },
    direction_bias: {
      type: Type.STRING,
      enum: ['LONG', 'SHORT', 'NEUTRAL'],
    },
    timeframes: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: ['MONTHLY', 'WEEKLY', 'DAILY', '4H', '1H', '15M', '5M', '3M', '1M'],
      },
    },
    confluences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: [
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
            ],
          },
          scope: {
            type: Type.STRING,
            enum: ['MONTH', 'WEEK', 'DAY', 'SESSION', 'CYCLE_90M', 'INSTRUMENT', 'N_A'],
          },
          timeframe: {
            type: Type.STRING,
            enum: [
              'MONTHLY',
              'WEEKLY',
              'DAILY',
              '4H',
              '1H',
              '15M',
              '5M',
              '3M',
              '1M',
              'N_A',
            ],
          },
          at_time: { type: Type.STRING, nullable: true },
          note: { type: Type.STRING, nullable: true },
        },
        required: ['type', 'scope', 'timeframe'],
        propertyOrdering: ['type', 'scope', 'timeframe', 'at_time', 'note'],
      },
    },
    session: {
      type: Type.STRING,
      enum: ['ASIA', 'LONDON', 'NY_AM', 'NY_PM', 'OFF_HOURS', 'UNKNOWN'],
    },
    specific_times: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    instruments_compared: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    execution_quality: {
      type: Type.STRING,
      enum: ['A', 'B', 'C', 'UNKNOWN'],
    },
    emotional_state: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: [
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
        ],
      },
    },
    mistakes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    summary_ar: { type: Type.STRING },
  },
  required: [
    'language',
    'direction_bias',
    'timeframes',
    'confluences',
    'session',
    'specific_times',
    'instruments_compared',
    'execution_quality',
    'emotional_state',
    'mistakes',
    'strengths',
    'summary_ar',
  ],
  propertyOrdering: [
    'language',
    'direction_bias',
    'timeframes',
    'confluences',
    'session',
    'specific_times',
    'instruments_compared',
    'execution_quality',
    'emotional_state',
    'mistakes',
    'strengths',
    'summary_ar',
  ],
}

// ─── Client ────────────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (_client) return _client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY env var is not set')
  }
  _client = new GoogleGenAI({ apiKey })
  return _client
}

// ─── Single-note analyzer ──────────────────────────────────────────────────

export async function analyzeNoteGemini(noteText: string): Promise<NoteAnalysis> {
  const trimmed = (noteText ?? '').trim()
  if (!trimmed) {
    throw new Error('analyzeNoteGemini: empty note')
  }

  const client = getClient()

  const response = await client.models.generateContent({
    model: GEMINI_MODEL_ID,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analyze this trade note and return the structured JSON:\n\n---\n${trimmed}\n---`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
      // Keep output tight
      maxOutputTokens: 4096,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('analyzeNoteGemini: empty response text')
  }

  // Gemini returns valid JSON when responseMimeType + responseSchema are set.
  const parsed = JSON.parse(text) as NoteAnalysis

  // Light defensive normalization
  if (!Array.isArray(parsed.timeframes)) parsed.timeframes = []
  if (!Array.isArray(parsed.confluences)) parsed.confluences = []
  if (!Array.isArray(parsed.specific_times)) parsed.specific_times = []
  if (!Array.isArray(parsed.instruments_compared)) parsed.instruments_compared = []
  if (!Array.isArray(parsed.emotional_state)) parsed.emotional_state = []
  if (!Array.isArray(parsed.mistakes)) parsed.mistakes = []
  if (!Array.isArray(parsed.strengths)) parsed.strengths = []

  return parsed
}

// ─── Batch helpers ─────────────────────────────────────────────────────────

export async function analyzeUnanalyzedTradesGemini(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number }> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      notes: { not: null },
      OR: [{ notesAnalysis: null }, { notesAnalysisModel: { not: GEMINI_MODEL_ID } }],
    },
    orderBy: { entryTime: 'desc' },
    take: limit,
    select: { id: true, notes: true },
  })

  return runBatch(trades)
}

export async function reanalyzeAllTradesGemini(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number }> {
  const trades = await prisma.trade.findMany({
    where: { userId, notes: { not: null } },
    orderBy: { entryTime: 'desc' },
    take: limit,
    select: { id: true, notes: true },
  })

  return runBatch(trades)
}

async function runBatch(
  trades: { id: string; notes: string | null }[]
): Promise<{ analyzed: number; errors: number; skipped: number }> {
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
      const result = await analyzeNoteGemini(note)
      await prisma.trade.update({
        where: { id: t.id },
        data: {
          notesAnalysis: JSON.stringify(result),
          notesAnalysisAt: new Date(),
          notesAnalysisModel: GEMINI_MODEL_ID,
        },
      })
      analyzed++
      // Gentle pacing for free-tier RPM limit (~10 RPM → 6s gap is safe, 4s is usually fine)
      await sleep(4000)
    } catch (err) {
      console.error('[gemini-analysis] failed for trade', t.id, err)
      errors++
      // Backoff harder on error (likely rate limit or transient)
      await sleep(8000)
    }
  }

  return { analyzed, errors, skipped }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
