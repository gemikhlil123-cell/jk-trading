'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MentorCommentForm({ tradeId }: { tradeId: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    const body = text.trim()
    if (!body || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/mentor/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, body }),
      })
      if (res.ok) {
        setText('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="اكتب تعليقك للطالب..."
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(194,155,74,0.15)',
          borderRadius: 8,
          padding: '8px 10px',
          color: '#C8D8EE',
          fontSize: 12,
          fontFamily: 'Cairo, sans-serif',
          outline: 'none',
        }}
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        style={{
          padding: '8px 14px',
          background: 'linear-gradient(135deg, #8A6A1F, #C29B4A)',
          color: '#080C14',
          border: 'none',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !text.trim() ? 0.5 : 1,
          fontFamily: 'Cairo, sans-serif',
        }}
      >
        {loading ? '...' : 'إرسال'}
      </button>
    </div>
  )
}
