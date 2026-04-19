'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EntryReasonSelect, type EntryReason } from '@/components/trade/entry-reason-select'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { jerusalemWallToUTC } from '@/lib/timezone'

const schema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive('أدخل سعر دخول صحيح'),
  exitPrice: z.number().positive().optional(),
  entryTime: z.string().min(1, 'أدخل وقت الدخول'),
  exitTime: z.string().optional(),
  pnl: z.number().optional(),
  rrAchieved: z.number().optional(),
  rrPlanned: z.number().optional(),
  notes: z.string().optional(),
  entryReasonIds: z.array(z.string()).min(1, 'يجب اختيار سبب دخول واحد على الأقل'),
})

type FormData = z.infer<typeof schema>

interface Props {
  sessionId: string
  symbol: string
  entryReasons: EntryReason[]
  locale?: string
}

export function BacktestTradeForm({ sessionId, symbol, entryReasons }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'LONG', entryReasonIds: [] },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          symbol,
          isBacktest: true,
          backtestSessionId: sessionId,
          entryTime: jerusalemWallToUTC(data.entryTime).toISOString(),
          exitTime: data.exitTime ? jerusalemWallToUTC(data.exitTime).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        setError('حدث خطأ في حفظ الصفقة')
        setLoading(false)
        return
      }

      // Update session stats
      await fetch(`/api/backtest-sessions/${sessionId}/recalc`, { method: 'POST' })

      reset()
      router.refresh()
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Direction */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">الاتجاه</Label>
          <div className="flex gap-2">
            <label className="flex-1">
              <input type="radio" value="LONG" {...register('direction')} className="sr-only peer" />
              <div className="peer-checked:bg-green-500/20 peer-checked:border-green-500/50 peer-checked:text-green-400 border border-[#1D3461] rounded-lg px-2 py-2 text-xs text-center cursor-pointer text-[#F5F5DC]/60 hover:bg-[#112240] transition-colors">
                شراء
              </div>
            </label>
            <label className="flex-1">
              <input type="radio" value="SHORT" {...register('direction')} className="sr-only peer" />
              <div className="peer-checked:bg-red-500/20 peer-checked:border-red-500/50 peer-checked:text-red-400 border border-[#1D3461] rounded-lg px-2 py-2 text-xs text-center cursor-pointer text-[#F5F5DC]/60 hover:bg-[#112240] transition-colors">
                بيع
              </div>
            </label>
          </div>
        </div>

        {/* Entry Price */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">سعر الدخول *</Label>
          <Input
            type="number" step="0.00001" placeholder="21000"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC] placeholder:text-[#F5F5DC]/20"
            {...register('entryPrice', { valueAsNumber: true })}
          />
          {errors.entryPrice && <p className="text-red-400 text-xs">{errors.entryPrice.message}</p>}
        </div>

        {/* Exit Price */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">سعر الخروج</Label>
          <Input
            type="number" step="0.00001" placeholder="21200"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC] placeholder:text-[#F5F5DC]/20"
            {...register('exitPrice', { valueAsNumber: true })}
          />
        </div>

        {/* PnL */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">PnL ($)</Label>
          <Input
            type="number" step="0.01" placeholder="250"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC] placeholder:text-[#F5F5DC]/20"
            {...register('pnl', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Entry Time */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">وقت الدخول *</Label>
          <Input
            type="datetime-local"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC]"
            {...register('entryTime')}
          />
          {errors.entryTime && <p className="text-red-400 text-xs">{errors.entryTime.message}</p>}
        </div>

        {/* Exit Time */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">وقت الخروج</Label>
          <Input
            type="datetime-local"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC]"
            {...register('exitTime')}
          />
        </div>

        {/* RR Achieved */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">RR المحقق</Label>
          <Input
            type="number" step="0.1" placeholder="2.5"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC] placeholder:text-[#F5F5DC]/20"
            {...register('rrAchieved', { valueAsNumber: true })}
          />
        </div>

        {/* RR Planned */}
        <div className="space-y-1.5">
          <Label className="text-[#F5F5DC]/70 text-sm">RR المخطط</Label>
          <Input
            type="number" step="0.1" placeholder="3.0"
            className="bg-[#112240] border-[#1D3461] text-[#F5F5DC] placeholder:text-[#F5F5DC]/20"
            {...register('rrPlanned', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Entry Reasons */}
      <div className="space-y-1.5">
        <Label className="text-[#F5F5DC]/70 text-sm">
          أسباب الدخول <span className="text-red-400">*</span>
        </Label>
        <Controller
          name="entryReasonIds"
          control={control}
          render={({ field }) => (
            <EntryReasonSelect
              reasons={entryReasons}
              value={field.value}
              onChange={field.onChange}
              error={errors.entryReasonIds?.message}
            />
          )}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-[#F5F5DC]/70 text-sm">ملاحظات</Label>
        <textarea
          rows={2}
          placeholder="ملاحظاتك عن هذه الصفقة..."
          className="w-full bg-[#112240] border border-[#1D3461] text-[#F5F5DC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5F5DC]/50 placeholder:text-[#F5F5DC]/20 resize-none"
          {...register('notes')}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="bg-[#F5F5DC] text-[#0A192F] hover:bg-[#E8E8C0] font-semibold px-8"
      >
        {loading ? 'جاري الإضافة...' : 'إضافة الصفقة'}
      </Button>
    </form>
  )
}
