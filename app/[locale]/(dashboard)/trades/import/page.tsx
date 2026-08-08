'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type DryRunResult = {
  dryRun: true
  totalRows: number
  validRows: number
  errorCount: number
  errors: { line: number; msg: string }[]
  sample: any[]
}

type ImportResult = {
  inserted: number
  totalRows: number
  errorCount: number
  errors: { line: number; msg: string }[]
}

export default function ImportTradesPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handlePreview() {
    if (!file) { setError('اختر ملف أولاً'); return }
    setLoading(true); setError(null); setDryRun(null); setImportResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dryRun', 'true')
      const res = await fetch('/api/trades/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'فشل التحقق'); return }
      setDryRun(data)
    } catch (e: any) {
      setError(e.message || 'حدث خطأ')
    } finally { setLoading(false) }
  }

  async function handleImport() {
    if (!file) return
    if (!confirm('هل أنت متأكد من رفع الصفقات إلى قاعدة البيانات؟')) return
    setLoading(true); setError(null); setImportResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/trades/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'فشل الاستيراد'); return }
      setImportResult(data)
    } catch (e: any) {
      setError(e.message || 'حدث خطأ')
    } finally { setLoading(false) }
  }

  function reset() {
    setFile(null); setDryRun(null); setImportResult(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const canImport = dryRun && dryRun.validRows > 0

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', marginBottom: 4 }}>
        استيراد الصفقات من CSV
      </h1>
      <p style={{ fontSize: 12, color: '#8899BB', marginBottom: 20 }}>
        ارفع ملف CSV يحتوي على بيانات الصفقات. سيتم التحقق منه قبل الإدخال.
      </p>

      {/* File picker */}
      <div style={{
        background: '#112240',
        border: '1px solid #1F2D4A',
        borderRadius: 10,
        padding: 18,
        marginBottom: 16,
      }}>
        <label style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600, marginBottom: 8, display: 'block' }}>
          1. اختر الملف
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setDryRun(null); setImportResult(null); setError(null) }}
          style={{
            display: 'block', width: '100%',
            padding: '10px', borderRadius: 8,
            background: '#0A192F', border: '1px solid #1F2D4A',
            color: '#E6F0FF', fontSize: 13,
          }}
        />
        {file && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#8899BB' }}>
            ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={handlePreview}
            disabled={!file || loading}
            style={{
              padding: '10px 18px', borderRadius: 8,
              background: '#D4AF37', color: '#0A192F',
              border: 'none', fontWeight: 700, fontSize: 13,
              cursor: file && !loading ? 'pointer' : 'not-allowed',
              opacity: file && !loading ? 1 : 0.4,
            }}
          >
            {loading ? 'جاري التحقق...' : '🔍 معاينة وفحص الملف'}
          </button>
          <button
            onClick={reset}
            disabled={loading}
            style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'transparent', color: '#8899BB',
              border: '1px solid #1F2D4A', fontSize: 13, cursor: 'pointer',
            }}
          >
            مسح
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#3A1A1A', border: '1px solid #6B2B2B',
          borderRadius: 8, padding: 12, color: '#FF6B6B',
          fontSize: 13, marginBottom: 16,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Dry-run preview */}
      {dryRun && !importResult && (
        <div style={{
          background: '#112240', border: '1px solid #1F2D4A',
          borderRadius: 10, padding: 18, marginBottom: 16,
        }}>
          <label style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600, marginBottom: 12, display: 'block' }}>
            2. نتيجة المعاينة
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <Stat label="الصفوف الكلية" value={dryRun.totalRows} color="#E6F0FF" />
            <Stat label="صفوف صالحة" value={dryRun.validRows} color="#10B981" />
            <Stat label="أخطاء" value={dryRun.errorCount} color={dryRun.errorCount > 0 ? '#F87171' : '#8899BB'} />
          </div>

          {dryRun.errors.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#F87171', marginBottom: 8 }}>
                عرض {dryRun.errors.length} خطأ
              </summary>
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                background: '#0A192F', padding: 10, borderRadius: 6,
                fontSize: 11, fontFamily: 'monospace', color: '#F87171',
              }}>
                {dryRun.errors.map((e, i) => (
                  <div key={i}>سطر {e.line}: {e.msg}</div>
                ))}
              </div>
            </details>
          )}

          {dryRun.sample.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#8899BB', marginBottom: 8 }}>
                عينة من البيانات (أول 3 صفقات)
              </summary>
              <pre style={{
                background: '#0A192F', padding: 10, borderRadius: 6,
                fontSize: 11, color: '#A7B3CC', overflow: 'auto',
              }}>
                {JSON.stringify(dryRun.sample, null, 2)}
              </pre>
            </details>
          )}

          <button
            onClick={handleImport}
            disabled={!canImport || loading}
            style={{
              padding: '12px 22px', borderRadius: 8,
              background: canImport ? '#10B981' : '#1F2D4A',
              color: canImport ? '#fff' : '#8899BB',
              border: 'none', fontWeight: 700, fontSize: 14,
              cursor: canImport && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'جاري الرفع...' : `✓ تأكيد ورفع ${dryRun.validRows} صفقة`}
          </button>
        </div>
      )}

      {/* Final result */}
      {importResult && (
        <div style={{
          background: 'linear-gradient(135deg, #0F2A1A 0%, #112240 100%)',
          border: '1px solid #10B981',
          borderRadius: 10, padding: 22,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', marginBottom: 10 }}>
            ✅ تم الاستيراد بنجاح
          </div>
          <div style={{ fontSize: 13, color: '#E6F0FF', lineHeight: 1.8 }}>
            تم إدخال <b style={{ color: '#D4AF37' }}>{importResult.inserted}</b> صفقة من أصل {importResult.totalRows}.
            {importResult.errorCount > 0 && <> ({importResult.errorCount} خطأ تم تجاوزها)</>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => router.push('/ar/analytics')}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: '#D4AF37', color: '#0A192F',
                border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              عرض التحليل
            </button>
            <button
              onClick={() => router.push('/ar/trades')}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: 'transparent', color: '#E6F0FF',
                border: '1px solid #1F2D4A', fontSize: 13, cursor: 'pointer',
              }}
            >
              عرض الصفقات
            </button>
            <button
              onClick={reset}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: 'transparent', color: '#8899BB',
                border: '1px solid #1F2D4A', fontSize: 13, cursor: 'pointer',
              }}
            >
              استيراد ملف آخر
            </button>
          </div>
        </div>
      )}

      {/* Format help */}
      <details style={{ marginTop: 20, color: '#8899BB' }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#D4AF37' }}>
          📋 شكل ملف CSV المطلوب
        </summary>
        <div style={{
          marginTop: 12,
          background: '#112240', border: '1px solid #1F2D4A',
          borderRadius: 8, padding: 14,
          fontSize: 12, lineHeight: 1.8,
        }}>
          <p>السطر الأول يجب أن يكون عناوين الأعمدة. الأعمدة المطلوبة:</p>
          <ul style={{ marginRight: 18, marginTop: 8 }}>
            <li><code style={{ color: '#D4AF37' }}>symbol</code> — NQ / ES / BTC / XAU / GC / CL / EURUSD / OTHER</li>
            <li><code style={{ color: '#D4AF37' }}>direction</code> — LONG / SHORT</li>
            <li><code style={{ color: '#D4AF37' }}>entryPrice</code>, <code style={{ color: '#D4AF37' }}>exitPrice</code></li>
            <li><code style={{ color: '#D4AF37' }}>entryTime</code>, <code style={{ color: '#D4AF37' }}>exitTime</code> — ISO UTC (مثال: 2026-05-11T14:23:00.000Z)</li>
            <li>أو بدلاً عنها: <code style={{ color: '#D4AF37' }}>dateLocal</code> (YYYY-MM-DD) + <code style={{ color: '#D4AF37' }}>entryTimeLocal</code> (HH:mm) بتوقيت القدس</li>
            <li><code style={{ color: '#D4AF37' }}>pnl</code>, <code style={{ color: '#D4AF37' }}>rrPlanned</code>, <code style={{ color: '#D4AF37' }}>rrAchieved</code></li>
            <li><code style={{ color: '#D4AF37' }}>isBacktest</code> — true / false</li>
            <li><code style={{ color: '#D4AF37' }}>entryReasons</code> — أسماء أسباب الدخول مفصولة بـ <code>;</code></li>
            <li><code style={{ color: '#D4AF37' }}>notes</code> — اختياري</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            <b style={{ color: '#D4AF37' }}>ملاحظة:</b> أسماء أسباب الدخول لازم تطابق ما هو موجود في قاعدة البيانات (مثل: SMT Fill 15m، PSP 1h، FVG 5m...).
          </p>
        </div>
      </details>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#0A192F', padding: 12, borderRadius: 8, border: '1px solid #1F2D4A' }}>
      <div style={{ fontSize: 10, color: '#8899BB', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
