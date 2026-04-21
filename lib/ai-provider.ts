/**
 * AI provider router — picks Gemini (free tier) if configured,
 * else falls back to Anthropic Claude.
 *
 * To force a specific provider, set AI_PROVIDER=gemini or AI_PROVIDER=claude.
 * Default: prefer Gemini (free) if GEMINI_API_KEY is set.
 */

import {
  analyzeNote as analyzeClaude,
  analyzeUnanalyzedTrades as analyzeClaudeBatch,
  reanalyzeAllTrades as reanalyzeClaudeAll,
  MODEL_ID as CLAUDE_MODEL_ID,
} from './claude-analysis'
import {
  analyzeNoteGemini,
  analyzeUnanalyzedTradesGemini,
  reanalyzeAllTradesGemini,
  GEMINI_MODEL_ID,
} from './gemini-analysis'
import type { NoteAnalysis } from './claude-analysis'

export type Provider = 'gemini' | 'claude' | 'none'

export function detectProvider(): Provider {
  const forced = process.env.AI_PROVIDER?.toLowerCase()
  if (forced === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : 'none'
  if (forced === 'claude') return process.env.ANTHROPIC_API_KEY ? 'claude' : 'none'

  // Default: prefer free tier
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  return 'none'
}

export function currentModelId(): string | null {
  const p = detectProvider()
  if (p === 'gemini') return GEMINI_MODEL_ID
  if (p === 'claude') return CLAUDE_MODEL_ID
  return null
}

export async function analyzeNote(noteText: string): Promise<{
  result: NoteAnalysis
  model: string
}> {
  const p = detectProvider()
  if (p === 'gemini') {
    const result = await analyzeNoteGemini(noteText)
    return { result, model: GEMINI_MODEL_ID }
  }
  if (p === 'claude') {
    const result = await analyzeClaude(noteText)
    return { result, model: CLAUDE_MODEL_ID }
  }
  throw new Error('No AI provider configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)')
}

export async function analyzeUnanalyzedTrades(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number; provider: Provider; model: string | null }> {
  const p = detectProvider()
  if (p === 'gemini') {
    const r = await analyzeUnanalyzedTradesGemini(userId, limit)
    return { ...r, provider: p, model: GEMINI_MODEL_ID }
  }
  if (p === 'claude') {
    const r = await analyzeClaudeBatch(userId, limit)
    return { ...r, provider: p, model: CLAUDE_MODEL_ID }
  }
  throw new Error('No AI provider configured')
}

export async function reanalyzeAllTrades(
  userId: string,
  limit: number = 50
): Promise<{ analyzed: number; errors: number; skipped: number; provider: Provider; model: string | null }> {
  const p = detectProvider()
  if (p === 'gemini') {
    const r = await reanalyzeAllTradesGemini(userId, limit)
    return { ...r, provider: p, model: GEMINI_MODEL_ID }
  }
  if (p === 'claude') {
    const r = await reanalyzeClaudeAll(userId, limit)
    return { ...r, provider: p, model: CLAUDE_MODEL_ID }
  }
  throw new Error('No AI provider configured')
}
