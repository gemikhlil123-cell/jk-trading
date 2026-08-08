'use client'

import { useState, useMemo } from 'react'

/** Futures instrument presets: point value ($ per 1.0 price move) + tick size. */
const INSTRUMENTS: Record<string, { label: string; pointValue: number; tick: number }> = {
  NQ:  { label: 'NQ — ناسداك',        pointValue: 20,   tick: 0.25 },
  MNQ: { label: 'MNQ — ميكرو ناسداك', pointValue: 2,    tick: 0.25 },
  ES:  { label: 'ES — S&P 500',       pointValue: 50,   tick: 0.25 },
  MES: { label: 'MES — ميكرو S&P',    pointValue: 5,    tick: 0.25 },
  YM:  { label: 'YM — داو',           pointValue: 5,    tick: 1 },
  MYM: { label: 'MYM — ميكرو داو',    pointValue: 0.5,  tick: 1 },
  GC:  { label: 'GC — ذهب',           pointValue: 100,  tick: 0.1 },
  MGC: { label: 'MGC — ميكرو ذهب',    pointValue: 10,   tick: 0.1 },
  CL:  { label: 'CL — نفط',           pointValue: 1000, tick: 0.01 },
  MCL: { label: 'MCL — ميكرو نفط',    pointValue: 100,  tick: 0.01 },
  CUSTOM: { label: 'مخصّص (أدخل قيمة النقطة)', pointValue: 1, tick: 0.01 },
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#8899BB', fontWeight: 700, marginBottom: 6 }

function num(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function RiskCalculator() {
  const [symbol, setSymbol] = useState('NQ')
  const [account, setAccount] = useState('50000')
  const [riskPct, setRiskPct] = useState('1')
  const [customPV, setCustomPV] = useState('1')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')

  const pv = symbol === 'CUSTOM' ? num(customPV) : INSTRUMENTS[symbol].pointValue

  const r = useMemo(() => {
    const acct = num(account)
    const riskAmount = (acct * num(riskPct)) / 100
    const stopDist = Math.abs(num(entry) - num(stop))
    const riskPerContract = stopDist * pv
    const contracts = riskPerContract > 0 ? Math.floor(riskAmount / riskPerContract) : 0
    const actualRisk = contracts * riskPerContract
    const targetDist = target ? Math.abs(num(target) - num(entry)) : 0
    const rMultiple = stopDist > 0 && targetDist > 0 ? targetDist / stopDist : 0
    const rewardAtTarget = contracts * targetDist * pv
    return { riskAmount, stopDist, riskPerContract, contracts, actualRisk, targetDist, rMultiple, rewardAtTarget }
  }, [account, riskPct, entry, stop, target, pv])

  const hasInputs = num(entry) > 0 && num(stop) > 0 && num(entry) !== num(stop)

  return (
    <div className="card-vibrant" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Instrument */}
      <div>
        <label style={lbl}>الأداة</label>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="form-input-dark" style={{ width: '100%' }}>
          {Object.entries(INSTRUMENTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {symbol !== 'CUSTOM' && (
          <p style={{ fontSize: 10, color: '#4A5A7A', marginTop: 4 }} className="ltr-num">
            قيمة النقطة: ${pv} · حجم التِك: {INSTRUMENTS[symbol].tick}
          </p>
        )}
      </div>

      {symbol === 'CUSTOM' && (
        <div>
          <label style={lbl}>قيمة النقطة ($ لكل 1.0 حركة)</label>
          <input value={customPV} onChange={(e) => setCustomPV(e.target.value)} inputMode="decimal" className="form-input-dark" style={{ width: '100%' }} />
        </div>
      )}

      {/* Account + risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>حجم الحساب ($)</label>
          <input value={account} onChange={(e) => setAccount(e.target.value)} inputMode="decimal" className="form-input-dark" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={lbl}>المخاطرة لكل صفقة (%)</label>
          <input value={riskPct} onChange={(e) => setRiskPct(e.target.value)} inputMode="decimal" className="form-input-dark" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>الدخول</label>
          <input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" placeholder="0" className="form-input-dark" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={lbl}>وقف الخسارة</label>
          <input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" placeholder="0" className="form-input-dark" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={lbl}>الهدف (اختياري)</label>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0" className="form-input-dark" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Results */}
      {hasInputs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#8899BB', fontWeight: 700 }}>عدد العقود المسموح</p>
            <p className="ltr-num" style={{ fontSize: 34, fontWeight: 900, color: '#D4AF37', lineHeight: 1.1 }}>{r.contracts}</p>
            <p className="ltr-num" style={{ fontSize: 11, color: '#8899BB' }}>
              المسافة للوقف: {r.stopDist.toFixed(2)} نقطة · ${r.riskPerContract.toFixed(2)} لكل عقد
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Result label="المخاطرة المستهدفة" value={`$${r.riskAmount.toFixed(0)}`} color="#E74C3C" />
            <Result label="المخاطرة الفعلية" value={`$${r.actualRisk.toFixed(0)}`} color="#E74C3C" />
            {r.rMultiple > 0 && <Result label="نسبة R:R" value={`${r.rMultiple.toFixed(2)} : 1`} color="#D4AF37" />}
            {r.rewardAtTarget > 0 && <Result label="الربح عند الهدف" value={`+$${r.rewardAtTarget.toFixed(0)}`} color="#1DB954" />}
          </div>

          {r.contracts === 0 && (
            <p style={{ fontSize: 11, color: '#E74C3C', textAlign: 'center', fontWeight: 700 }}>
              المسافة للوقف كبيرة جداً على مخاطرتك — صغّر الوقف أو زد نسبة المخاطرة.
            </p>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 11, color: '#4A5A7A', textAlign: 'center', padding: '8px 0' }}>
          أدخل سعر الدخول والوقف لحساب حجم الصفقة الصحيح.
        </p>
      )}
    </div>
  )
}

function Result({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: '#8899BB', marginBottom: 4 }}>{label}</p>
      <p className="ltr-num" style={{ fontSize: 18, fontWeight: 900, color, margin: 0 }}>{value}</p>
    </div>
  )
}
