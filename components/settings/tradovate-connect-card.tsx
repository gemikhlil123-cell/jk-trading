'use client'

import { useState } from 'react'

interface AccountSummary {
  env: string
  isActive: boolean
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastErrorMessage: string | null
  importedTradesCount: number
  tokenExpiresAt: string | null
  createdAt: string
}

export function TradovateConnectCard({
  initialAccount,
}: {
  initialAccount: AccountSummary | null
}) {
  const [account, setAccount] = useState<AccountSummary | null>(initialAccount)
  const [showForm, setShowForm] = useState(!initialAccount)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [form, setForm] = useState({
    env: 'LIVE' as 'LIVE' | 'DEMO',
    username: '',
    password: '',
    cid: '',
    secret: '',
    appId: '',
    deviceId: '',
  })

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/tradovate/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'فشل الربط' })
      } else {
        setMessage({ type: 'ok', text: data.summary || 'تم الربط بنجاح' })
        setShowForm(false)
        await refreshStatus()
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'خطأ غير متوقع',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'فشل المزامنة' })
      } else {
        setMessage({
          type: 'ok',
          text: `تم: ${data.imported} صفقة مستوردة، ${data.skipped} موجودة سابقاً${
            data.errors > 0 ? `، ${data.errors} أخطاء` : ''
          }`,
        })
        await refreshStatus()
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'خطأ غير متوقع',
      })
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('هل أنت متأكد من قطع الاتصال؟ سيتم حذف بيانات الربط (الصفقات المستوردة تبقى).')) {
      return
    }
    setLoading(true)
    try {
      await fetch('/api/tradovate/disconnect', { method: 'POST' })
      setAccount(null)
      setShowForm(true)
      setMessage({ type: 'ok', text: 'تم قطع الاتصال' })
    } finally {
      setLoading(false)
    }
  }

  async function refreshStatus() {
    const res = await fetch('/api/tradovate/status')
    if (res.ok) {
      const data = await res.json()
      if (data.account) {
        setAccount({
          env: data.account.env,
          isActive: data.account.isActive,
          lastSyncAt: data.account.lastSyncAt,
          lastSyncStatus: data.account.lastSyncStatus,
          lastErrorMessage: data.account.lastErrorMessage,
          importedTradesCount: data.account.importedTradesCount,
          tokenExpiresAt: data.account.tokenExpiresAt,
          createdAt: data.account.createdAt,
        })
      }
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(201,168,76,0.06) 0%, rgba(8,12,20,0.6) 100%)',
        border: '1px solid rgba(201,168,76,0.18)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[#C9A84C] text-sm font-black tracking-wider">ربط Tradovate</h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(201,168,76,0.5)' }}>
            TakeProfitTrader / Lucid / غيرها
          </p>
        </div>
        {account && (
          <span
            className="text-[10px] px-2 py-1 rounded-full font-bold"
            style={{
              background: account.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: account.isActive ? '#22c55e' : '#ef4444',
              border: `1px solid ${account.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {account.isActive ? '● متصل' : '● غير نشط'}
          </span>
        )}
      </div>

      {message && (
        <div
          className="rounded-lg p-3 mb-4 text-[11px]"
          style={{
            background: message.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: message.type === 'ok' ? '#4ade80' : '#f87171',
          }}
        >
          {message.text}
        </div>
      )}

      {account && !showForm && (
        <div className="space-y-3">
          <Row label="البيئة" value={account.env === 'LIVE' ? 'Live' : 'Demo'} />
          <Row
            label="آخر مزامنة"
            value={
              account.lastSyncAt
                ? new Date(account.lastSyncAt).toLocaleString('ar-SA')
                : 'لم تتم بعد'
            }
          />
          <Row label="الحالة" value={account.lastSyncStatus || '—'} />
          <Row label="صفقات مستوردة" value={account.importedTradesCount.toString()} />
          {account.lastErrorMessage && (
            <div
              className="rounded-lg p-2 text-[10px]"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              آخر خطأ: {account.lastErrorMessage}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 h-10 rounded-lg text-[11px] font-black tracking-wider disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #C9A84C, #B38E2A)',
                color: '#0A0F1A',
              }}
            >
              {syncing ? 'يزامن...' : '⟳ مزامنة الآن'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 h-10 rounded-lg text-[11px] font-bold"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#C9A84C',
              }}
            >
              تعديل
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 h-10 rounded-lg text-[11px] font-bold disabled:opacity-50"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171',
              }}
            >
              قطع
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-[10px] mb-1.5 font-bold" style={{ color: 'rgba(201,168,76,0.7)' }}>
              البيئة
            </label>
            <div className="flex gap-2">
              {(['LIVE', 'DEMO'] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, env: e }))}
                  className="flex-1 h-9 rounded-lg text-[11px] font-bold"
                  style={{
                    background:
                      form.env === e
                        ? 'linear-gradient(90deg, #C9A84C, #B38E2A)'
                        : 'rgba(201,168,76,0.06)',
                    color: form.env === e ? '#0A0F1A' : '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.25)',
                  }}
                >
                  {e === 'LIVE' ? 'Live (حقيقي)' : 'Demo (تجريبي)'}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Username (اسم المستخدم في Tradovate)"
            value={form.username}
            onChange={(v) => setForm((f) => ({ ...f, username: v }))}
            required
          />
          <Field
            label="كلمة المرور"
            type="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            required
          />
          <Field
            label="CID (Client ID من Tradovate)"
            value={form.cid}
            onChange={(v) => setForm((f) => ({ ...f, cid: v }))}
            required
          />
          <Field
            label="Secret (من Tradovate)"
            type="password"
            value={form.secret}
            onChange={(v) => setForm((f) => ({ ...f, secret: v }))}
            required
          />
          <details className="text-[10px]">
            <summary className="cursor-pointer" style={{ color: 'rgba(201,168,76,0.6)' }}>
              حقول اختيارية (App ID / Device ID)
            </summary>
            <div className="mt-2 space-y-2">
              <Field
                label="App ID"
                value={form.appId}
                onChange={(v) => setForm((f) => ({ ...f, appId: v }))}
              />
              <Field
                label="Device ID"
                value={form.deviceId}
                onChange={(v) => setForm((f) => ({ ...f, deviceId: v }))}
              />
            </div>
          </details>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-lg text-[11px] font-black tracking-wider disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #C9A84C, #B38E2A)',
                color: '#0A0F1A',
              }}
            >
              {loading ? 'يتحقق...' : account ? 'تحديث الاتصال' : 'ربط الحساب'}
            </button>
            {account && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 h-10 rounded-lg text-[11px] font-bold"
                style={{
                  background: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  color: '#C9A84C',
                }}
              >
                إلغاء
              </button>
            )}
          </div>

          <div
            className="rounded-lg p-3 text-[10px] leading-relaxed mt-3"
            style={{
              background: 'rgba(201,168,76,0.04)',
              border: '1px solid rgba(201,168,76,0.15)',
              color: 'rgba(201,168,76,0.7)',
            }}
          >
            <p className="font-bold mb-1" style={{ color: '#C9A84C' }}>
              كيف تحصل على CID + Secret؟
            </p>
            <p>
              ادخل على <span className="font-mono" style={{ color: '#C9A84C' }}>trader.tradovate.com</span> →
              Settings → API Access → Generate Credentials. إذا الخيار مش متاح، تواصل مع دعم شركة البروب
              (TakeProfitTrader / Lucid) واطلب تفعيل الـ API للاستخدام في أدوات Journaling.
            </p>
            <p className="mt-2">
              🔒 بياناتك مشفّرة بـ AES-256. نطلب صلاحيات قراءة فقط — لا يتم تنفيذ أي أوامر تداول.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: 'rgba(201,168,76,0.55)' }}>{label}</span>
      <span className="font-bold" style={{ color: '#F5F5DC' }}>
        {value}
      </span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] mb-1.5 font-bold" style={{ color: 'rgba(201,168,76,0.7)' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-9 px-3 rounded-lg text-[11px] outline-none"
        style={{
          background: 'rgba(8,12,20,0.6)',
          border: '1px solid rgba(201,168,76,0.2)',
          color: '#F5F5DC',
        }}
      />
    </div>
  )
}
