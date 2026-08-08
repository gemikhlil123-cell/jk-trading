/**
 * JK TRADING — مكتبة الرسومات التعليمية
 *
 * كل رسم هنا SVG أصلي مصنوع يدوياً يحاكي شكل شارت TradingView
 * مع هوية JK البصرية (كحلي + ذهبي). يصوّر مفاهيم تقنية عامة
 * (FVG, CISD, Order Blocks, Liquidity Sweep, إلخ).
 */

import React from 'react'

// ─── Palette ─────────────────────────────────────────────────────────────
const BG = '#0E1623'
const PANEL = '#0A1220'
const GRID = 'rgba(255,255,255,0.04)'
const AXIS = '#7C8AA8'
const TEXT = '#D4DEEF'
const GOLD = '#D4AF37'
const GREEN = '#26A69A'
const RED = '#EF5350'
const PINK = '#F5C7C7'
const PINK_BORDER = '#E89A9A'
const ARABIC = { fontFamily: 'inherit' as const, direction: 'rtl' as const }
const MONO = { fontFamily: 'ui-monospace, monospace' as const }

// ─── ChartShell — TradingView-style frame ───────────────────────────────
function ChartShell({
  width = 760,
  height = 380,
  symbol = 'NASDAQ 100 E-mini Futures',
  interval = '5',
  exchange = 'CME',
  priceMin,
  priceMax,
  timeLabels,
  children,
  arabicTitle,
}: {
  width?: number
  height?: number
  symbol?: string
  interval?: string
  exchange?: string
  priceMin: number
  priceMax: number
  timeLabels: string[]
  children: React.ReactNode
  arabicTitle?: string
}) {
  const headerH = 36
  const axisRightW = 70
  const axisBotH = 28
  const chartTop = headerH + 8
  const chartBot = height - axisBotH
  const chartLeft = 10
  const chartRight = width - axisRightW

  // price levels for right axis (5 gridlines)
  const levels = 6
  const priceStep = (priceMax - priceMin) / (levels - 1)
  const priceTicks = Array.from({ length: levels }, (_, i) =>
    Math.round((priceMax - i * priceStep) * 100) / 100
  )
  const yForPrice = (p: number) =>
    chartTop + ((priceMax - p) / (priceMax - priceMin)) * (chartBot - chartTop)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: '100%',
        height: 'auto',
        borderRadius: 10,
        background: BG,
        border: '1px solid #1F2D4A',
        display: 'block',
      }}
      role="img"
    >
      <defs>
        <linearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#162035" />
          <stop offset="100%" stopColor={PANEL} />
        </linearGradient>
      </defs>

      {/* main background */}
      <rect width={width} height={height} fill={BG} />

      {/* header bar */}
      <rect x={0} y={0} width={width} height={headerH} fill="url(#headerGrad)" />
      <line x1={0} y1={headerH} x2={width} y2={headerH} stroke="#1F2D4A" />
      <text x={14} y={22} fontSize={12} fill="#D4DEEF" fontWeight={700} style={MONO}>
        {symbol}  ·  {interval}  ·  {exchange}
      </text>
      <text x={width - 14} y={22} fontSize={11} fill={GOLD} fontWeight={700} textAnchor="end" style={ARABIC}>
        JK · {arabicTitle ?? ''}
      </text>

      {/* horizontal gridlines */}
      {priceTicks.map((p, i) => {
        const y = yForPrice(p)
        return (
          <g key={`grid-${i}`}>
            <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke={GRID} />
            <text
              x={chartRight + 6}
              y={y + 3}
              fontSize={10}
              fill={AXIS}
              style={MONO}
              textAnchor="start"
            >
              {p.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </text>
          </g>
        )
      })}

      {/* time labels */}
      {timeLabels.map((t, i) => {
        const x = chartLeft + (i * (chartRight - chartLeft)) / (timeLabels.length - 1)
        return (
          <g key={`time-${i}`}>
            <line x1={x} y1={chartBot} x2={x} y2={chartBot + 4} stroke={AXIS} strokeWidth={0.6} />
            <text x={x} y={chartBot + 18} fontSize={9.5} fill={AXIS} textAnchor="middle" style={MONO}>
              {t}
            </text>
          </g>
        )
      })}

      {/* the chart content */}
      <g>{children}</g>

      {/* TradingView-like logo bottom-left */}
      <text x={14} y={height - 8} fontSize={9} fill="#4A5A7A" style={MONO}>
        ◈ JK Trading Charts
      </text>
    </svg>
  )
}

// ─── Single candle drawer ────────────────────────────────────────────────
function Candle({
  cx, openY, closeY, highY, lowY, color, width = 12,
}: {
  cx: number; openY: number; closeY: number; highY: number; lowY: number
  color: string; width?: number
}) {
  const bodyTop = Math.min(openY, closeY)
  const bodyH = Math.max(2, Math.abs(closeY - openY))
  return (
    <g>
      <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1.2} />
      <rect
        x={cx - width / 2}
        y={bodyTop}
        width={width}
        height={bodyH}
        fill={color}
        stroke={color}
      />
    </g>
  )
}

// ─── Helper: convert OHLC data to candles by priceRange ─────────────────
type OHLC = { o: number; h: number; l: number; c: number; bullish?: boolean }
function renderCandles(
  candles: OHLC[],
  startX: number,
  step: number,
  yForPrice: (p: number) => number,
  width = 14,
) {
  return candles.map((cd, i) => {
    const cx = startX + i * step
    const bullish = cd.bullish ?? cd.c >= cd.o
    return (
      <Candle
        key={i}
        cx={cx}
        openY={yForPrice(cd.o)}
        closeY={yForPrice(cd.c)}
        highY={yForPrice(cd.h)}
        lowY={yForPrice(cd.l)}
        color={bullish ? GREEN : RED}
        width={width}
      />
    )
  })
}

