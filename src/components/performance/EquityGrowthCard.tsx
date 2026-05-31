import { useState, useCallback, useRef, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { EquityGrowthChartData, GrowthLayer, GrowthPoint } from '@/utils/ledger/equityGrowthChart'
import { GROWTH_LAYERS } from '@/utils/ledger/equityGrowthChart'
import type { FiBarChartData } from '@/utils/ledger/fiBarChart'

function fmtPnl(v: number): string {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtLayerValue(_key: GrowthLayer, v: number, isPct: boolean): string {
  if (isPct) return `${v.toFixed(2)}%`
  return fmtPnl(v)
}

interface EquityGrowthCardProps {
  chartData: EquityGrowthChartData | null
  fiBarData: FiBarChartData | null
  growthUnit: 'pct' | 'usd'
  onGrowthUnitChange: (unit: 'pct' | 'usd') => void
  layersVisible: Record<GrowthLayer, boolean>
  onLayerToggle: (layer: GrowthLayer) => void
}

interface TipPos {
  left: number
  top: number
  anchor: 'left' | 'center' | 'right'
}

export function EquityGrowthCard({
  chartData,
  fiBarData,
  growthUnit,
  onGrowthUnitChange,
  layersVisible,
  onLayerToggle,
}: EquityGrowthCardProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [tipPos, setTipPos] = useState<TipPos | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const clearHover = useCallback(() => {
    setHoverIdx(null)
    setTipPos(null)
  }, [])

  const onPointer = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!chartData) return
      if (e.type === 'pointerleave' || e.type === 'pointercancel') {
        clearHover()
        return
      }
      const wrap = wrapRef.current
      if (!wrap) return
      const svg = e.currentTarget.ownerSVGElement
      if (!svg) return
      const svgRect = svg.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const inv = ctm.inverse()
      const svgPt = svg.createSVGPoint()
      svgPt.x = e.clientX
      svgPt.y = e.clientY
      const local = svgPt.matrixTransform(inv)
      const xSvg = local.x

      if (xSvg < chartData.PL || xSvg > chartData.W - chartData.PR) {
        clearHover()
        return
      }
      if (chartData.points.length === 0) return

      let idx = 0
      let best = Number.POSITIVE_INFINITY
      for (let i = 0; i < chartData.growthChartHit.length; i++) {
        const d = Math.abs(chartData.growthChartHit[i]!.cx - xSvg)
        if (d < best) { best = d; idx = i }
      }
      const hit = chartData.growthChartHit[idx]
      if (!hit) return
      setHoverIdx(idx)

      const xPx = svgRect.left - wrapRect.left + (hit.cx / chartData.W) * svgRect.width
      const yPx = svgRect.top - wrapRect.top + (hit.cyTotal / chartData.H) * svgRect.height
      const margin = 8
      const tipW = 260
      const tipHalf = tipW / 2
      let anchor: TipPos['anchor'] = 'center'
      let left = xPx
      if (xPx + tipHalf + margin > wrapRect.width) {
        anchor = 'right'
        left = Math.max(margin + tipW, xPx)
      } else if (xPx - tipHalf - margin < 0) {
        anchor = 'left'
        left = Math.min(wrapRect.width - margin - tipW, xPx)
      }
      setTipPos({ left, top: yPx, anchor })
    },
    [chartData, clearHover],
  )

  if (!chartData) return null

  const { last, isPct } = chartData
  const hoverHit = hoverIdx != null ? chartData.growthChartHit[hoverIdx] : null
  const hoverPt: GrowthPoint | undefined = hoverIdx != null ? chartData.points[hoverIdx] : undefined

  return (
    <section
      className="rounded-lg border border-border bg-secondary shadow-sm"
      aria-label="Portfolio equity growth"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground tracking-wide">
          Portfolio Equity Growth
        </h3>

        <div className="flex items-center gap-4">
          {/* % / $ toggle */}
          <div
            className="inline-flex rounded-md border border-border overflow-hidden text-[11px] font-medium"
            role="group"
            aria-label="Unit toggle"
          >
            <button
              className={cn(
                'px-2 py-0.5 transition-colors',
                growthUnit === 'pct'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted',
              )}
              onClick={() => onGrowthUnitChange('pct')}
              disabled={!chartData.hasCapitalBase}
            >
              %
            </button>
            <button
              className={cn(
                'px-2 py-0.5 transition-colors',
                growthUnit === 'usd'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted',
              )}
              onClick={() => onGrowthUnitChange('usd')}
            >
              $
            </button>
          </div>

          {/* KPIs */}
          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              TOTAL
              <strong className={cn('text-sm', pnlColorClass(last.totalRawVisible))}>
                {isPct ? `${last.totalVisible.toFixed(2)}%` : fmtPnl(last.totalRawVisible)}
              </strong>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              NET PNL
              <strong className={cn('text-sm', pnlColorClass(last.totalRaw))}>
                {fmtPnl(last.totalRaw)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex">
        {/* Legend (left) */}
        <div className="flex flex-col gap-1 px-3 py-3 border-r border-border min-w-[140px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            PNL BY ASSET CLASS
          </span>
          {GROWTH_LAYERS.map((l) => {
            const on = layersVisible[l.key]
            return (
              <label
                key={l.key}
                className={cn(
                  'flex items-center gap-1.5 cursor-pointer text-xs select-none transition-opacity',
                  !on && 'opacity-35',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => onLayerToggle(l.key)}
                  aria-label={`Plot ${l.label}`}
                />
                <span
                  className={cn(
                    'inline-block size-3 rounded-sm border transition-colors',
                    on ? 'border-transparent' : 'border-muted-foreground/40',
                  )}
                  style={{ background: on ? l.color : 'transparent' }}
                />
                <span className="flex-1" style={{ color: l.color }}>{l.label}</span>
                <span className="tabular-nums" style={{ color: l.color }}>
                  {isPct ? `${last[l.key].toFixed(2)}%` : fmtPnl(last[l.key])}
                </span>
              </label>
            )
          })}
          {/* Total row */}
          <div className="flex items-center gap-1.5 text-xs mt-1 pt-1 border-t border-border/50">
            <span className="inline-block size-3 rounded-sm" style={{ background: 'rgb(255,255,255)' }} />
            <span className="flex-1 text-foreground font-medium">Total</span>
            <span className="tabular-nums text-foreground font-medium">
              {isPct ? `${last.totalVisible.toFixed(2)}%` : fmtPnl(last.totalRawVisible)}
            </span>
          </div>
        </div>

        {/* Main charts area */}
        <div className="flex flex-1 min-w-0">
          {/* Growth chart */}
          <div className="relative flex-1 min-w-0 py-2 px-1" ref={wrapRef}>
            <svg
              className="w-full h-auto"
              viewBox={`0 0 ${chartData.W} ${chartData.H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Portfolio equity growth from ${chartData.first.dateLabel} to ${chartData.last.dateLabel}`}
            >
              {/* Month bands */}
              <g aria-hidden="true">
                {chartData.monthBands.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x1}
                    y={chartData.PT}
                    width={Math.max(0, b.x2 - b.x1)}
                    height={chartData.chartH}
                    className={b.alt ? 'fill-muted/30' : 'fill-transparent'}
                  />
                ))}
              </g>

              {/* Grid lines + Y labels */}
              {chartData.gridLines.map((gl, i) => (
                <Fragment key={i}>
                  <line
                    x1={chartData.PL} x2={chartData.W - chartData.PR}
                    y1={gl.y} y2={gl.y}
                    className="stroke-border" strokeWidth="0.5"
                  />
                  <text
                    x={chartData.PL + 4} y={gl.y - 4}
                    textAnchor="start" dominantBaseline="auto"
                    className="fill-muted-foreground" style={{ fontSize: 8 }}
                  >
                    {gl.label}
                  </text>
                </Fragment>
              ))}

              {/* Zero line */}
              {chartData.zeroY != null && (
                <line
                  x1={chartData.PL} x2={chartData.W - chartData.PR}
                  y1={chartData.zeroY} y2={chartData.zeroY}
                  className="stroke-muted-foreground/60"
                  strokeWidth="0.5" strokeDasharray="3 2"
                />
              )}

              {/* X-axis labels */}
              {chartData.xTicks.map((t, i) => (
                <text
                  key={i} x={t.x} y={chartData.H - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground" style={{ fontSize: 8 }}
                >
                  {t.label}
                </text>
              ))}

              {/* Layer area fills */}
              {chartData.layerAreas
                .filter((l) => layersVisible[l.key])
                .map((l) => (
                  <path key={`fill-${l.key}`} d={l.area} fill={l.colorFill} />
                ))}

              {/* Layer stroke paths */}
              {chartData.layerAreas
                .filter((l) => layersVisible[l.key])
                .map((l) => (
                  <path
                    key={`stroke-${l.key}`} d={l.path}
                    fill="none" stroke={l.color} strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

              {/* Options unrealized dashed line */}
              {layersVisible.options && chartData.optionsUnrealPath && (
                <path
                  d={chartData.optionsUnrealPath}
                  fill="none" stroke={GROWTH_LAYERS[0]!.color}
                  strokeWidth="1.5" strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Total line (white, thicker) */}
              <path
                d={chartData.totalPath}
                fill="none" stroke="white" strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />

              {/* Hit surface */}
              <rect
                x={0} y={0}
                width={chartData.W} height={chartData.H}
                fill="transparent"
                onPointerMove={onPointer}
                onPointerLeave={onPointer}
                onPointerCancel={onPointer}
              />

              {/* Hover crosshair + dot */}
              {hoverHit && (
                <g pointerEvents="none">
                  <line
                    x1={hoverHit.cx} x2={hoverHit.cx}
                    y1={chartData.PT} y2={chartData.H - chartData.PB}
                    className="stroke-muted-foreground/50" strokeWidth="0.5"
                  />
                  <circle
                    cx={hoverHit.cx} cy={hoverHit.cyTotal} r={4}
                    className="fill-foreground stroke-background" strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            {/* Tooltip */}
            {hoverPt && tipPos && (
              <Tooltip
                pt={hoverPt}
                pos={tipPos}
                isPct={isPct}
                layersVisible={layersVisible}
              />
            )}
          </div>

          {/* FI Bar Panel (right) */}
          {fiBarData && (
            <FiBarPanel data={fiBarData} />
          )}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════ Tooltip ═══════════════ */

function Tooltip({
  pt, pos, isPct, layersVisible,
}: {
  pt: GrowthPoint
  pos: TipPos
  isPct: boolean
  layersVisible: Record<GrowthLayer, boolean>
}) {
  const dateLong = (() => {
    const [yy, mm, dd] = pt.dateStr.split('-').map(Number)
    return new Date(yy, mm - 1, dd).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  })()

  const translate =
    pos.anchor === 'right'
      ? 'translate(-100%, -100%)'
      : pos.anchor === 'left'
        ? 'translate(0, -100%)'
        : 'translate(-50%, -100%)'

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-md border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 text-[11px] leading-snug text-popover-foreground shadow-lg min-w-[200px] max-w-[280px]"
      style={{ left: pos.left, top: pos.top - 12, transform: translate }}
      role="tooltip"
    >
      <div className="font-semibold text-xs mb-1.5 text-foreground">{dateLong}</div>
      <div className="flex flex-col gap-0.5">
        {GROWTH_LAYERS.filter((l) => layersVisible[l.key]).map((l) => (
          <div key={l.key} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="tabular-nums font-medium" style={{ color: l.color }}>
              {fmtLayerValue(l.key, pt[l.key], isPct)}
            </span>
          </div>
        ))}

        {layersVisible.options && (
          <>
            <div className="flex justify-between gap-3 opacity-60">
              <span className="text-muted-foreground pl-2">U start (R0)</span>
              <span className="tabular-nums">
                {isPct ? `${pt.optionsUnrealMonthStart.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthStart)}
              </span>
            </div>
            <div className="flex justify-between gap-3 opacity-60">
              <span className="text-muted-foreground pl-2">U extra (sum in month)</span>
              <span className="tabular-nums">
                {isPct ? `${pt.optionsUnrealMonthDelta.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthDelta)}
              </span>
            </div>
            <div className="flex justify-between gap-3 opacity-75 border-b border-border/40 pb-0.5">
              <span className="text-muted-foreground pl-2">U total (dashed)</span>
              <span className="tabular-nums font-medium">
                {isPct ? `${pt.optionsUnrealMonthAnchored.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthAnchored)}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between gap-3 pt-0.5 font-medium text-foreground">
          <span>Total</span>
          <span className="tabular-nums">
            {isPct ? `${pt.totalVisible.toFixed(2)}%` : fmtPnl(pt.totalRawVisible)}
          </span>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>Net (all four)</span>
          <span className="tabular-nums">{fmtPnl(pt.totalRaw)}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ FI Bar Panel ═══════════════ */

const BAR_TONE_CLASSES: Record<string, string> = {
  pos: 'fill-amber-500',
  neg: 'fill-red-500',
  zero: 'fill-muted-foreground/40',
}

const BAR_TEXT_TONE_CLASSES: Record<string, string> = {
  pos: 'fill-amber-400',
  neg: 'fill-red-400',
  zero: 'fill-muted-foreground',
}

function FiBarPanel({ data }: { data: FiBarChartData }) {
  return (
    <div
      className="flex flex-col border-l border-border px-2 py-2 shrink-0"
      style={{ width: Math.max(180, data.W + 16) }}
      aria-label="Fixed income notional by month"
    >
      <div className="mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          FIXED INCOME
        </span>
        <p className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5">
          {data.useRatio
            ? 'Monthly notional vs capital base (annualized % or $).'
            : 'Monthly signed notional (USD).'}
        </p>
      </div>

      <svg
        className="w-full h-auto"
        viewBox={`0 0 ${data.W} ${data.H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          data.useRatio
            ? 'Fixed income monthly notional annualized'
            : 'Fixed income monthly signed notional USD'
        }
      >
        {/* Y-axis labels */}
        <text
          x={4} y={data.plotTop + 8}
          textAnchor="start" dominantBaseline="auto"
          className="fill-muted-foreground" style={{ fontSize: 7 }}
        >
          {data.yTopLabel}
        </text>
        <text
          x={4} y={data.plotBottom - 4}
          textAnchor="start" dominantBaseline="auto"
          className="fill-muted-foreground" style={{ fontSize: 7 }}
        >
          {data.yBotLabel}
        </text>

        {/* Zero line */}
        <line
          x1={data.plotX0} x2={data.W - data.PR}
          y1={data.zeroY} y2={data.zeroY}
          className="stroke-muted-foreground/40" strokeWidth="0.5"
        />

        {/* Bars */}
        {data.bars.map((b) => (
          <g key={b.key}>
            {b.h > 0 && (
              <rect
                className={BAR_TONE_CLASSES[b.tone]}
                x={b.x} y={b.y} width={b.w} height={b.h} rx={1}
              >
                <title>
                  {data.useRatio
                    ? `${b.label}: ${(100 * b.annualizedRatio).toFixed(2)}%`
                    : `${b.label}: ${fmtPnl(b.monthlyNotional)}`}
                </title>
              </rect>
            )}
            <text
              className={BAR_TEXT_TONE_CLASSES[b.tone]}
              x={b.valueX} y={b.labelY}
              textAnchor="middle" dominantBaseline="auto"
              style={{ fontSize: 7 }}
            >
              {b.valueLine}
            </text>
            {b.showXLabel && (
              <text
                x={b.x + b.w / 2} y={data.H - 6}
                textAnchor="middle"
                className="fill-muted-foreground" style={{ fontSize: 7 }}
              >
                {b.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
