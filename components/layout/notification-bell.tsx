'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'

interface Alert {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts ?? [])
      setUnread(data.unread ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  async function markAllRead() {
    await fetch('/api/alerts', { method: 'PATCH', body: JSON.stringify({}) })
    setUnread(0)
    setAlerts(a => a.map(x => ({ ...x, isRead: true })))
  }

  function openPanel() {
    setOpen(v => !v)
    if (!open && unread > 0) markAllRead()
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        className="relative p-1.5 rounded-lg text-[#F5F5DC]/50 hover:text-[#F5F5DC] hover:bg-[#F5F5DC]/5 transition-colors"
        aria-label="notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#E74C3C] text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            dir="rtl"
            className="absolute top-full end-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-[#0D1520] border border-[rgba(212,175,55,0.25)] shadow-2xl z-50"
            style={{ fontFamily: 'Cairo, sans-serif' }}
          >
            <div className="px-4 py-3 border-b border-[rgba(212,175,55,0.15)] flex items-center justify-between">
              <span className="text-[#D4AF37] font-bold text-sm">الإشعارات</span>
              {alerts.length > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-[#8899BB] hover:text-[#D4AF37]">
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-[#4A5A7A] text-xs">لا توجد إشعارات</div>
            ) : (
              <div>
                {alerts.map(a => (
                  <div
                    key={a.id}
                    className={`px-4 py-3 border-b border-[rgba(212,175,55,0.06)] ${
                      !a.isRead ? 'bg-[rgba(212,175,55,0.05)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.15)] text-[#D4AF37]">
                        {a.type === 'MENTOR_COMMENT' ? 'من المدرب' : a.type === 'BILLING' ? 'فوترة' : 'نظام'}
                      </span>
                      <span className="text-[9px] text-[#4A5A7A]">
                        {new Date(a.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[#C8D8EE] text-xs leading-relaxed">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
