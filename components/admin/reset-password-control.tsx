'use client'

/**
 * Mentor-only control: set a new password for a student who is locked out.
 *
 * Renders a button plus, when open, a full-width panel — so it can sit inside any
 * wrapping flex row of actions. The temporary password is generated or typed here,
 * in the mentor's browser, and stays on screen until the panel is closed so it can
 * be copied and sent to the student.
 */
import { useState } from 'react'
import { checkPassword, generateTempPassword, PASSWORD_MIN_LENGTH, PASSWORD_PROBLEM_TEXT } from '@/lib/password-policy'

const GOLD = '#C29B4A'

const smallButton = {
  padding: '9px 14px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
} as const

export function ResetPasswordControl({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  function close() {
    setOpen(false)
    setPassword('')
    setError('')
    setDone(false)
    setCopied(false)
  }

  async function save() {
    const problem = checkPassword(password)
    if (problem) {
      setError(PASSWORD_PROBLEM_TEXT[problem])
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'تعذّر تعيين كلمة المرور. حاول مرة أخرى.')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      // Clipboard access can be refused; the password stays visible to copy by hand.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        style={{
          ...smallButton,
          padding: '10px 14px',
          border: '1px solid rgba(194,155,74,0.35)',
          background: open ? 'rgba(194,155,74,0.16)' : 'rgba(194,155,74,0.08)',
          color: GOLD,
        }}
      >
        🔑 كلمة مرور جديدة
      </button>

      {open && (
        <div
          dir="rtl"
          style={{
            flexBasis: '100%',
            width: '100%',
            marginTop: '4px',
            padding: '14px',
            borderRadius: '14px',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(194,155,74,0.2)',
          }}
        >
          {!done ? (
            <>
              <p style={{ color: '#E8DEB8', fontSize: '13px', fontWeight: 800, margin: 0 }}>
                كلمة مرور جديدة لـ {userName}
              </p>
              <p style={{ color: '#8899BB', fontSize: '11px', margin: '6px 0 12px', lineHeight: 1.7 }}>
                كلمة المرور القديمة لا يمكن استرجاعها — تُستبدل فقط. اكتب كلمة مؤقتة ({PASSWORD_MIN_LENGTH} أحرف على الأقل) أو ولّد واحدة.
              </p>
              <input
                type="text"
                dir="ltr"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                aria-label={`كلمة مرور جديدة لـ ${userName}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="كلمة المرور المؤقتة"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  letterSpacing: '0.5px',
                  color: '#EDEBE4',
                  background: 'rgba(8,12,20,0.7)',
                  border: '1px solid rgba(194,155,74,0.25)',
                  outline: 'none',
                }}
              />
              {error && (
                <p role="alert" style={{ color: '#BB5B5B', fontSize: '11.5px', margin: '8px 0 0' }}>
                  {error}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(generateTempPassword())
                    setError('')
                  }}
                  style={{ ...smallButton, border: '1px solid rgba(194,155,74,0.3)', background: 'rgba(194,155,74,0.08)', color: GOLD }}
                >
                  توليد كلمة مؤقتة
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !password}
                  style={{
                    ...smallButton,
                    border: '1px solid rgba(78,158,122,0.4)',
                    background: 'rgba(78,158,122,0.12)',
                    color: '#4E9E7A',
                    opacity: saving || !password ? 0.5 : 1,
                    cursor: saving || !password ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  style={{ ...smallButton, border: '1px solid rgba(74,90,122,0.3)', background: 'rgba(74,90,122,0.1)', color: '#8899BB' }}
                >
                  إلغاء
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: '#4E9E7A', fontSize: '13px', fontWeight: 800, margin: 0 }}>
                تم تعيين كلمة المرور الجديدة لـ {userName}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  margin: '12px 0',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(8,12,20,0.7)',
                  border: '1px solid rgba(78,158,122,0.3)',
                }}
              >
                <span
                  dir="ltr"
                  style={{
                    color: '#EDEBE4',
                    fontSize: '16px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    letterSpacing: '0.5px',
                    overflowWrap: 'anywhere',
                    userSelect: 'all',
                  }}
                >
                  {password}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  style={{ ...smallButton, flexShrink: 0, border: '1px solid rgba(194,155,74,0.3)', background: 'rgba(194,155,74,0.08)', color: GOLD }}
                >
                  {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
              <p style={{ color: '#8899BB', fontSize: '11px', margin: '0 0 12px', lineHeight: 1.7 }}>
                أرسلها للطالب عبر قناة تعرف أنها له (واتساب مثلاً)، واطلب منه تغييرها من صفحة الإعدادات بعد الدخول.
                لن تظهر مرة أخرى بعد الإغلاق.
              </p>
              <button
                type="button"
                onClick={close}
                style={{ ...smallButton, border: '1px solid rgba(74,90,122,0.3)', background: 'rgba(74,90,122,0.1)', color: '#8899BB' }}
              >
                إغلاق
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
