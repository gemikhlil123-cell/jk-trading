'use client'

import { useState } from 'react'

const SLOT_LABELS: Record<string, string> = {
  daily: 'يومي',
  h4: '4 ساعات',
  h1: 'ساعة',
  m15: '15 دقيقة',
  m5: '5 دقائق',
  m1: 'دقيقة',
  chart: 'الشارت',
}

interface Props {
  raw: string
}

export function StudentTradeChartImages({ raw }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  let images: Record<string, string> = {}
  try {
    images = JSON.parse(raw)
  } catch {
    return null
  }

  const entries = Object.entries(images).filter(([, v]) => typeof v === 'string' && v.length > 0)
  if (entries.length === 0) return null

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)`,
          gap: 6,
          marginBottom: 8,
        }}
      >
        {entries.map(([slot, src]) => (
          <button
            key={slot}
            type="button"
            onClick={() => setLightbox(src)}
            style={{
              position: 'relative',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 8,
              overflow: 'hidden',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              aspectRatio: '4 / 3',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={SLOT_LABELS[slot] ?? slot}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                color: '#D4AF37',
                fontSize: 9,
                fontWeight: 800,
                padding: '4px 6px',
                textAlign: 'center',
              }}
            >
              {SLOT_LABELS[slot] ?? slot}
            </span>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="chart"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  )
}
