'use client'

import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface EntryReason {
  id: string
  category: string
  name: string
}

interface EntryReasonSelectProps {
  reasons: EntryReason[]
  value: string[]
  onChange: (ids: string[]) => void
  error?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  SMT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PSP: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Price Action': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'FVG/IFVG': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  CISD: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
}

const CATEGORY_LABELS: Record<string, string> = {
  SMT: 'SMT',
  PSP: 'PSP',
  'Price Action': 'حركة السعر',
  'FVG/IFVG': 'FVG / IFVG',
  CISD: 'CISD',
}

export function EntryReasonSelect({
  reasons,
  value,
  onChange,
  error,
}: EntryReasonSelectProps) {
  const [open, setOpen] = useState(false)

  const grouped = reasons.reduce<Record<string, EntryReason[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  const selectedReasons = reasons.filter((r) => value.includes(r.id))

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'w-full min-h-[42px] px-3 py-2 rounded-lg border bg-[#112240] text-right flex items-start gap-2 flex-wrap transition-colors',
            error
              ? 'border-red-500/50'
              : open
              ? 'border-[#F5F5DC]/50'
              : 'border-[#1D3461] hover:border-[#F5F5DC]/30'
          )}
        >
            {selectedReasons.length === 0 ? (
              <span className="text-[#F5F5DC]/30 text-sm flex-1">
                اختر أسباب الدخول (إلزامي)
              </span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedReasons.map((r) => (
                  <span
                    key={r.id}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border',
                      CATEGORY_COLORS[r.category] || 'bg-[#F5F5DC]/10 text-[#F5F5DC] border-[#F5F5DC]/20'
                    )}
                  >
                    {r.name}
                    <button
                      type="button"
                      onClick={(e) => remove(r.id, e)}
                      className="opacity-60 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <ChevronDown
              size={16}
              className={cn(
                'text-[#F5F5DC]/40 flex-shrink-0 mt-0.5 transition-transform',
                open && 'rotate-180'
              )}
            />
        </PopoverTrigger>

        <PopoverContent
          className="w-[420px] p-0 bg-[#112240] border-[#1D3461] shadow-xl"
          align="start"
          sideOffset={4}
        >
          <div className="max-h-[400px] overflow-y-auto p-2 space-y-3">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-[#F5F5DC]/40 uppercase tracking-wider px-2 mb-1.5">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((item) => {
                    const selected = value.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors',
                          selected
                            ? cn(
                                'border',
                                CATEGORY_COLORS[category] ||
                                  'bg-[#F5F5DC]/10 text-[#F5F5DC] border-[#F5F5DC]/30'
                              )
                            : 'text-[#F5F5DC]/70 hover:bg-[#F5F5DC]/5 hover:text-[#F5F5DC]'
                        )}
                      >
                        <span
                          className={cn(
                            'w-4 h-4 rounded flex items-center justify-center border flex-shrink-0',
                            selected
                              ? 'bg-[#F5F5DC]/20 border-[#F5F5DC]/40'
                              : 'border-[#F5F5DC]/20'
                          )}
                        >
                          {selected && (
                            <Check size={10} className="text-[#F5F5DC]" />
                          )}
                        </span>
                        {item.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {value.length > 0 && (
            <div className="border-t border-[#1D3461] p-2 flex justify-between items-center">
              <span className="text-[#F5F5DC]/50 text-xs">
                {value.length} محدد
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                مسح الكل
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
