'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { jerusalemWallToUTC } from '@/lib/timezone'

const symbols = ['NQ', 'ES', 'BTC', 'XAU', 'GC', 'CL', 'EURUSD', 'OTHER']
const symbolLabels: Record<string, string> = {
  NQ: 'ناسداك NQ', ES: 'S&P 500 ES', BTC: 'بيتكوين', XAU: 'ذهب XAU',
  GC: 'ذهب آجل GC', CL: 'نفط CL', EURUSD: 'يورو/دولار', OTHER: 'أخرى',
}

interface Props {
  locale: string
}

export function NewSessionForm({ locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('NQ')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !startDate || !endDate) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/backtest-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          // Treat date-only input as Jerusalem midnight (start) / end-of-day (end)
          startDate: jerusalemWallToUTC(`${startDate}T00:00`).toISOString(),
          endDate: jerusalemWallToUTC(`${endDate}T23:59`).toISOString(),
        }),
      })

      if (!res.ok) {
        setError('حدث خطأ في إنشاء الجلسة')
        setLoading(false)
        return
      }

      const data = await res.json()
      router.push(`/${locale}/backtest/${data.id}`)
    } catch {
      setError('حدث خطأ في الاتصال')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-[#C8D8EE]/70 text-sm">
          اسم الجلسة <span className="text-red-400">*</span>
        </Label>
        <Input
          placeholder="مثال: باكتيست لندن يناير 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#111D2E] border-[rgba(212,175,55,0.18)] text-[#C8D8EE] placeholder:text-[#C8D8EE]/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[#C8D8EE]/70 text-sm">الرمز</Label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full bg-[#111D2E] border border-[rgba(212,175,55,0.18)] text-[#C8D8EE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5F5DC]/50"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{symbolLabels[s]}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[#C8D8EE]/70 text-sm">
            تاريخ البداية <span className="text-red-400">*</span>
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#111D2E] border-[rgba(212,175,55,0.18)] text-[#C8D8EE]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[#C8D8EE]/70 text-sm">
            تاريخ النهاية <span className="text-red-400">*</span>
          </Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#111D2E] border-[rgba(212,175,55,0.18)] text-[#C8D8EE]"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 border-[rgba(212,175,55,0.18)] text-[#C8D8EE]/60 hover:text-[#C8D8EE] bg-transparent hover:bg-[#111D2E]"
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 gold-btn text-[#080C14] hover:opacity-90 font-semibold"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء الجلسة'}
        </Button>
      </div>
    </form>
  )
}