// ─── Annotation: pink FVG zone ──────────────────────────────────────────
function FVGZone({
  x1, x2, top, bottom, label = 'FVG',
}: {
  x1: number; x2: number; top: number; bottom: number; label?: string
}) {
  return (
    <g>
      <rect
        x={x1} y={top} width={x2 - x1} height={bottom - top}
        fill={PINK} fillOpacity={0.55}
        stroke={PINK_BORDER} strokeWidth={0.8}
      />
      {/* center dashed line */}
      <line
        x1={x1} x2={x2}
        y1={(top + bottom) / 2} y2={(top + bottom) / 2}
        stroke={PINK_BORDER} strokeWidth={0.6} strokeDasharray="4,4"
      />
      <text
        x={(x1 + x2) / 2} y={(top + bottom) / 2 + 4}
        fontSize={12} fontWeight={700} fill="#6B4FB5"
        textAnchor="middle" style={MONO}
      >
        {label}
      </text>
    </g>
  )
}

// ─── Annotation: horizontal CISD level ──────────────────────────────────
function CISDLine({
  x1, x2, y, label = 'CISD',
}: {
  x1: number; x2: number; y: number; label?: string
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#E6F0FF" strokeWidth={1} />
      <text
        x={x2 - 6} y={y - 4}
        fontSize={11} fontWeight={600} fill="#E6F0FF"
        textAnchor="end" style={MONO}
      >
        {label}
      </text>
    </g>
  )
}

