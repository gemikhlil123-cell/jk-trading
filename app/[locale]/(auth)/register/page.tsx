import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#112240] border border-[#1D3461] rounded-2xl p-8 shadow-2xl">
        <RegisterForm />
      </div>
    </div>
  )
}
