'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface StudentRow {
  id: string
  name: string
  email: string
  trades: number
  totalPnl: number
  winRate: number
  lastTradeAt: Date | null
  subscriptionStatus: string
  isActive: boolean
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial:     { label: 'تجربة',  color: '#C9A84C', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.3)' },
  active:    { label: '✦ مشترك', color: '#1DB954', bg: 'rgba(29,185,84,0.1)',  border: 'rgba(29,185,84,0.3)' },
  expired:   { label: 'منتهي',  color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',  border: 'rgba(231,76,60,0.3)' },
  cancelled: { label: 'ملغي',   color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',  border: 'rgba(231,76,60,0.3)' },
}

export function StudentRow({ r, locale, first }: { r: StudentRow; locale: string; first: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [updating, setUpdating] = useState(false)
  const [localStatus, setLocalStatus] = useState(r.subscriptionStatus)

  async function toggleActive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setUpdating(true)
    const newStatus = localStatus === 'active' ? 'expired' : 'active'
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: r.id, subscriptionStatus: newStatus }),
    })
    if (res.ok) {
      setLocalStatus(newStatus)
      startTransition(() => router.refresh())
    } else {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? 'فشل تحديث الاشتراك')
    }
    setUpdating(false)
  }

  const statusCfg = STATUS_LABEL[localStatus] ?? STATUS_LABEL.expired
  const isActive = localStatus === 'active'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.4fr',
        padding: '12px',
        borderTop: first ? 'none' : '1px solid rgba(212,175,55,0.07)',
        fontSize: 12,
        color: '#C8D8EE',
        alignItems: 'center',
      }}
    >
      <Link
        href={`/${locale}/mentor/${r.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div style={{ fontWeight: 700 }}>{r.name}</div>
        <div style={{ fontSize: 10, color: '#4A5A7A', marginTop: 2 }}>{r.email}</div>
      </Link>
      <div style={{ textAlign: 'center' }}>{r.trades}</div>
      <div
        style={{
          textAlign: 'center',
          color: r.winRate >= 50 ? '#1DB954' : '#E74C3C',
          fontWeight: 700,
        }}
      >
        {r.trades > 0 ? `${r.winRate.toFixed(0)}%` : '—'}
      </div>
      <div
        style={{
          textAlign: 'center',
          color: r.totalPnl >= 0 ? '#1DB954' : '#E74C3C',
          fontWeight: 700,
        }}
      >
        {r.trades > 0 ? `${r.totalPnl >= 0 ? '+' : ''}${r.totalPnl.toFixed(0)}` : '—'}
      </div>
      <div style={{ textAlign: 'center', color: '#8899BB', fontSize: 10 }}>
        {r.lastTradeAt
          ? new Date(r.lastTradeAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
          : '—'}
      </div>

      {/* Subscription badge + toggle button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 12,
            fontSize: 9,
            fontWeight: 700,
            color: statusCfg.color,
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
          }}
        >
          {statusCfg.label}
        </span>
        <button
          type="button"
          onClick={toggleActive}
          disabled={updating}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            cursor: updating ? 'default' : 'pointer',
            border: '1px solid',
            borderColor: isActive ? 'rgba(231,76,60,0.4)' : 'rgba(29,185,84,0.5)',
            background: isActive ? 'rgba(231,76,60,0.08)' : 'rgba(29,185,84,0.12)',
            color: isActive ? '#E74C3C' : '#1DB954',
            opacity: updating ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {updating ? '...' : isActive ? '✕ إيقاف' : '✓ تفعيل'}
        </button>
      </div>
    </div>
  )
}