// ─── Annotation: swing high/low bracket ─────────────────────────────────
function SwingBracket({
  x1, x2, y, label, position = 'top',
}: {
  x1: number; x2: number; y: number; label?: string; position?: 'top' | 'bottom'
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#E6F0FF" strokeWidth={0.8} />
      {label && (
        <text
          x={x2 - 6}
          y={position === 'top' ? y - 6 : y + 14}
          fontSize={10} fill="#E6F0FF" textAnchor="end" style={MONO}
        >
          {label}
        </text>
      )}
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// DIAGRAMS — TradingView-style charts
// ═══════════════════════════════════════════════════════════════════════

// ─── 1. FVG Example (Fair Value Gap) ────────────────────────────────────
function FVGDiagram() {
  const priceMin = 29260
  const priceMax = 29460
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const left = 10, right = w - 70
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  // Three candles forming FVG (bullish expansion)
  const candles: OHLC[] = [
    { o: 29265, h: 29275, l: 29260, c: 29275 },
    { o: 29275, h: 29345, l: 29275, c: 29340 },
    { o: 29340, h: 29445, l: 29335, c: 29412 },
  ]

  const candleStartX = 120
  const candleStep = 50

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM', '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM']}
      arabicTitle="مثال على FVG"
    >
      {/* FVG zone between candle 1 high (29,275) and candle 3 low (29,335) */}
      <FVGZone
        x1={candleStartX + candleStep + 20}
        x2={right - 30}
        top={yForPrice(29335)}
        bottom={yForPrice(29275)}
      />

      {/* Candles */}
      {renderCandles(candles, candleStartX, candleStep, yForPrice, 16)}

      {/* Annotation arrow + label */}
      <text x={candleStartX + 5} y={yForPrice(29412) - 8} fontSize={11} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="start">
        شمعة توسّع
      </text>

      {/* current price tag (right side) */}
      <g>
        <rect x={right + 1} y={yForPrice(29412) - 9} width={66} height={18} fill={GREEN} rx={2} />
        <text x={right + 34} y={yForPrice(29412) + 3} fontSize={10} fill="#fff" fontWeight={700} textAnchor="middle" style={MONO}>
          29,412.00
        </text>
      </g>
      <line x1={left} x2={right} y1={yForPrice(29412)} y2={yForPrice(29412)} stroke={GREEN} strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 2. Bullish Expansion (3 candles building up) ───────────────────────
function ExpansionDiagram() {
  const priceMin = 29205
  const priceMax = 29300
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29260, h: 29270, l: 29220, c: 29230, bullish: false }, // bearish
    { o: 29232, h: 29250, l: 29225, c: 29240 }, // small bull
    { o: 29240, h: 29260, l: 29238, c: 29257 }, // medium bull
    { o: 29257, h: 29296, l: 29257, c: 29275 }, // big bull (expansion)
  ]

  const candleStartX = 80
  const candleStep = 50

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['12:45 PM', '12:50', '12:55', '01:00 PM', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30 PM']}
      arabicTitle="بناء شموع التوسّع"
    >
      {renderCandles(candles, candleStartX, candleStep, yForPrice, 28)}

      {/* annotation: trend arrow */}
      <line
        x1={candleStartX} y1={yForPrice(29240)}
        x2={candleStartX + 3 * candleStep} y2={yForPrice(29270)}
        stroke={GOLD} strokeWidth={1} strokeDasharray="4,4"
      />

      <text x={candleStartX + 2 * candleStep} y={yForPrice(29220)} fontSize={11} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="middle">
        مواءمة 3 شموع → توسّع
      </text>

      {/* current price */}
      <g>
        <rect x={690 + 1} y={yForPrice(29275) - 9} width={66} height={18} fill={GREEN} rx={2} />
        <text x={690 + 34} y={yForPrice(29275) + 3} fontSize={10} fill="#fff" fontWeight={700} textAnchor="middle" style={MONO}>
          29,275.50
        </text>
      </g>
      <line x1={10} x2={690} y1={yForPrice(29275)} y2={yForPrice(29275)} stroke={GREEN} strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 3. CISD — Bullish Reversal after Range ─────────────────────────────
function CISDBullishDiagram() {
  const priceMin = 29180
  const priceMax = 29480
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  // Range/consolidation then breakout
  const candles: OHLC[] = [
    { o: 29295, h: 29310, l: 29280, c: 29302 },
    { o: 29302, h: 29320, l: 29290, c: 29292, bullish: false },
    { o: 29292, h: 29298, l: 29260, c: 29270, bullish: false },
    { o: 29270, h: 29280, l: 29240, c: 29248, bullish: false },
    { o: 29248, h: 29262, l: 29245, c: 29258 },
    { o: 29258, h: 29268, l: 29248, c: 29252, bullish: false },
    { o: 29252, h: 29262, l: 29230, c: 29242, bullish: false },
    { o: 29242, h: 29248, l: 29220, c: 29230, bullish: false },
    { o: 29230, h: 29245, l: 29210, c: 29240 },  // low sweep
    { o: 29240, h: 29270, l: 29238, c: 29265 },
    { o: 29265, h: 29280, l: 29262, c: 29275 },  // CISD trigger - closes above range
    { o: 29275, h: 29340, l: 29270, c: 29335 },  // first expansion
    { o: 29335, h: 29410, l: 29320, c: 29395 },  // big up
    { o: 29395, h: 29445, l: 29385, c: 29433 },  // current
  ]

  const candleStartX = 80
  const candleStep = 40

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['12:00 PM', '12:15', '12:30', '12:45', '01:00 PM', '01:15', '01:30', '01:45', '02:00 PM', '02:15']}
      arabicTitle="CISD — انعكاس صعودي"
    >
      {/* swing low bracket */}
      <SwingBracket x1={candleStartX} x2={candleStartX + 9 * candleStep} y={yForPrice(29210)} position="bottom" />

      {/* CISD level */}
      <CISDLine x1={candleStartX + 8 * candleStep} x2={candleStartX + 13 * candleStep} y={yForPrice(29260)} label="CISD" />

      {renderCandles(candles, candleStartX, candleStep, yForPrice, 13)}

      <text x={candleStartX + 5 * candleStep} y={yForPrice(29440)} fontSize={11} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="middle">
        كسر CISD ← انطلاق
      </text>

      {/* current price */}
      <g>
        <rect x={690 + 1} y={yForPrice(29433) - 9} width={66} height={18} fill={GREEN} rx={2} />
        <text x={690 + 34} y={yForPrice(29433) + 3} fontSize={10} fill="#fff" fontWeight={700} textAnchor="middle" style={MONO}>
          29,433.00
        </text>
      </g>
      <line x1={10} x2={690} y1={yForPrice(29433)} y2={yForPrice(29433)} stroke={GREEN} strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 4. CISD — Bullish with Liquidity Sweep ─────────────────────────────
function CISDSweepDiagram() {
  const priceMin = 28960
  const priceMax = 29320
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  // Down move, sweep, CISD reversal
  const candles: OHLC[] = [
    { o: 29140, h: 29145, l: 29130, c: 29138, bullish: false },
    { o: 29138, h: 29142, l: 29105, c: 29110, bullish: false },
    { o: 29110, h: 29115, l: 29103, c: 29108 },
    { o: 29108, h: 29115, l: 29095, c: 29100, bullish: false },
    { o: 29100, h: 29130, l: 29095, c: 29120 },
    { o: 29120, h: 29125, l: 29075, c: 29085, bullish: false },
    { o: 29085, h: 29150, l: 29085, c: 29140 },
    { o: 29140, h: 29155, l: 29110, c: 29115, bullish: false },
    { o: 29115, h: 29120, l: 29080, c: 29090, bullish: false },
    { o: 29090, h: 29110, l: 29065, c: 29070, bullish: false },
    { o: 29070, h: 29075, l: 29040, c: 29055, bullish: false },
    { o: 29055, h: 29080, l: 29020, c: 29065 }, // sweep low
    { o: 29065, h: 29170, l: 29055, c: 29155 }, // big expansion
    { o: 29155, h: 29180, l: 29135, c: 29148, bullish: false },
    { o: 29148, h: 29260, l: 29140, c: 29215 }, // CISD break
    { o: 29215, h: 29230, l: 29205, c: 29208, bullish: false },
    { o: 29208, h: 29230, l: 29185, c: 29225 }, // current
  ]

  const candleStartX = 80
  const candleStep = 32

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['09:00 AM', '09:30', '10:00 AM', '10:30', '11:00 AM', '11:30', '12:00 PM', '12:30', '01:00 PM', '01:30']}
      arabicTitle="CISD مع سويب سيولة"
    >
      {/* swing low bracket */}
      <SwingBracket x1={candleStartX} x2={candleStartX + 11 * candleStep} y={yForPrice(29020)} position="bottom" />

      {/* CISD level */}
      <CISDLine x1={candleStartX + 7 * candleStep} x2={candleStartX + 16 * candleStep} y={yForPrice(29140)} label="CISD" />

      {renderCandles(candles, candleStartX, candleStep, yForPrice, 11)}

      <text x={candleStartX + 11 * candleStep} y={yForPrice(28990)} fontSize={11} fill={RED} fontWeight={700} style={ARABIC} textAnchor="middle">
        سويب القاع
      </text>
      <text x={candleStartX + 14 * candleStep} y={yForPrice(29275)} fontSize={11} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="middle">
        ↑ كسر CISD
      </text>

      {/* current price */}
      <g>
        <rect x={690 + 1} y={yForPrice(29223.75) - 9} width={66} height={18} fill={GREEN} rx={2} />
        <text x={690 + 34} y={yForPrice(29223.75) + 3} fontSize={10} fill="#fff" fontWeight={700} textAnchor="middle" style={MONO}>
          29,223.75
        </text>
      </g>
      <line x1={10} x2={690} y1={yForPrice(29223.75)} y2={yForPrice(29223.75)} stroke={GREEN} strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 5. CISD — Bearish Reversal ──────────────────────────────────────────
function CISDBearishDiagram() {
  const priceMin = 28980
  const priceMax = 29240
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29090, h: 29105, l: 29080, c: 29085, bullish: false },
    { o: 29085, h: 29095, l: 29078, c: 29082, bullish: false },
    { o: 29082, h: 29100, l: 29078, c: 29097 },
    { o: 29097, h: 29135, l: 29097, c: 29130 },
    { o: 29130, h: 29170, l: 29128, c: 29160 }, // moving up
    { o: 29160, h: 29180, l: 29155, c: 29178 },
    { o: 29178, h: 29185, l: 29170, c: 29173, bullish: false },
    { o: 29173, h: 29180, l: 29155, c: 29162, bullish: false },
    { o: 29162, h: 29168, l: 29140, c: 29148, bullish: false },
    { o: 29148, h: 29155, l: 29128, c: 29135, bullish: false },
    { o: 29135, h: 29145, l: 29125, c: 29142 },
    { o: 29142, h: 29170, l: 29140, c: 29165 }, // retest up
    { o: 29165, h: 29180, l: 29130, c: 29135, bullish: false }, // CISD break down
    { o: 29135, h: 29140, l: 29095, c: 29105, bullish: false },
    { o: 29105, h: 29110, l: 29055, c: 29060, bullish: false },
    { o: 29060, h: 29070, l: 29010, c: 29020, bullish: false },
    { o: 29020, h: 29040, l: 28995, c: 29020 },
  ]

  const candleStartX = 80
  const candleStep = 32

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM', '01:00 AM', '02:00 AM', '03:00 AM']}
      arabicTitle="CISD — انعكاس هبوطي"
    >
      {/* swing high bracket */}
      <SwingBracket x1={candleStartX + 3 * candleStep} x2={candleStartX + 16 * candleStep} y={yForPrice(29185)} position="top" label="" />

      {/* CISD bearish level */}
      <CISDLine x1={candleStartX + 8 * candleStep} x2={candleStartX + 16 * candleStep} y={yForPrice(29105)} label="CISD" />

      {renderCandles(candles, candleStartX, candleStep, yForPrice, 11)}

      <text x={candleStartX + 13 * candleStep} y={yForPrice(28998)} fontSize={11} fill={RED} fontWeight={700} style={ARABIC} textAnchor="middle">
        ↓ كسر CISD هبوطاً
      </text>

      {/* current price */}
      <g>
        <rect x={690 + 1} y={yForPrice(29020) - 9} width={66} height={18} fill="#9CA3AF" rx={2} />
        <text x={690 + 34} y={yForPrice(29020) + 3} fontSize={10} fill="#0E1623" fontWeight={700} textAnchor="middle" style={MONO}>
          29,020.00
        </text>
      </g>
      <line x1={10} x2={690} y1={yForPrice(29020)} y2={yForPrice(29020)} stroke="#9CA3AF" strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 6. Order Block ──────────────────────────────────────────────────────
function OrderBlockDiagram() {
  const priceMin = 29100
  const priceMax = 29400
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  // Setup: down move, bullish OB, move down to retest, then up
  const candles: OHLC[] = [
    { o: 29350, h: 29370, l: 29330, c: 29335, bullish: false },
    { o: 29335, h: 29345, l: 29300, c: 29310, bullish: false },
    { o: 29310, h: 29318, l: 29280, c: 29285, bullish: false },
    { o: 29285, h: 29295, l: 29260, c: 29265, bullish: false }, // bullish OB candle
    { o: 29265, h: 29280, l: 29245, c: 29275 }, // last bullish before drop
    { o: 29275, h: 29280, l: 29230, c: 29240, bullish: false },
    { o: 29240, h: 29245, l: 29210, c: 29220, bullish: false },
    { o: 29220, h: 29225, l: 29190, c: 29200, bullish: false },
    { o: 29200, h: 29210, l: 29185, c: 29195, bullish: false },
    { o: 29195, h: 29200, l: 29175, c: 29180, bullish: false },
    { o: 29180, h: 29220, l: 29175, c: 29215 }, // bounce
    { o: 29215, h: 29270, l: 29215, c: 29265 }, // retest OB zone
    { o: 29265, h: 29290, l: 29260, c: 29280 }, // entering OB
    { o: 29280, h: 29310, l: 29275, c: 29305 },
    { o: 29305, h: 29360, l: 29300, c: 29355 }, // expansion
    { o: 29355, h: 29395, l: 29350, c: 29388 },
  ]

  const candleStartX = 80
  const candleStep = 35

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['09:00 AM', '09:30', '10:00 AM', '10:30', '11:00 AM', '11:30', '12:00 PM', '12:30', '01:00 PM', '01:30']}
      arabicTitle="Order Block"
    >
      {/* OB zone — yellow rectangle around the last bullish candle before drop */}
      <g>
        <rect
          x={candleStartX + 3 * candleStep - 12}
          y={yForPrice(29280)}
          width={(16 - 3) * candleStep}
          height={yForPrice(29245) - yForPrice(29280)}
          fill={GOLD} fillOpacity={0.18}
          stroke={GOLD} strokeWidth={0.8}
          strokeDasharray="4,3"
        />
        <text x={candleStartX + 14.5 * candleStep} y={yForPrice(29263) + 4} fontSize={11} fontWeight={700} fill={GOLD} textAnchor="end" style={MONO}>
          OB
        </text>
      </g>

      {renderCandles(candles, candleStartX, candleStep, yForPrice, 13)}

      <text x={candleStartX + 12 * candleStep} y={yForPrice(29385)} fontSize={11} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="middle">
        السعر يعود لـOB ثم ينطلق
      </text>

      <g>
        <rect x={690 + 1} y={yForPrice(29388) - 9} width={66} height={18} fill={GREEN} rx={2} />
        <text x={690 + 34} y={yForPrice(29388) + 3} fontSize={10} fill="#fff" fontWeight={700} textAnchor="middle" style={MONO}>
          29,388.00
        </text>
      </g>
      <line x1={10} x2={690} y1={yForPrice(29388)} y2={yForPrice(29388)} stroke={GREEN} strokeWidth={0.4} strokeDasharray="2,3" />
    </ChartShell>
  )
}

