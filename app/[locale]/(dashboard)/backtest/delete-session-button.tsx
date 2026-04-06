'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  sessionId: string
  locale?: string
}

export function DeleteSessionButton({ sessionId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('هل أنت متأكد من حذف هذه الجلسة وجميع صفقاتها؟')) return

    setLoading(true)
    try {
      await fetch(`/api/backtest-sessions/${sessionId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-[#C8D8EE]/30 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
      title="حذف الجلسة"
    >
      <Trash2 size={14} />
    </button>
  )
}
