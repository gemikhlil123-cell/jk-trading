'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
}

const SLOTS = [
  { key: 'daily', label: 'Daily / 6H / 4H' },
  { key: 'h1',    label: '1H' },
  { key: 'm15',   label: '15M' },
  { key: 'm5',    label: '5M' },
]

async function compressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const maxW = 900
      let w = img.width
      let h = img.height
      if (w > maxW) {
        h = Math.round((h * maxW) / w)
        w = maxW
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no ctx')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = reject
    img.src = url
  })
}

export function ChartImages({ value, onChange }: Props) {
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const showNotif = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 2800)
  }

  const setSlotImage = useCallback(
    (key: string, dataUrl: string) => {
      onChange({ ...value, [key]: dataUrl })
    },
    [value, onChange]
  )

  const removeSlotImage = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  // Global paste handler
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find((i) => i.type.startsWith('image/'))
      if (!imageItem) return

      e.preventDefault()
      const blob = imageItem.getAsFile()
      if (!blob) return

      try {
        const compressed = await compressImage(blob)

        // Auto-fill first empty slot
        const emptySlot = SLOTS.find((s) => !value[s.key])
        if (emptySlot) {
          setSlotImage(emptySlot.key, compressed)
          showNotif(`تم لصق الصورة في: ${emptySlot.label}`)
        } else {
          // All slots full — store pending and notify user
          setPendingImage(compressed)
          showNotif('صورة جُهّزت للصق — اختر الإطار')
        }
      } catch {
        showNotif('فشل معالجة الصورة')
      }
    }

    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [value, setSlotImage])

  const handleFileChange = async (key: string, file: File) => {
    try {
      const compressed = await compressImage(file)
      setSlotImage(key, compressed)
    } catch {
      showNotif('فشل تحميل الصورة')
    }
  }

  const handleSlotClick = (key: string) => {
    if (pendingImage) {
      // Place pending pasted image into this slot
      setSlotImage(key, pendingImage)
      setPendingImage(null)
      showNotif('تم وضع الصورة')
      return
    }
    setActiveSlot(key)
    fileInputRefs.current[key]?.click()
  }

  return (
    <div className="relative">
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.4)',
            color: '#D4AF37',
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 8,
            zIndex: 50,
            whiteSpace: 'nowrap',
          }}
        >
          {notification}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {SLOTS.map((slot) => {
          const img = value[slot.key]
          const isActive = activeSlot === slot.key || (pendingImage !== null)

          return (
            <div
              key={slot.key}
              onClick={() => handleSlotClick(slot.key)}
              style={{
                aspectRatio: '16/10',
                position: 'relative',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                border: isActive
                  ? '1px solid #D4AF37'
                  : '1px dashed rgba(212,175,55,0.3)',
                background: '#0D1520',
                transition: 'border-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.65)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.3)'
                }
              }}
            >
              {img ? (
                <>
                  <img
                    src={img}
                    alt={slot.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSlotImage(slot.key)
                    }}
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      background: 'rgba(231,76,60,0.85)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                  {/* Label overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '6px 8px 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#D4AF37',
                    }}
                  >
                    {slot.label}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: 10,
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.45)" strokeWidth="1.8">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4A5A7A', textAlign: 'center' }}>
                    {slot.label}
                  </span>
                  <span style={{ fontSize: 9, color: '#4A5A7A', opacity: 0.7 }}>
                    انقر أو Ctrl+V
                  </span>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={(el) => { fileInputRefs.current[slot.key] = el }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileChange(slot.key, file)
                  // Reset input so same file can be re-selected
                  e.target.value = ''
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )
        })}
      </div>

      {pendingImage && (
        <p style={{ fontSize: 11, color: '#D4AF37', textAlign: 'center', marginTop: 6, opacity: 0.8 }}>
          صورة في الحافظة — انقر على الإطار المطلوب لوضعها
        </p>
      )}
    </div>
  )
}