// ─── 7. Candle Anatomy — single candle with labels ──────────────────────
function CandleAnatomyDiagram() {
  const priceMin = 29200
  const priceMax = 29400
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['01:00 PM', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30 PM']}
      arabicTitle="تشريح الشمعة"
    >
      {/* a couple of context candles */}
      <Candle cx={140} openY={yForPrice(29280)} closeY={yForPrice(29260)} highY={yForPrice(29290)} lowY={yForPrice(29250)} color={RED} width={20} />
      <Candle cx={210} openY={yForPrice(29260)} closeY={yForPrice(29290)} highY={yForPrice(29300)} lowY={yForPrice(29255)} color={GREEN} width={20} />

      {/* the main labeled candle */}
      <Candle cx={350} openY={yForPrice(29250)} closeY={yForPrice(29360)} highY={yForPrice(29385)} lowY={yForPrice(29230)} color={GREEN} width={42} />

      {/* leader lines + labels */}
      {[
        { y: yForPrice(29385), text: 'High (أعلى الشمعة)' },
        { y: yForPrice(29360), text: 'Close (الإغلاق)', color: GREEN },
        { y: yForPrice(29305), text: 'Body (جسم الشمعة)', color: GOLD },
        { y: yForPrice(29250), text: 'Open (الافتتاح)', color: GREEN },
        { y: yForPrice(29230), text: 'Low (أدنى الشمعة)' },
      ].map((row, i) => (
        <g key={i}>
          <line x1={372} y1={row.y} x2={460} y2={row.y} stroke={row.color ?? TEXT} strokeWidth={0.6} strokeDasharray="3,3" />
          <text x={466} y={row.y + 4} fontSize={11} fill={row.color ?? TEXT} style={ARABIC} fontWeight={600}>
            {row.text}
          </text>
        </g>
      ))}

      {/* wick brackets */}
      <line x1={325} y1={yForPrice(29385)} x2={320} y2={yForPrice(29385)} stroke="#7DD3FC" strokeWidth={1.4} />
      <line x1={325} y1={yForPrice(29360)} x2={320} y2={yForPrice(29360)} stroke="#7DD3FC" strokeWidth={1.4} />
      <line x1={320} y1={yForPrice(29385)} x2={320} y2={yForPrice(29360)} stroke="#7DD3FC" strokeWidth={1.4} />
      <text x={310} y={yForPrice(29372)} fontSize={10} fill="#7DD3FC" fontWeight={700} style={ARABIC} textAnchor="end">
        الذيل العلوي
      </text>

      <line x1={325} y1={yForPrice(29250)} x2={320} y2={yForPrice(29250)} stroke="#7DD3FC" strokeWidth={1.4} />
      <line x1={325} y1={yForPrice(29230)} x2={320} y2={yForPrice(29230)} stroke="#7DD3FC" strokeWidth={1.4} />
      <line x1={320} y1={yForPrice(29250)} x2={320} y2={yForPrice(29230)} stroke="#7DD3FC" strokeWidth={1.4} />
      <text x={310} y={yForPrice(29240)} fontSize={10} fill="#7DD3FC" fontWeight={700} style={ARABIC} textAnchor="end">
        الذيل السفلي
      </text>
    </ChartShell>
  )
}

