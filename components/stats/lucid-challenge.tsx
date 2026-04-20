'use client'

import { useEffect, useState } from 'react'

interface Props {
  currentPnl: number
  target: number
}

const CSV_KEY = 'jk_csv_result'

export function LucidChallenge({ currentPnl, target }: Props) {
  // Prefer Tradovate CSV P&L when available (reflects actual broker balance);
  // fall back to database trades otherwise.
  const [effectivePnl, setEffectivePnl] = useState<number>(currentPnl)
  const [source, setSource] = useState<'db' | 'csv'>('db')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CSV_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.totalPnl === 'number') {
          setEffectivePnl(parsed.totalPnl)
          setSource('csv')
          return
        }
      }
    } catch {
      // ignore — fall back to DB value
    }
    setEffectivePnl(currentPnl)
    setSource('db')

    // Re-read when CSV is updated from another tab / after upload
    const handler = () => {
      try {
        const raw = localStorage.getItem(CSV_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed.totalPnl === 'number') {
            setEffectivePnl(parsed.totalPnl)
            setSource('csv')
            return
          }
        }
      } catch {
        /* ignore */
      }
      setEffectivePnl(currentPnl)
      setSource('db')
    }
    window.addEventListener('storage', handler)
    window.addEventListener('jk-csv-updated', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('jk-csv-updated', handler)
    }
  }, [currentPnl])

  const pct = Math.min(100, Math.max(0, (effectivePnl / target) * 100))
  const achieved = effectivePnl >= target
  const remaining = target - effectivePnl

  return (
    <div className="card-gold p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[#D4AF37] text-xs font-bold tracking-wide">🎯 تقدم Lucid Challenge</p>
          <p className="text-[#4A5A7A] text-[10px] mt-0.5">
            الهدف: <span className="text-[#D4AF37] font-bold">${target.toLocaleString()}</span>
            <span className="mx-1.5 text-[#2A3A5A]">•</span>
            <span className="text-[#8899BB]">
              المصدر: {source === 'csv' ? 'Tradovate CSV' : 'السجل اليدوي'}
            </span>
          </p>
        </div>
        <p className={`text-2xl font-black ${achieved ? 'text-[#D4AF37]' : effectivePnl >= 0 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}`}>
          {pct.toFixed(1)}%
        </p>
      </div>

      <div className="progress-track mb-2">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: achieved
              ? 'linear-gradient(90deg, #D4AF37, #F5E6A3)'
              : effectivePnl >= 0
              ? 'linear-gradient(90deg, #A07D1C, #D4AF37)'
              : 'linear-gradient(90deg, #991B1B, #E74C3C)',
          }}
        />
      </div>

      <div className="flex justify-between text-xs mt-2">
        <span className="text-[#8899BB]">
          المحقق: <b className={effectivePnl >= 0 ? 'text-[#1DB954]' : 'text-[#E74C3C]'}>
            {effectivePnl >= 0 ? '+' : ''}${effectivePnl.toFixed(0)}
          </b>
        </span>
        <span className="text-[#4A5A7A]">
          {achieved ? '🏆 تم تحقيق الهدف!' : `المتبقي: $${remaining.toFixed(0)}`}
        </span>
      </div>
    </div>
  )
}
