'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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

const SUPER_ADMIN = 'gemikhlil123@gmail.com'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial:     { label: 'تجربة مجانية', color: '#C9A84C', bg: 'rgba(201,168,76,0.1)',  border: 'rgba(201,168,76,0.3)' },
  active:    { label: '✦ مشترك',       color: '#1DB954', bg: 'rgba(29,185,84,0.1)',   border: 'rgba(29,185,84,0.3)'  },
  expired:   { label: 'منتهي',         color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   border: 'rgba(231,76,60,0.3)'  },
  cancelled: { label: 'ملغي',          color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   border: 'rgba(231,76,60,0.3)'  },
}

function daysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function AdminPage() {
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as { email?: string })?.email === SUPER_ADMIN

  const [users, setUsers]     = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'trial' | 'active' | 'expired' | 'inactive'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    setUpdating(userId)
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    })
    await fetchUsers()
    setUpdating(null)
  }

  async function deleteUser(userId: string) {
    setUpdating(userId)
    setDeleteConfirm(null)
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
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

  const stats = {
    total:    users.filter(u => u.role === 'STUDENT').length,
    active:   users.filter(u => u.isActive && u.subscriptionStatus === 'active').length,
    trial:    users.filter(u => u.isActive && u.subscriptionStatus === 'trial').length,
    expired:  users.filter(u => !u.isActive || u.subscriptionStatus === 'expired').length,
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', minHeight: '100vh', padding: '20px 16px 40px' }}>

      {/* Hero Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <img src="/logo.png" alt="JK" style={{ width: '48px', height: '48px', borderRadius: '14px', filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.5))' }} />
          <div>
            <h1 style={{ color: '#C9A84C', fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '1px' }}>لوحة الإدارة</h1>
            <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '11px', margin: '2px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>JK Trading Journal · Admin</p>
          </div>
        </div>
        {/* Gold divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.6), rgba(201,168,76,0.1), transparent)', marginTop: '12px' }} />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'إجمالي', value: stats.total,   color: '#8899BB', icon: '👥' },
          { label: 'مشتركين', value: stats.active,  color: '#1DB954', icon: '✦' },
          { label: 'تجربة',   value: stats.trial,   color: '#C9A84C', icon: '⏱' },
          { label: 'منتهي',   value: stats.expired, color: '#E74C3C', icon: '✕' },
        ].map(s => (
          <div key={s.label} style={{
            borderRadius: '16px', padding: '14px 10px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: '1px solid rgba(201,168,76,0.12)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.icon}</div>
            <p style={{ color: s.color, fontSize: '22px', fontWeight: '900', margin: '0', lineHeight: 1 }}>{s.value}</p>
            <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '10px', margin: '4px 0 0', letterSpacing: '1px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍  ابحث بالاسم أو البريد..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              borderRadius: '14px', padding: '12px 16px',
              fontSize: '13px', color: '#E8DEB8',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              outline: 'none', backdropFilter: 'blur(8px)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {(['all', 'active', 'trial', 'expired', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: '20px',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: '1px solid',
              letterSpacing: '0.5px', transition: 'all 0.2s',
              background: filter === f ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
              borderColor: filter === f ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.1)',
              color: filter === f ? '#C9A84C' : 'rgba(201,168,76,0.4)',
              boxShadow: filter === f ? '0 0 12px rgba(201,168,76,0.15)' : 'none',
            }}>
              {f === 'all' ? 'الكل' : f === 'active' ? '✦ مشتركين' : f === 'trial' ? 'تجربة' : f === 'expired' ? 'منتهي' : 'موقوف'}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(201,168,76,0.4)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          <p style={{ fontSize: '13px', letterSpacing: '2px' }}>جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(201,168,76,0.3)' }}>
          <p style={{ fontSize: '13px' }}>لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(u => {
            const days = daysLeft(u.trialEndsAt)
            const statusCfg = STATUS_CONFIG[u.subscriptionStatus] ?? STATUS_CONFIG.expired
            const isUpdating = updating === u.id
            const initial = (u.name ?? u.email)[0].toUpperCase()

            return (
              <div key={u.id} style={{
                borderRadius: '20px', padding: '16px',
                background: u.isActive
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(201,168,76,0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(231,76,60,0.05) 0%, rgba(0,0,0,0.2) 100%)',
                border: `1px solid ${u.isActive ? 'rgba(201,168,76,0.12)' : 'rgba(231,76,60,0.2)'}`,
                backdropFilter: 'blur(12px)',
                boxShadow: u.isActive ? '0 4px 24px rgba(0,0,0,0.25)' : '0 4px 24px rgba(231,76,60,0.08)',
                transition: 'all 0.2s',
              }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #7D5A1C, #C9A84C)',
                      color: '#080C14', fontWeight: '900', fontSize: '16px',
                      flexShrink: 0, boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                    }}>
                      {initial}
                    </div>
                    <div>
                      <p style={{ color: '#E8DEB8', fontWeight: '800', fontSize: '14px', margin: 0, lineHeight: 1.2 }}>
                        {u.name ?? '—'}
                        {u.email === SUPER_ADMIN && <span style={{ marginRight: '6px', fontSize: '10px', color: '#C9A84C' }}>👑 Super Admin</span>}
                      </p>
                      <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: '11px', margin: '3px 0 0' }}>{u.email}</p>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                      color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                      letterSpacing: '0.5px',
                    }}>
                      {statusCfg.label}
                    </span>
                    {!u.isActive && (
                      <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '700', color: '#E74C3C', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)' }}>
                        🔒 موقوف
                      </span>
                    )}
                  </div>
                </div>

                {/* Trial countdown */}
                {u.subscriptionStatus === 'trial' && days !== null && (
                  <div style={{
                    marginBottom: '12px', padding: '10px 14px', borderRadius: '12px',
                    background: days <= 1 ? 'rgba(231,76,60,0.08)' : 'rgba(201,168,76,0.06)',
                    border: `1px solid ${days <= 1 ? 'rgba(231,76,60,0.2)' : 'rgba(201,168,76,0.15)'}`,
                    color: days <= 1 ? '#E74C3C' : '#C9A84C',
                    fontSize: '12px', fontWeight: '700',
                  }}>
                    {days > 0 ? `⏱ متبقي ${days} يوم من التجربة المجانية` : '⚠️ انتهت التجربة'}
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { label: 'صفقات', value: u.stats.totalTrades, color: '#E8DEB8' },
                    { label: 'فوز %', value: u.stats.totalTrades > 0 ? `${u.stats.winRate}%` : '—', color: u.stats.winRate >= 50 ? '#1DB954' : '#E74C3C' },
                    { label: 'P&L', value: u.stats.totalPnl ? `${u.stats.totalPnl > 0 ? '+' : ''}${u.stats.totalPnl.toFixed(0)}$` : '—', color: u.stats.totalPnl >= 0 ? '#1DB954' : '#E74C3C' },
                    { label: 'تسجيل', value: new Date(u.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }), color: 'rgba(201,168,76,0.6)' },
                  ].map(s => (
                    <div key={s.label} style={{
                      borderRadius: '10px', padding: '8px 6px', textAlign: 'center',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(201,168,76,0.07)',
                    }}>
                      <p style={{ color: s.color, fontSize: '12px', fontWeight: '900', margin: 0 }}>{s.value}</p>
                      <p style={{ color: 'rgba(201,168,76,0.35)', fontSize: '9px', margin: '3px 0 0', letterSpacing: '0.5px' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Activate subscription */}
                  {u.subscriptionStatus !== 'active' && (
                    <button disabled={isUpdating} onClick={() => updateUser(u.id, { subscriptionStatus: 'active', isActive: true })} style={{
                      flex: 1, minWidth: '120px', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      cursor: 'pointer', border: '1px solid rgba(29,185,84,0.4)',
                      background: 'linear-gradient(135deg, rgba(29,185,84,0.12), rgba(29,185,84,0.06))',
                      color: '#1DB954', opacity: isUpdating ? 0.5 : 1,
                      boxShadow: '0 2px 12px rgba(29,185,84,0.1)',
                    }}>
                      {isUpdating ? '...' : '✓ تفعيل الاشتراك'}
                    </button>
                  )}
                  {u.subscriptionStatus === 'active' && (
                    <button disabled={isUpdating} onClick={() => updateUser(u.id, { subscriptionStatus: 'expired' })} style={{
                      flex: 1, minWidth: '120px', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      cursor: 'pointer', border: '1px solid rgba(231,76,60,0.35)',
                      background: 'rgba(231,76,60,0.08)', color: '#E74C3C', opacity: isUpdating ? 0.5 : 1,
                    }}>
                      {isUpdating ? '...' : '✕ إيقاف الاشتراك'}
                    </button>
                  )}

                  {/* Toggle account active/suspended */}
                  <button disabled={isUpdating} onClick={() => updateUser(u.id, { isActive: !u.isActive })} style={{
                    padding: '10px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer', border: u.isActive ? '1px solid rgba(74,90,122,0.3)' : '1px solid rgba(201,168,76,0.35)',
                    background: u.isActive ? 'rgba(74,90,122,0.1)' : 'rgba(201,168,76,0.1)',
                    color: u.isActive ? '#4A5A7A' : '#C9A84C', opacity: isUpdating ? 0.5 : 1,
                  }}>
                    {u.isActive ? '🔒 تعليق' : '🔓 رفع التعليق'}
                  </button>

                  {/* Delete button — SUPER ADMIN only */}
                  {isSuperAdmin && u.email !== SUPER_ADMIN && (
                    deleteConfirm === u.id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => deleteUser(u.id)} disabled={isUpdating} style={{
                          padding: '10px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                          cursor: 'pointer', border: '1px solid rgba(231,76,60,0.5)',
                          background: 'rgba(231,76,60,0.15)', color: '#E74C3C',
                        }}>
                          تأكيد الحذف
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} style={{
                          padding: '10px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                          cursor: 'pointer', border: '1px solid rgba(74,90,122,0.3)',
                          background: 'rgba(74,90,122,0.1)', color: '#4A5A7A',
                        }}>
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(u.id)} style={{
                        padding: '10px 12px', borderRadius: '12px', fontSize: '18px',
                        cursor: 'pointer', border: '1px solid rgba(231,76,60,0.15)',
                        background: 'rgba(231,76,60,0.05)', color: 'rgba(231,76,60,0.5)',
                      }}>
                        🗑
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
        <img src="/logo.png" alt="JK" style={{ width: '32px', height: '32px', opacity: 0.4, margin: '0 auto 8px' }} />
        <p style={{ color: 'rgba(201,168,76,0.25)', fontSize: '10px', letterSpacing: '2px' }}>
          {users.length} مستخدم · JK TRADING JOURNAL
        </p>
      </div>
    </div>
  )
}