// ─── 8. Liquidity Sweep ─────────────────────────────────────────────────
function LiquiditySweepDiagram() {
  const priceMin = 29140
  const priceMax = 29320
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29250, h: 29265, l: 29220, c: 29225, bullish: false },
    { o: 29225, h: 29230, l: 29200, c: 29205, bullish: false },
    { o: 29205, h: 29215, l: 29198, c: 29200, bullish: false },
    { o: 29200, h: 29210, l: 29195, c: 29205 },
    { o: 29205, h: 29215, l: 29198, c: 29202, bullish: false },
    { o: 29202, h: 29210, l: 29200, c: 29208 },
    { o: 29208, h: 29215, l: 29198, c: 29200, bullish: false },
    { o: 29200, h: 29210, l: 29165, c: 29208 }, // sweep below liquidity
    { o: 29208, h: 29250, l: 29205, c: 29245 },
    { o: 29245, h: 29280, l: 29240, c: 29275 },
    { o: 29275, h: 29305, l: 29270, c: 29298 },
  ]

  const candleStartX = 80
  const candleStep = 50

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['09:00 AM', '09:30', '10:00 AM', '10:30', '11:00 AM', '11:30', '12:00 PM']}
      arabicTitle="سويب السيولة"
    >
      {/* Equal lows liquidity line */}
      <line x1={candleStartX - 20} x2={candleStartX + 11 * candleStep} y1={yForPrice(29195)} y2={yForPrice(29195)} stroke={GOLD} strokeWidth={0.8} strokeDasharray="4,4" />
      <text x={candleStartX - 25} y={yForPrice(29195) - 4} fontSize={10} fill={GOLD} fontWeight={700} style={ARABIC} textAnchor="start">
        سيولة قيعان مستوية
      </text>

      {renderCandles(candles, candleStartX, candleStep, yForPrice, 18)}

      <text x={candleStartX + 7 * candleStep} y={yForPrice(29150)} fontSize={11} fill={RED} fontWeight={800} style={ARABIC} textAnchor="middle">
        ✕ السويب
      </text>
      <text x={candleStartX + 10 * candleStep} y={yForPrice(29305) - 12} fontSize={11} fill={GREEN} fontWeight={800} style={ARABIC} textAnchor="middle">
        انعكاس قوي ↑
      </text>
    </ChartShell>
  )
}

