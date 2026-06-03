import { useState, useCallback, useRef, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { EquityGrowthChartData, GrowthLayer, GrowthPoint } from '@/utils/ledger/equityGrowthChart'
import { GROWTH_LAYERS } from '@/utils/ledger/equityGrowthChart'
import type { FiBarChartData } from '@/utils/ledger/fiBarChart'
import { EQUITY_GROWTH_INFO } from '@/pages/portfolio/performance/performanceConstants'
import { fmtPnl, fmtUsd } from '@/pages/portfolio/performance/performanceFormatters'
import styles from './equityGrowth.module.css'

function fmtLayerValue(key: GrowthLayer, v: number, isPct: boolean): string {
  if (isPct) return `${v.toFixed(2)}%`
  if (key === 'fixed_income') return fmtUsd(v)
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

const FI_BAR_INFO_RATIO =
  'Uses the same % / $ control as Portfolio Equity Growth (top right). $: bar height and labels are that month\'s total Fixed Income Stream (BUY +, SELL −; same S as the gold line). %: bar height and labels use ann. ratio = (month Stream ÷ current Fixed income position value) × (365 ÷ days in month).'

const FI_BAR_INFO_USD =
  'Bar height and caption: monthly total Fixed Income Stream (US$)—money flow into/out of the FI bucket (BUY positive, SELL negative). Load current Fixed income STK positions to enable ann. % mode for this panel.'

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
    <section className={styles.growthCard} aria-label="Portfolio equity growth">
      <div className={styles.growthHeader}>
        <div className={styles.titleRow}>
          <h3>Portfolio Equity Growth</h3>
          <InfoTooltip text={EQUITY_GROWTH_INFO} />
        </div>

        <div className={styles.growthControls}>
          <div className={styles.unitToggle} role="group" aria-label="Growth chart and Fixed Income Stream bar units">
            <button
              type="button"
              className={growthUnit === 'pct' ? 'active' : undefined}
              onClick={() => onGrowthUnitChange('pct')}
              disabled={!chartData.hasCapitalBase}
            >
              %
            </button>
            <button
              type="button"
              className={growthUnit === 'usd' ? 'active' : undefined}
              onClick={() => onGrowthUnitChange('usd')}
            >
              $
            </button>
          </div>

          <div className={styles.kpis}>
            <span>
              Total
              <strong className={pnlColorClass(last.totalRawVisible)}>
                {isPct ? `${last.totalVisible.toFixed(2)}%` : fmtPnl(last.totalRawVisible)}
              </strong>
            </span>
            <span>
              Net PnL
              <strong className={pnlColorClass(last.totalRaw)}>
                {fmtPnl(last.totalRaw)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.growthBody}>
        <div className={styles.legendSide} aria-label="Equity growth legend">
          <span className={styles.legendHint}>PnL by asset class</span>
          {GROWTH_LAYERS.map((l) => {
            const on = layersVisible[l.key]
            const val = last[l.key]
            return (
              <label
                key={l.key}
                className={cn(styles.legendRow, !on && styles.legendRowOff)}
              >
                <input
                  type="checkbox"
                  className={styles.legendCheckbox}
                  checked={on}
                  onChange={() => onLayerToggle(l.key)}
                  aria-label={`Plot ${l.label}`}
                />
                <span className={styles.legendSwatch} style={{ background: l.color }} />
                <span className={styles.legendLabel} style={{ color: l.color }}>{l.label}</span>
                <span className={styles.legendValue} style={{ color: l.color }}>
                  {fmtLayerValue(l.key, val, isPct)}
                </span>
              </label>
            )
          })}
          <div className={cn(styles.legendRow, styles.legendRowTotal)}>
            <span className={styles.legendSwatch} style={{ background: 'rgb(255,255,255)' }} />
            <span className={styles.legendLabel}>Total</span>
            <span className={styles.legendValue}>
              {isPct ? `${last.totalVisible.toFixed(2)}%` : fmtPnl(last.totalRawVisible)}
            </span>
          </div>
        </div>

        <div className={styles.mainCharts}>
          <div className={styles.chartWrap} ref={wrapRef}>
            <svg
              className={styles.growthChart}
              viewBox={`0 0 ${chartData.W} ${chartData.H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Portfolio equity growth from ${chartData.first.dateLabel} to ${chartData.last.dateLabel}`}
            >
              <g aria-hidden="true">
                {chartData.monthBands.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x1}
                    y={chartData.PT}
                    width={Math.max(0, b.x2 - b.x1)}
                    height={chartData.chartH}
                    className={b.alt ? styles.monthBandAlt : undefined}
                    fill={b.alt ? undefined : 'transparent'}
                  />
                ))}
              </g>

              {chartData.gridLines.map((gl, i) => (
                <Fragment key={i}>
                  <line
                    x1={chartData.PL} x2={chartData.W - chartData.PR}
                    y1={gl.y} y2={gl.y}
                    className={styles.gridLine}
                  />
                  <text
                    x={chartData.PL + 4} y={gl.y - 4}
                    textAnchor="start" dominantBaseline="auto"
                    className={styles.yLabel}
                  >
                    {gl.label}
                  </text>
                </Fragment>
              ))}

              {chartData.zeroY != null && (
                <line
                  x1={chartData.PL} x2={chartData.W - chartData.PR}
                  y1={chartData.zeroY} y2={chartData.zeroY}
                  className={styles.zeroLine}
                />
              )}

              {chartData.xTicks.map((t, i) => (
                <text
                  key={i} x={t.x} y={chartData.H - 4}
                  textAnchor="middle"
                  className={styles.xLabel}
                >
                  {t.label}
                </text>
              ))}

              {chartData.layerAreas
                .filter((l) => layersVisible[l.key])
                .map((l) => (
                  <path key={`fill-${l.key}`} d={l.area} fill={l.colorFill} />
                ))}

              {chartData.layerAreas
                .filter((l) => layersVisible[l.key])
                .map((l) => (
                  <path
                    key={`stroke-${l.key}`} d={l.path}
                    fill="none" stroke={l.color} strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

              {layersVisible.options && chartData.optionsUnrealPath && (
                <path
                  d={chartData.optionsUnrealPath}
                  fill="none" stroke={GROWTH_LAYERS[0]!.color}
                  strokeWidth="1.5" strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.92}
                />
              )}

              <path
                d={chartData.totalPath}
                fill="none" stroke="white" strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />

              <rect
                className={styles.chartHitSurface}
                x={0} y={0}
                width={chartData.W} height={chartData.H}
                fill="transparent"
                onPointerMove={onPointer}
                onPointerLeave={onPointer}
                onPointerCancel={onPointer}
              />

              {hoverHit && (
                <g pointerEvents="none">
                  <line
                    x1={hoverHit.cx} x2={hoverHit.cx}
                    y1={chartData.PT} y2={chartData.H - chartData.PB}
                    className={styles.hoverXline}
                  />
                  <circle
                    cx={hoverHit.cx} cy={hoverHit.cyTotal} r={4}
                    className={styles.hoverDot}
                  />
                </g>
              )}
            </svg>

            {hoverPt && tipPos && (
              <Tooltip
                pt={hoverPt}
                pos={tipPos}
                isPct={isPct}
                layersVisible={layersVisible}
              />
            )}
          </div>

          {fiBarData && <FiBarPanel data={fiBarData} />}
        </div>
      </div>
    </section>
  )
}

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

  return (
    <div
      className={cn(
        styles.tooltip,
        pos.anchor === 'left' && styles.tooltipAnchorLeft,
        pos.anchor === 'right' && styles.tooltipAnchorRight,
      )}
      style={{ left: pos.left, top: pos.top }}
      role="tooltip"
    >
      <div className={styles.tooltipDate}>{dateLong}</div>
      <div className={styles.tooltipRows}>
        {GROWTH_LAYERS.filter((l) => layersVisible[l.key]).map((l) => (
          <div key={l.key} className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>{l.label}</span>
            <span className={styles.tooltipValue} style={{ color: l.color }}>
              {fmtLayerValue(l.key, pt[l.key], isPct)}
            </span>
          </div>
        ))}

        {layersVisible.options && (
          <>
            <div className={cn(styles.tooltipRow, styles.tooltipRowUnreal)}>
              <span className={styles.tooltipLabel}>U start (R0)</span>
              <span className={styles.tooltipValue}>
                {isPct ? `${pt.optionsUnrealMonthStart.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthStart)}
              </span>
            </div>
            <div className={cn(styles.tooltipRow, styles.tooltipRowUnreal)}>
              <span className={styles.tooltipLabel}>U extra (sum in month)</span>
              <span className={styles.tooltipValue}>
                {isPct ? `${pt.optionsUnrealMonthDelta.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthDelta)}
              </span>
            </div>
            <div className={cn(styles.tooltipRow, styles.tooltipRowUnreal, styles.tooltipRowUnrealTotal)}>
              <span className={styles.tooltipLabel}>U total (dashed)</span>
              <span className={styles.tooltipValue}>
                {isPct ? `${pt.optionsUnrealMonthAnchored.toFixed(2)}%` : fmtPnl(pt.optionsUnrealMonthAnchored)}
              </span>
            </div>
          </>
        )}

        <div className={cn(styles.tooltipRow, styles.tooltipRowTotal)}>
          <span className={styles.tooltipLabel}>Total</span>
          <span className={styles.tooltipValue}>
            {isPct ? `${pt.totalVisible.toFixed(2)}%` : fmtPnl(pt.totalRawVisible)}
          </span>
        </div>
        <div className={cn(styles.tooltipRow, styles.tooltipRowNet)}>
          <span className={styles.tooltipLabel}>Net (all four)</span>
          <span className={styles.tooltipValue}>{fmtPnl(pt.totalRaw)}</span>
        </div>
      </div>
    </div>
  )
}

