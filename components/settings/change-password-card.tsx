'use client'

/**
 * Lets a signed-in user change their own password — including replacing the
 * temporary one a mentor gave them after a reset.
 */
import { useState, type FormEvent } from 'react'
import { checkPassword, PASSWORD_MIN_LENGTH, PASSWORD_PROBLEM_TEXT } from '@/lib/password-policy'

type Message = { type: 'ok' | 'err'; text: string }

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] mb-1.5 font-bold" style={{ color: 'rgba(201,168,76,0.7)' }}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full h-9 px-3 rounded-lg text-[12px] outline-none"
        style={{ background: 'rgba(8,12,20,0.6)', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F5DC' }}
      />
    </div>
  )
}

export function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)

    const problem = checkPassword(next)
    if (problem) {
      setMessage({ type: 'err', text: PASSWORD_PROBLEM_TEXT[problem] })
      return
    }
    if (next !== confirm) {
      setMessage({ type: 'err', text: 'كلمتا المرور الجديدتان غير متطابقتين.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      if (res.ok) {
        setMessage({ type: 'ok', text: 'تم تغيير كلمة المرور.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setMessage({ type: 'err', text: data?.error ?? 'تعذّر تغيير كلمة المرور. حاول مرة أخرى.' })
      }
    } catch {
      setMessage({ type: 'err', text: 'تعذّر الاتصال بالخادم. حاول مرة أخرى.' })
    } finally {
      setSaving(false)
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
      <h2 className="text-[#C9A84C] text-sm font-black tracking-wider">كلمة المرور</h2>
      <p className="text-[11px] leading-relaxed mt-1 mb-4" style={{ color: '#8899BB' }}>
        غيّر كلمة مرورك — {PASSWORD_MIN_LENGTH} أحرف على الأقل. إذا أعطاك المدرّب كلمة مؤقتة، استبدلها هنا.
      </p>

      {message && (
        <div
          role={message.type === 'err' ? 'alert' : 'status'}
          className="rounded-lg p-3 mb-4 text-[11px]"
          style={{
            background: message.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: message.type === 'ok' ? '#22c55e' : '#ef4444',
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <PasswordField id="pw-current" label="كلمة المرور الحالية" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField id="pw-new" label="كلمة المرور الجديدة" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField id="pw-confirm" label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <button
          type="submit"
          disabled={saving}
          className="w-full h-10 rounded-lg text-[12px] font-black disabled:opacity-60"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #B38E2A)', color: '#0A0F1A' }}
        >
          {saving ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}
        </button>
      </form>
    </div>
  )
}
