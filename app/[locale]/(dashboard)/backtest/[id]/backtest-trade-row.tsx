'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Trade {
  id: string
  direction: string
  entryPrice: unknown
  exitPrice: unknown
  entryTime: Date
  pnl: unknown
  rrAchieved: unknown
  killzone: string | null
  entryReasons: { entryReason: { name: string } }[]
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

  const pnl = trade.pnl !== null ? Number(trade.pnl) : null
  const rr = trade.rrAchieved !== null ? Number(trade.rrAchieved) : null

  async function handleDelete() {
    if (!confirm('حذف هذه الصفقة؟')) return
    setDeleting(true)
    await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <tr className="border-b border-[#1D3461]/50 hover:bg-[#112240]/50 transition-colors">
      <td className="px-4 py-3 text-[#F5F5DC]/70 text-xs">
        {new Date(trade.entryTime).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
        <br />
        <span className="text-[#F5F5DC]/40">
          {new Date(trade.entryTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
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
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded text-[#F5F5DC]/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}