function FiBarPanel({ data }: { data: FiBarChartData }) {
  const barClass = (tone: FiBarChartData['bars'][number]['tone']) =>
    cn(styles.fiBar, {
      [styles.fiBarPos]: tone === 'pos',
      [styles.fiBarNeg]: tone === 'neg',
      [styles.fiBarZero]: tone === 'zero',
    })

  const captionClass = (tone: FiBarChartData['bars'][number]['tone']) =>
    cn(styles.fiBarCaption, {
      [styles.fiBarCaptionPos]: tone === 'pos',
      [styles.fiBarCaptionNeg]: tone === 'neg',
      [styles.fiBarCaptionZero]: tone === 'zero',
    })

  return (
    <div className={styles.fiBarPanel} aria-label="Fixed Income Stream by month">
      <div className={styles.fiBarHead}>
        <div className={styles.fiBarTitleRow}>
          <span className={styles.fiBarKicker}>Fixed Income Stream</span>
          <InfoTooltip text={data.useRatio ? FI_BAR_INFO_RATIO : FI_BAR_INFO_USD} />
        </div>
      </div>

      <svg
        className={cn(styles.fiBarChart, data.fiAnnMode && styles.fiBarChartAnn)}
        viewBox={`0 0 ${data.W} ${data.H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          data.useRatio
            ? 'Fixed Income Stream monthly flow versus capital base, annualized percentage and dollar stream'
            : 'Fixed Income Stream monthly money flow in US dollars (BUY positive, SELL negative)'
        }
      >
        <text
          className={styles.fiYaxis}
          x={4} y={data.plotTop + 8}
          textAnchor="start" dominantBaseline="auto"
        >
          {data.yTopLabel}
        </text>
        <text
          className={styles.fiYaxis}
          x={4} y={data.plotBottom - 4}
          textAnchor="start" dominantBaseline="auto"
        >
          {data.yBotLabel}
        </text>

        <line
          className={styles.fiZeroLine}
          x1={data.plotX0} x2={data.W - data.PR}
          y1={data.zeroY} y2={data.zeroY}
        />

        {data.bars.map((b) => (
          <g key={b.key}>
            {b.h > 0 && (
              <rect
                className={barClass(b.tone)}
                x={b.x} y={b.y} width={b.w} height={b.h} rx={1}
              >
                <title>
                  {data.useRatio
                    ? `${b.label}: ${(100 * b.annualizedRatio).toFixed(2)}%`
                    : `${b.label}: ${fmtUsd(b.monthlyNotional)}`}
                </title>
              </rect>
            )}
            <text
              className={captionClass(b.tone)}
              x={b.valueX} y={b.labelY}
              textAnchor="middle" dominantBaseline="auto"
            >
              {b.valueLine}
            </text>
            {b.showXLabel && (
              <text
                className={styles.fiXlabel}
                x={b.x + b.w / 2} y={data.H - 6}
                textAnchor="middle"
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
