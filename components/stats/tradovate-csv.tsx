'use client'

import { useRef, useState } from 'react'

interface DayResult {
  date: string
  pnl: number
}

interface ParsedResult {
  days: DayResult[]
  totalPnl: number
  winDays: number
  lossDays: number
  bestDay: DayResult | null
  worstDay: DayResult | null
  winRate: number
}

function parseCsv(text: string): ParsedResult | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return null

  const header = lines[0].toLowerCase()
  const isFullFormat = header.includes('symbol') || header.includes('openprice')
  const isSimpleFormat = header.includes('date') && header.includes('pnl')

  const dayMap: Record<string, number> = {}

  if (isFullFormat) {
    // Account Balance History: Date,Time,Symbol,Account,OpenPrice,ClosePrice,Qty,Side,Realized PnL,Commission,TradeId
    const cols = lines[0].split(',').map((c) => c.trim().toLowerCase())
    const pnlIdx = cols.findIndex((c) => c.includes('pnl') || c.includes('realized'))
    const dateIdx = cols.findIndex((c) => c === 'date')
    const commIdx = cols.findIndex((c) => c.includes('commission'))

    if (pnlIdx < 0 || dateIdx < 0) return null

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      const date = parts[dateIdx]?.trim() ?? ''
      const pnlRaw = parseFloat(parts[pnlIdx]?.trim() ?? '0') || 0
      const commRaw = commIdx >= 0 ? parseFloat(parts[commIdx]?.trim() ?? '0') || 0 : 0
      const net = pnlRaw - Math.abs(commRaw)
      if (!date) continue
      if (!dayMap[date]) dayMap[date] = 0
      dayMap[date] += net
    }
  } else if (isSimpleFormat) {
    // Simple: Date,PnL
    const cols = lines[0].split(',').map((c) => c.trim().toLowerCase())
    const dateIdx = cols.findIndex((c) => c === 'date')
    const pnlIdx = cols.findIndex((c) => c === 'pnl')
    if (dateIdx < 0 || pnlIdx < 0) return null

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      const date = parts[dateIdx]?.trim() ?? ''
      const pnl = parseFloat(parts[pnlIdx]?.trim() ?? '0') || 0
      if (!date) continue
      if (!dayMap[date]) dayMap[date] = 0
      dayMap[date] += pnl
    }
  } else {
    return null
  }

  const days: DayResult[] = Object.entries(dayMap).map(([date, pnl]) => ({ date, pnl }))
  if (days.length === 0) return null

  const totalPnl = days.reduce((s, d) => s + d.pnl, 0)
  const winDays = days.filter((d) => d.pnl > 0).length
  const lossDays = days.filter((d) => d.pnl <= 0).length
  const winRate = days.length > 0 ? (winDays / days.length) * 100 : 0

  const sorted = [...days].sort((a, b) => b.pnl - a.pnl)
  const bestDay = sorted[0] ?? null
  const worstDay = sorted[sorted.length - 1] ?? null

  return { days, totalPnl, winDays, lossDays, bestDay, worstDay, winRate }
}

function fmtPnl(n: number) {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${n >= 0 ? '+' : '-'}$${formatted}`
}

export function TradovateCSV() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ParsedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsv(text)
      if (!parsed) {
        setError('تعذّر تحليل الملف — تأكد من تنسيق Tradovate CSV')
        setResult(null)
      } else {
        setResult(parsed)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Upload button */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', marginBottom: 2 }}>
              استيراد من Tradovate ✦
            </p>
            <p style={{ fontSize: 10, color: '#4A5A7A' }}>
              Tradovate → Activity → Account Balance History → Export
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#080C14',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            اختر ملف CSV
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {error && (
          <div
            style={{
              marginTop: 10,
              background: 'rgba(231,76,60,0.1)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              color: '#E74C3C',
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 12 }}>
            {fileName && (
              <p style={{ fontSize: 10, color: '#4A5A7A', marginBottom: 8 }}>
                الملف: {fileName} — {result.days.length} يوم
              </p>
            )}

            {/* Summary row */}
            <div
              style={{
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 8,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 900, color: result.totalPnl >= 0 ? '#1DB954' : '#E74C3C', marginBottom: 4 }}>
                إجمالي من Tradovate: {fmtPnl(result.totalPnl)}
              </p>
              <p style={{ fontSize: 11, color: '#C8D8EE' }}>
                أيام رابحة:{' '}
                <span style={{ color: '#1DB954', fontWeight: 700 }}>{result.winDays}</span>
                {'  |  '}
                أيام خاسرة:{' '}
                <span style={{ color: '#E74C3C', fontWeight: 700 }}>{result.lossDays}</span>
                {'  |  '}
                Win Rate:{' '}
                <span style={{ color: '#D4AF37', fontWeight: 700 }}>{result.winRate.toFixed(0)}%</span>
              </p>
            </div>

            {/* Best & Worst */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {result.bestDay && (
                <div
                  style={{
                    background: 'rgba(29,185,84,0.07)',
                    border: '1px solid rgba(29,185,84,0.2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#8899BB', marginBottom: 3 }}>أفضل يوم</p>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#1DB954' }}>{fmtPnl(result.bestDay.pnl)}</p>
                  <p style={{ fontSize: 9, color: '#4A5A7A', marginTop: 2 }}>{result.bestDay.date}</p>
                </div>
              )}
              {result.worstDay && (
                <div
                  style={{
                    background: 'rgba(231,76,60,0.07)',
                    border: '1px solid rgba(231,76,60,0.2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#8899BB', marginBottom: 3 }}>أسوأ يوم</p>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#E74C3C' }}>{fmtPnl(result.worstDay.pnl)}</p>
                  <p style={{ fontSize: 9, color: '#4A5A7A', marginTop: 2 }}>{result.worstDay.date}</p>
                </div>
              )}
            </div>

            {/* Clear button */}
            <button
              type="button"
              onClick={() => { setResult(null); setFileName(null) }}
              style={{
                marginTop: 10,
                background: 'transparent',
                border: '1px solid rgba(231,76,60,0.3)',
                borderRadius: 7,
                padding: '5px 12px',
                color: '#E74C3C',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              مسح البيانات
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
