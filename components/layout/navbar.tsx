'use client'

import { User } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { ThemeToggle } from './theme-toggle'

interface NavbarProps {
  userName?: string | null
  role?: string
}

export function Navbar({ userName, role }: NavbarProps) {

  return (
    <header className="h-14 bg-[#0D2137] border-b border-[#1D3461] flex items-center justify-between px-5">
      <div className="text-[#F5F5DC]/60 text-sm">
        {role === 'MENTOR' && (
          <span className="bg-[#F5F5DC]/10 text-[#F5F5DC] border border-[#F5F5DC]/20 text-xs px-2 py-0.5 rounded-full">
            مدرب
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#F5F5DC]/5 border border-[#1D3461]">
          <div className="w-6 h-6 rounded-full bg-[#F5F5DC]/20 flex items-center justify-center">
            <User size={12} className="text-[#F5F5DC]/80" />
          </div>
          <span className="text-[#F5F5DC]/80 text-sm">{userName || 'تاجر'}</span>
        </div>
      </div>
    </header>
  )
}
