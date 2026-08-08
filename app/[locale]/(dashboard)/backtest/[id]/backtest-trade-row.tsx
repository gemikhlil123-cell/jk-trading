'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TradeEditForm } from '@/components/trade/trade-edit-form'

interface Trade {
  id: string
  symbol: string
  direction: string
  entryPrice: unknown
  exitPrice: unknown
  entryTime: Date | string
  exitTime: Date | string | null
  pnl: unknown
  rrAchieved: unknown
  rrPlanned: unknown
  notes: string | null
  selfRating: number | null
  emotionalState: string | null
  killzone: string | null
  entryReasons: { entryReason: { id: string; name: string; category: string } }[]
}

interface Props {
  trade: Trade
  locale?: string
}

const killzoneLabels: Record<string, string> = {
  ASIA: 'آسيا', LONDON: 'لندن', NY_AM: 'نيويورك ص', NY_PM: 'نيويورك م', OFF_HOURS: 'خارج',
}

export function BacktestTradeRow({ trade }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!editing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editing])

  const pnl = trade.pnl !== null ? Number(trade.pnl) : null
  const rr = trade.rrAchieved !== null ? Number(trade.rrAchieved) : null

  async function handleDelete() {
    if (!confirm('حذف هذه الصفقة؟')) return
    setDeleting(true)
    await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' })
    router.refresh()
  }

  // Shape the trade for TradeEditForm
  const editTrade = {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: Number(trade.entryPrice),
    exitPrice: trade.exitPrice !== null && trade.exitPrice !== undefined ? Number(trade.exitPrice) : null,
    entryTime: typeof trade.entryTime === 'string' ? trade.entryTime : trade.entryTime.toISOString(),
    exitTime: trade.exitTime
      ? typeof trade.exitTime === 'string'
        ? trade.exitTime
        : trade.exitTime.toISOString()
      : null,
    pnl: trade.pnl !== null && trade.pnl !== undefined ? Number(trade.pnl) : null,
    rrAchieved: trade.rrAchieved !== null && trade.rrAchieved !== undefined ? Number(trade.rrAchieved) : null,
    rrPlanned: trade.rrPlanned !== null && trade.rrPlanned !== undefined ? Number(trade.rrPlanned) : null,
    notes: trade.notes,
    selfRating: trade.selfRating,
    emotionalState: trade.emotionalState,
    entryReasons: trade.entryReasons.map((er) => ({
      id: er.entryReason.id,
      name: er.entryReason.name,
      category: er.entryReason.category,
    })),
  }

  return (
    <>
      <tr className="border-b border-[#1D3461]/50 hover:bg-[#112240]/50 transition-colors">
        <td className="px-4 py-3 text-[#F5F5DC]/70 text-xs">
          {new Date(trade.entryTime).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem' })}
          <br />
          <span className="text-[#F5F5DC]/40">
            {new Date(trade.entryTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' })}
          </span>
        </td>

        <td className="px-4 py-3">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trade.direction === 'LONG'
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {trade.direction === 'LONG' ? 'شراء' : 'بيع'}
          </span>
        </td>

        <td className="px-4 py-3 text-[#F5F5DC]/80 text-xs font-mono">
          {Number(trade.entryPrice).toFixed(2)}
        </td>

        <td className="px-4 py-3 text-[#F5F5DC]/80 text-xs font-mono">
          {trade.exitPrice !== null ? Number(trade.exitPrice).toFixed(2) : '—'}
        </td>

        <td className="px-4 py-3 text-xs">
          {rr !== null ? (
            <span className={rr >= 1 ? 'text-green-400' : 'text-red-400'}>
              {rr.toFixed(2)}R
            </span>
          ) : '—'}
        </td>

        <td className="px-4 py-3 text-xs font-semibold">
          {pnl !== null ? (
            <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}$
            </span>
          ) : '—'}
        </td>

        <td className="px-4 py-3 text-xs text-[#F5F5DC]/50">
          {trade.killzone ? killzoneLabels[trade.killzone] ?? trade.killzone : '—'}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded text-[#F5F5DC]/30 hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)] transition-colors"
              title="تعديل"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded text-[#F5F5DC]/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Edit modal rendered via portal to document.body — escapes the table layout entirely */}
      {editing && mounted && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', direction: 'rtl' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditing(false)
            }}
          >
            <div className="w-full max-w-xl mt-6 mb-6 relative">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="absolute -top-2 -left-2 z-10 w-9 h-9 rounded-full text-white flex items-center justify-center"
                style={{ background: 'rgba(231,76,60,0.9)' }}
                title="إغلاق"
              >
                <X size={18} />
              </button>
              <TradeEditForm
                trade={editTrade}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false)
                  router.refresh()
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
