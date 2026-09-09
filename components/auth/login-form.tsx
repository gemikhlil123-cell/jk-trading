'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const locale       = useLocale()
  const registered   = searchParams.get('registered')
  const callbackUrl  = searchParams.get('callbackUrl') || `/${locale}/checklist`

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('أدخل البريد الإلكتروني وكلمة المرور')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    else { router.push(callbackUrl); router.refresh() }
  }

  const ic = 'w-full bg-[#162035] border border-[rgba(194,155,74,0.2)] text-[#C8D8EE] rounded-xl px-4 py-3.5 text-sm font-[Cairo] outline-none transition-colors placeholder:text-[#4A5A7A] focus:border-[#C29B4A] mb-4 text-center direction-ltr'

  return (
    <div
      className="rounded-3xl p-8 w-full"
      style={{ background: '#0D1520', border: '1px solid rgba(194,155,74,0.25)' }}
    >
      {/* Logo */}
      <div className="text-center mb-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="JK Trading"
          className="w-24 h-24 rounded-2xl mx-auto mb-3.5 object-contain"
          style={{ filter: 'drop-shadow(0 0 16px rgba(194,155,74,0.5))', border: '1px solid rgba(194,155,74,0.2)' }}
        />
        <h1 className="text-[22px] font-black text-[#C29B4A] tracking-widest">JK TRADING</h1>
        <p className="text-[#4A5A7A] text-xs mt-1">سجّل، حلّل، تحسّن</p>
      </div>

      {registered && (
        <div className="bg-[rgba(78,158,122,0.1)] border border-[rgba(78,158,122,0.3)] rounded-xl p-3 text-[#4E9E7A] text-xs text-center mb-5">
          تم إنشاء الحساب بنجاح — سجّل دخولك الآن
        </div>
      )}

      <form onSubmit={onSubmit}>
        <label className="block text-[11px] font-bold text-[#C29B4A] tracking-widest mb-2">
          البريد الإلكتروني
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="trader@example.com"
          className={ic}
          style={{ direction: 'ltr' }}
        />

        <label className="block text-[11px] font-bold text-[#C29B4A] tracking-widest mb-2">
          كلمة المرور
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className={ic}
          style={{ direction: 'ltr' }}
        />

        {error && (
          <div className="bg-[rgba(187,91,91,0.1)] border border-[rgba(187,91,91,0.3)] rounded-xl p-3 text-[#BB5B5B] text-xs text-center mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center gap-1.5 mb-4">
            {[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-[#C29B4A]"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="gold-btn w-full py-3.5 rounded-xl text-[15px] tracking-wide disabled:opacity-60"
        >
          دخول
        </button>
      </form>

      <p className="text-center text-[#4A5A7A] text-xs mt-6">
        ليس لديك حساب؟{' '}
        <Link href={`/${locale}/register`} className="text-[#C29B4A] hover:underline font-semibold">
          إنشاء حساب
        </Link>
      </p>

      <p className="text-center text-[10px] text-[#2A3A5A] mt-4">
        © 2026 <span className="text-[#C29B4A]">JK Trading</span>
      </p>
    </div>
  )
}
