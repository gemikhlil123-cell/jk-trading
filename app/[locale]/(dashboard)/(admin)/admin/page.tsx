'use client'

import { useEffect, useState, useCallback } from 'react'

interface UserStats {
  totalTrades: number
  wins: number
  totalPnl: number
  winRate: number
}

interface AdminUser {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  subscriptionStatus: string
  trialEndsAt: string | null
  createdAt: string
  stats: UserStats
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trial:     { label: 'تجربة', color: '#C9A84C' },
  active:    { label: 'مشترك', color: '#1DB954' },
  expired:   { label: 'منتهي', color: '#E74C3C' },
  cancelled: { label: 'ملغي',  color: '#E74C3C' },
}

function daysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'inactive'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin')
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function updateUser(userId: string, patch: { isActive?: boolean; subscriptionStatus?: string }) {
    setUpdating(userId)
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    })
    await fetchUsers()
    setUpdating(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false
    if (filter === 'all') return true
    if (filter === 'inactive') return !u.isActive
    return u.subscriptionStatus === filter
  })

  const totalActive   = users.filter(u => u.isActive && u.subscriptionStatus === 'active').length
  const totalTrial    = users.filter(u => u.isActive && u.subscriptionStatus === 'trial').length
  const totalExpired  = users.filter(u => u.subscriptionStatus === 'expired' || (!u.isActive)).length
  const totalStudents = users.filter(u => u.role === 'STUDENT').length

  return (
    <div dir="rtl" className="px-4 py-5 max-w-2xl mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-[#D4AF37] mb-1">لوحة الإدارة</h1>
        <p className="text-xs text-[#4A5A7A]">JK Trading Journal — إدارة المتداولين</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'إجمالي', value: totalStudents, color: '#8899BB' },
          { label: 'مشتركين', value: totalActive, color: '#1DB954' },
          { label: 'تجربة', value: totalTrial, color: '#C9A84C' },
          { label: 'منتهي', value: totalExpired, color: '#E74C3C' },
        ].map(s => (
          <div key={s.label}
            className="rounded-xl p-3 text-center border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(212,175,55,0.1)' }}>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[#4A5A7A] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="ابحث بالاسم أو البريد..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 text-sm text-[#E8DEB8] placeholder-[#4A5A7A] border outline-none focus:border-[rgba(212,175,55,0.4)]"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(212,175,55,0.15)' }}
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'active', 'trial', 'expired', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
              style={{
                background: filter === f ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: filter === f ? 'rgba(201,168,76,0.5)' : 'rgba(212,175,55,0.1)',
                color: filter === f ? '#D4AF37' : '#4A5A7A',
              }}>
              {f === 'all' ? 'الكل' : f === 'active' ? 'مشتركين' : f === 'trial' ? 'تجربة' : f === 'expired' ? 'منتهي' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-16 text-[#4A5A7A] text-sm">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#4A5A7A] text-sm">لا يوجد مستخدمون</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const days = daysLeft(u.trialEndsAt)
            const statusInfo = STATUS_LABEL[u.subscriptionStatus] ?? { label: u.subscriptionStatus, color: '#8899BB' }
            const isUpdating = updating === u.id

            return (
              <div key={u.id}
                className="rounded-2xl border p-4 transition-all"
                style={{
                  background: u.isActive ? 'rgba(255,255,255,0.03)' : 'rgba(231,76,60,0.04)',
                  borderColor: u.isActive ? 'rgba(212,175,55,0.12)' : 'rgba(231,76,60,0.2)',
                }}>

                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                      style={{ background: 'linear-gradient(135deg, #A07D1C, #D4AF37)', color: '#080C14' }}>
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#E8DEB8] text-sm leading-tight">{u.name ?? '—'}</p>
                      <p className="text-[10px] text-[#4A5A7A] mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ color: statusInfo.color, borderColor: statusInfo.color + '44', background: statusInfo.color + '15' }}>
                      {statusInfo.label}
                    </span>
                    {!u.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(231,76,60,0.15)] text-[#E74C3C] border border-[rgba(231,76,60,0.3)]">
                        موقوف
                      </span>
                    )}
                  </div>
                </div>

                {/* Trial countdown */}
                {u.subscriptionStatus === 'trial' && days !== null && (
                  <div className="mb-3 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{
                      background: days <= 1 ? 'rgba(231,76,60,0.1)' : 'rgba(201,168,76,0.08)',
                      color: days <= 1 ? '#E74C3C' : '#C9A84C',
                      border: `1px solid ${days <= 1 ? 'rgba(231,76,60,0.25)' : 'rgba(201,168,76,0.2)'}`,
                    }}>
                    {days > 0 ? `⏱ ${days} يوم متبقي من التجربة` : 'انتهت التجربة المجانية'}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    { label: 'صفقات', value: u.stats.totalTrades },
                    { label: 'فوز %', value: u.stats.totalTrades > 0 ? `${u.stats.winRate}%` : '—' },
                    { label: 'P&L', value: u.stats.totalPnl !== 0 ? `${u.stats.totalPnl > 0 ? '+' : ''}${u.stats.totalPnl.toFixed(0)}$` : '—' },
                    { label: 'تسجيل', value: new Date(u.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.08)' }}>
                      <p className="text-xs font-black text-[#E8DEB8]">{s.value}</p>
                      <p className="text-[9px] text-[#4A5A7A] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {/* Activate subscription */}
                  {u.subscriptionStatus !== 'active' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateUser(u.id, { subscriptionStatus: 'active', isActive: true })}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
                      style={{ background: 'rgba(29,185,84,0.1)', borderColor: 'rgba(29,185,84,0.35)', color: '#1DB954' }}>
                      {isUpdating ? '...' : '✓ تفعيل الاشتراك'}
                    </button>
                  )}

                  {/* Deactivate subscription */}
                  {u.subscriptionStatus === 'active' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateUser(u.id, { subscriptionStatus: 'expired' })}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
                      style={{ background: 'rgba(231,76,60,0.08)', borderColor: 'rgba(231,76,60,0.3)', color: '#E74C3C' }}>
                      {isUpdating ? '...' : '✕ إيقاف الاشتراك'}
                    </button>
                  )}

                  {/* Toggle account active/suspended */}
                  <button
                    disabled={isUpdating}
                    onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                    className="py-2 px-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
                    style={u.isActive
                      ? { background: 'rgba(74,90,122,0.15)', borderColor: 'rgba(74,90,122,0.3)', color: '#4A5A7A' }
                      : { background: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                    {isUpdating ? '...' : u.isActive ? '🔒 إيقاف الحساب' : '🔓 تفعيل الحساب'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-[10px] text-[#4A5A7A] mt-8">
        {users.length} مستخدم مسجّل · JK Trading Journal
      </p>
    </div>
  )
}
