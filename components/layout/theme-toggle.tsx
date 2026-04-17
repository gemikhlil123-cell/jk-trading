'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem('jk-theme')) as Theme | null
    const initial = stored === 'light' ? 'light' : 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { window.localStorage.setItem('jk-theme', next) } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg text-[#F5F5DC]/50 hover:text-[#D4AF37] hover:bg-[#F5F5DC]/5 transition-colors"
      aria-label="toggle theme"
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
