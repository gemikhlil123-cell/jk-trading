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
      <div className="text-[#EDEBE4]/60 text-sm">
        {role === 'MENTOR' && (
          <span className="bg-[#EDEBE4]/10 text-[#EDEBE4] border border-[#EDEBE4]/20 text-xs px-2 py-0.5 rounded-full">
            مدرب
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#EDEBE4]/5 border border-[#1D3461]">
          <div className="w-6 h-6 rounded-full bg-[#EDEBE4]/20 flex items-center justify-center">
            <User size={12} className="text-[#EDEBE4]/80" />
          </div>
          <span className="text-[#EDEBE4]/80 text-sm">{userName || 'تاجر'}</span>
        </div>
      </div>
    </header>
  )
}