// ─── 9. Daily Bias — three classifications ──────────────────────────────
function DailyBiasDiagram() {
  const priceMin = 29000
  const priceMax = 29500
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  // 6 candles: yesterday + today × 3 scenarios
  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['أمس', 'اليوم 1', 'أمس', 'اليوم 2', 'أمس', 'اليوم 3']}
      arabicTitle="تصنيف التحيّز اليومي"
    >
      {/* Three sections divided */}
      {[
        { x: 120, midY: yForPrice(29150), prevO: 29100, prevC: 29200, prevH: 29220, prevL: 29080, todO: 29200, todC: 29350, todH: 29380, todL: 29190, label: 'صاعد', color: GREEN },
        { x: 380, midY: yForPrice(29250), prevO: 29200, prevC: 29300, prevH: 29320, prevL: 29180, todO: 29300, todC: 29240, todH: 29310, todL: 29220, label: 'تجميع', color: '#9CA3AF' },
        { x: 620, midY: yForPrice(29280), prevO: 29350, prevC: 29210, prevH: 29380, prevL: 29200, todO: 29215, todC: 29080, todH: 29230, todL: 29070, label: 'هابط', color: RED },
      ].map((s, i) => (
        <g key={i}>
          {/* mid line */}
          <line
            x1={s.x - 80} x2={s.x + 80}
            y1={s.midY} y2={s.midY}
            stroke={GOLD} strokeWidth={0.8} strokeDasharray="3,3"
          />
          <text x={s.x - 80} y={s.midY - 4} fontSize={9} fill={GOLD} style={ARABIC} textAnchor="start">منتصف الأمس</text>

          {/* yesterday candle */}
          <Candle
            cx={s.x - 35}
            openY={yForPrice(s.prevO)} closeY={yForPrice(s.prevC)}
            highY={yForPrice(s.prevH)} lowY={yForPrice(s.prevL)}
            color={s.prevC > s.prevO ? GREEN : RED}
            width={26}
          />

          {/* today candle */}
          <Candle
            cx={s.x + 35}
            openY={yForPrice(s.todO)} closeY={yForPrice(s.todC)}
            highY={yForPrice(s.todH)} lowY={yForPrice(s.todL)}
            color={s.todC > s.todO ? GREEN : RED}
            width={26}
          />

          {/* label */}
          <text x={s.x} y={335} fontSize={13} fontWeight={800} fill={s.color} style={ARABIC} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
    </ChartShell>
  )
}

// ─── 10. Top-Down Multi-Timeframe Stack ─────────────────────────────────
function TopDownDiagram() {
  const w = 760, h = 380
  const headerH = 36
  // Three mini-rows
  const rowH = 95
  const rows = [
    { label: 'D1', tf: 'الديلي', y: headerH + 12, color: GOLD },
    { label: 'H1', tf: 'الساعة', y: headerH + 12 + rowH + 8, color: '#60A5FA' },
    { label: '5m', tf: '5 دقائق', y: headerH + 12 + (rowH + 8) * 2, color: GREEN },
  ]

  return (
    <ChartShell
      width={w} height={h}
      priceMin={29200} priceMax={29440}
      timeLabels={[]}
      arabicTitle="تحليل من الأعلى للأسفل"
    >
      {rows.map((r, ri) => {
        // generate generic candles for each row
        const candleW = ri === 0 ? 38 : ri === 1 ? 20 : 11
        const step = ri === 0 ? 80 : ri === 1 ? 42 : 24
        const startX = 60
        const count = ri === 0 ? 7 : ri === 1 ? 14 : 25
        const seed = ri * 13 + 7
        const candles: OHLC[] = Array.from({ length: count }, (_, i) => {
          // pseudo-random but stable
          const s = Math.sin(i + seed) * 10
          const c = Math.cos(i * 0.7 + seed) * 8
          const base = ri === 0 ? 50 - i * 4 : ri === 1 ? 60 - i * 2 : 70 - i * 1.5
          const o = base + s
          const cl = base + c + (ri === 0 ? -4 : ri === 1 ? -2 : -1)
          const high = Math.max(o, cl) + 4 + Math.abs(c) * 0.4
          const low = Math.min(o, cl) - 4 - Math.abs(s) * 0.4
          return { o, c: cl, h: high, l: low }
        })

        return (
          <g key={r.label}>
            {/* row container */}
            <rect x={20} y={r.y} width={w - 100} height={rowH - 10} rx={6} fill="rgba(255,255,255,0.025)" stroke="#1F2D4A" />

            {/* row label */}
            <text x={32} y={r.y + 16} fontSize={11} fontWeight={800} fill={r.color} style={MONO}>
              {r.label}
            </text>
            <text x={32} y={r.y + 32} fontSize={9} fill={r.color} style={ARABIC}>
              {r.tf}
            </text>

            {/* candles for this row */}
            {candles.map((cd, i) => {
              const cx = startX + 30 + i * step
              if (cx > w - 110) return null
              const bullish = cd.c >= cd.o
              const yMap = (v: number) => r.y + 50 - v
              return (
                <Candle
                  key={i}
                  cx={cx}
                  openY={yMap(cd.o)}
                  closeY={yMap(cd.c)}
                  highY={yMap(cd.h)}
                  lowY={yMap(cd.l)}
                  color={bullish ? GREEN : RED}
                  width={candleW}
                />
              )
            })}

            {/* note */}
            <text x={w - 100} y={r.y + 16} fontSize={9.5} fill={r.color} textAnchor="end" style={ARABIC}>
              {ri === 0 ? 'تحيّز صاعد' : ri === 1 ? 'منطقة FVG' : 'تأكيد CISD'}
            </text>
          </g>
        )
      })}

      {/* arrow connecting rows */}
      <line x1={w / 2 - 30} y1={headerH + 12 + rowH - 4} x2={w / 2 - 30} y2={headerH + 12 + rowH + 8} stroke={GOLD} strokeWidth={1.2} />
      <polygon
        points={`${w / 2 - 30},${headerH + 12 + rowH + 12} ${w / 2 - 36},${headerH + 12 + rowH + 4} ${w / 2 - 24},${headerH + 12 + rowH + 4}`}
        fill={GOLD}
      />
      <line x1={w / 2 - 30} y1={headerH + 12 + 2 * rowH + 4} x2={w / 2 - 30} y2={headerH + 12 + 2 * rowH + 16} stroke={GOLD} strokeWidth={1.2} />
      <polygon
        points={`${w / 2 - 30},${headerH + 12 + 2 * rowH + 20} ${w / 2 - 36},${headerH + 12 + 2 * rowH + 12} ${w / 2 - 24},${headerH + 12 + 2 * rowH + 12}`}
        fill={GOLD}
      />
    </ChartShell>
  )
}

// ─── 11. Sessions / Killzones ───────────────────────────────────────────
function SessionsDiagram() {
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 50
  const bot = h - axisBotH - 30

  const sessions = [
    { x1: 30, x2: 200, name: 'آسيا', hours: '01:00–07:00 UTC', color: '#9CA3AF' },
    { x1: 200, x2: 380, name: 'لندن', hours: '07:00–13:00 UTC', color: '#60A5FA' },
    { x1: 380, x2: 560, name: 'NY AM', hours: '13:00–19:00 UTC', color: GREEN },
    { x1: 560, x2: 730, name: 'NY PM', hours: '19:00–00:00 UTC', color: '#F59E0B' },
  ]

  return (
    <ChartShell
      width={w} height={h}
      priceMin={29200} priceMax={29400}
      timeLabels={['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '00:00']}
      arabicTitle="الجلسات الرئيسية"
    >
      {sessions.map((s, i) => (
        <g key={i}>
          {/* session zone background */}
          <rect x={s.x1} y={top} width={s.x2 - s.x1} height={bot - top} fill={s.color} fillOpacity={0.06} stroke={s.color} strokeOpacity={0.4} strokeDasharray="4,3" />
          {/* label header */}
          <text x={(s.x1 + s.x2) / 2} y={top - 16} fontSize={12} fontWeight={800} fill={s.color} style={ARABIC} textAnchor="middle">
            {s.name}
          </text>
          <text x={(s.x1 + s.x2) / 2} y={top - 2} fontSize={10} fill={s.color} style={MONO} textAnchor="middle">
            {s.hours}
          </text>

          {/* random candles inside */}
          {Array.from({ length: 6 }).map((_, ci) => {
            const cx = s.x1 + 18 + ci * ((s.x2 - s.x1 - 36) / 5)
            const offset = (ci % 3) * 10 - 5
            const o = top + 60 + offset
            const c = o + (ci % 2 === 0 ? -15 : 12)
            const isBull = c < o
            return (
              <Candle
                key={ci}
                cx={cx}
                openY={o} closeY={c}
                highY={Math.min(o, c) - 8}
                lowY={Math.max(o, c) + 8}
                color={isBull ? GREEN : RED}
                width={12}
              />
            )
          })}
        </g>
      ))}
    </ChartShell>
  )
}

// ─── 12. Classic Expansion Week (5 daily candles bullish) ────────────────
function ClassicExpansionWeekDiagram() {
  const priceMin = 29200
  const priceMax = 29800
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29280, h: 29380, l: 29250, c: 29360 },
    { o: 29360, h: 29460, l: 29340, c: 29445 },
    { o: 29445, h: 29560, l: 29430, c: 29545 },
    { o: 29545, h: 29660, l: 29530, c: 29640 },
    { o: 29640, h: 29760, l: 29630, c: 29745 },
  ]

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']}
      arabicTitle="Classic Expansion — أسبوع صاعد"
    >
      {renderCandles(candles, 140, 120, yForPrice, 60)}

      {/* trend arrow */}
      <line x1={140} y1={yForPrice(29360)} x2={620} y2={yForPrice(29745)} stroke={GOLD} strokeWidth={1.2} strokeDasharray="5,4" />
      <text x={620} y={yForPrice(29770)} fontSize={12} fontWeight={800} fill={GOLD} style={ARABIC} textAnchor="end">
        ترند صاعد كامل الأسبوع ↑
      </text>
    </ChartShell>
  )
}

