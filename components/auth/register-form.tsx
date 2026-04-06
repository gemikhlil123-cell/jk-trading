'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const locale = useLocale()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || name.length < 2) return setError('الاسم يجب أن يكون أكثر من حرفين')
    if (!email || !email.includes('@')) return setError('بريد إلكتروني غير صحيح')
    if (!password || password.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error || 'حدث خطأ في إنشاء الحساب')
        return
      }
      router.push(`/${locale}/login?registered=1`)
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#F5F5DC] flex items-center justify-center mx-auto mb-4">
          <span className="text-[#0A192F] font-bold text-lg">JK</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F5F5DC]">إنشاء حساب</h1>
        <p className="text-[#F5F5DC]/60 text-sm mt-1">JK Trading Journal</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[#F5F5DC]/80 text-sm block">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="اسمك الكامل"
            className="w-full bg-[#112240] border border-[#1D3461] text-[#F5F5DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5F5DC]/50 placeholder:text-[#F5F5DC]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#F5F5DC]/80 text-sm block">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="trader@example.com"
            className="w-full bg-[#112240] border border-[#1D3461] text-[#F5F5DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5F5DC]/50 placeholder:text-[#F5F5DC]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#F5F5DC]/80 text-sm block">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#112240] border border-[#1D3461] text-[#F5F5DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5F5DC]/50 placeholder:text-[#F5F5DC]/30"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F5F5DC] text-[#0A192F] hover:bg-[#E8E8C0] font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
        </button>
      </form>

      <p className="text-center text-[#F5F5DC]/50 text-sm mt-6">
        لديك حساب؟{' '}
        <Link href={`/${locale}/login`} className="text-[#F5F5DC] hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  )
}
