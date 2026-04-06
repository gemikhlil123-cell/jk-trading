import { LoginForm } from '@/components/auth/login-form'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: '#080C14' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 30%, rgba(212,175,55,0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(212,175,55,0.03) 0%, transparent 60%)',
        }}
      />
      <div className="w-full max-w-[400px] relative z-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