// ─── 13. Thursday Counter Week ──────────────────────────────────────────
function ThursdayCounterDiagram() {
  const priceMin = 29200
  const priceMax = 29700
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29280, h: 29380, l: 29250, c: 29365 },
    { o: 29365, h: 29470, l: 29350, c: 29455 },
    { o: 29455, h: 29580, l: 29440, c: 29560 },
    { o: 29560, h: 29580, l: 29350, c: 29380, bullish: false },  // Thursday counter
    { o: 29380, h: 29410, l: 29270, c: 29300, bullish: false },  // Friday continues down
  ]

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس ✕', 'الجمعة']}
      arabicTitle="Thursday Counter — انعكاس الخميس"
    >
      {renderCandles(candles, 140, 120, yForPrice, 60)}

      <text x={140 + 3 * 120} y={yForPrice(29350)} fontSize={12} fontWeight={800} fill={RED} style={ARABIC} textAnchor="middle">
        ↓ انعكاس قوي
      </text>
    </ChartShell>
  )
}

// ─── 14. Consolidation Reversal ──────────────────────────────────────────
function ConsolidationReversalDiagram() {
  const priceMin = 29050
  const priceMax = 29400
  const w = 760, h = 380
  const headerH = 36, axisBotH = 28
  const top = headerH + 8, bot = h - axisBotH
  const yForPrice = (p: number) => top + ((priceMax - p) / (priceMax - priceMin)) * (bot - top)

  const candles: OHLC[] = [
    { o: 29200, h: 29260, l: 29190, c: 29250 },
    { o: 29250, h: 29265, l: 29215, c: 29225, bullish: false },
    { o: 29225, h: 29260, l: 29215, c: 29255 },
    { o: 29255, h: 29265, l: 29220, c: 29230, bullish: false },
    { o: 29230, h: 29260, l: 29220, c: 29250 },
    { o: 29250, h: 29262, l: 29215, c: 29225, bullish: false },
    { o: 29225, h: 29258, l: 29220, c: 29250 },
    { o: 29250, h: 29260, l: 29215, c: 29222, bullish: false },
    { o: 29222, h: 29305, l: 29220, c: 29260, bullish: false }, // false breakout up
    { o: 29260, h: 29265, l: 29200, c: 29210, bullish: false },
    { o: 29210, h: 29215, l: 29170, c: 29180, bullish: false },
    { o: 29180, h: 29190, l: 29130, c: 29140, bullish: false },
    { o: 29140, h: 29150, l: 29080, c: 29090, bullish: false },
  ]

  return (
    <ChartShell
      width={w} height={h}
      priceMin={priceMin} priceMax={priceMax}
      timeLabels={['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']}
      arabicTitle="انعكاس بعد التجميع"
    >
      {/* Range lines */}
      <line x1={50} x2={680} y1={yForPrice(29270)} y2={yForPrice(29270)} stroke={GOLD} strokeWidth={0.8} strokeDasharray="3,3" />
      <line x1={50} x2={680} y1={yForPrice(29215)} y2={yForPrice(29215)} stroke={GOLD} strokeWidth={0.8} strokeDasharray="3,3" />
      <text x={680} y={yForPrice(29280)} fontSize={10} fill={GOLD} style={ARABIC} textAnchor="end">سقف النطاق</text>
      <text x={680} y={yForPrice(29208)} fontSize={10} fill={GOLD} style={ARABIC} textAnchor="end">قاع النطاق</text>

      {renderCandles(candles, 80, 48, yForPrice, 17)}

      <text x={80 + 8 * 48} y={yForPrice(29320)} fontSize={11} fontWeight={800} fill={RED} style={ARABIC} textAnchor="middle">
        كسر كاذب
      </text>
      <text x={80 + 11 * 48} y={yForPrice(29170)} fontSize={11} fontWeight={800} fill={RED} style={ARABIC} textAnchor="middle">
        انعكاس قوي ↓
      </text>
    </ChartShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════

export const DIAGRAMS: Record<string, React.FC> = {
  'candle-anatomy':         CandleAnatomyDiagram,
  'expansion-vs-rejection': ExpansionDiagram,
  'fvg':                    FVGDiagram,
  'order-block':            OrderBlockDiagram,
  'cisd':                   CISDBullishDiagram,
  'cisd-sweep':             CISDSweepDiagram,
  'cisd-bearish':           CISDBearishDiagram,
  'daily-bias':             DailyBiasDiagram,
  'liquidity-sweep':        LiquiditySweepDiagram,
  'classic-expansion-week': ClassicExpansionWeekDiagram,
  'thursday-counter':       ThursdayCounterDiagram,
  'top-down':               TopDownDiagram,
  'power-of-3':             TopDownDiagram, // alias temporarily; can split later
  'sessions':               SessionsDiagram,
  'fractal-4-candles':      TopDownDiagram, // alias temporarily
  'consolidation-reversal': ConsolidationReversalDiagram,
}

export function Diagram({ id, caption }: { id: string; caption?: string }) {
  const Component = DIAGRAMS[id]
  if (!Component) return null
  return (
    <figure style={{ margin: 0, padding: 0 }}>
      <Component />
      {caption && (
        <figcaption
          style={{
            fontSize: 12,
            color: '#8899BB',
            textAlign: 'center',
            marginTop: 8,
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
