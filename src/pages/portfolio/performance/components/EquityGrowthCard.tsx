import { useState, useCallback, useRef, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { SegmentControl } from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { EquityGrowthChartData, GrowthLayer, GrowthPoint, OptionsPnLMode } from '@/utils/ledger/equityGrowthChart'
import { GROWTH_LAYERS, GROWTH_TOTAL_AREA_FILL } from '@/utils/ledger/equityGrowthChart'
import type { FiBarChartData } from '@/utils/ledger/fiBarChart'
import { EQUITY_GROWTH_INFO } from '@/pages/portfolio/performance/performanceConstants'
import { fmtPnl, fmtUsd } from '@/pages/portfolio/performance/performanceFormatters'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'
import styles from './equityGrowth.module.css'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `Jul → Sep 2026`, `Sep 2026`, or `Nov 2025 → Feb 2026`. */
function rangeTitle(firstDate: string, lastDate: string): string {
  const [fy, fm] = firstDate.split('-').map(Number)
  const [ly, lm] = lastDate.split('-').map(Number)
  if (!fy || !ly) return ''
  const f = MONTH_SHORT[fm - 1]
  const l = MONTH_SHORT[lm - 1]
  if (fy === ly && fm === lm) return `${l} ${ly}`
  return fy === ly ? `${f} → ${l} ${ly}` : `${f} ${fy} → ${l} ${ly}`
}

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
  optionsPnLMode: OptionsPnLMode
  onOptionsPnLModeChange: (mode: OptionsPnLMode) => void
}

interface TipPos {
  left: number
  top: number
  anchor: 'left' | 'center' | 'right'
}

const FI_BAR_INFO_RATIO =
  'Uses the same % / $ control as Portfolio Equity Growth (top right). $: bar height and labels are that period\'s total Fixed Income Stream (BUY +, SELL −; same S as the gold line). Bars aggregate by Time Range: Quarter/Half year = month, Year = quarter, 3 Years = year. %: ann. ratio = (period Stream ÷ current Fixed income position value) × (365 ÷ days in period).'

const FI_BAR_INFO_USD =
  'Bar height and caption: period total Fixed Income Stream (US$)—money flow into/out of the FI bucket (BUY positive, SELL negative). Grain follows Time Range (month / quarter / year). Load current Fixed income STK positions to enable ann. % mode for this panel.'

export function EquityGrowthCard({
  chartData,
  fiBarData,
  growthUnit,
  onGrowthUnitChange,
  layersVisible,
  onLayerToggle,
  optionsPnLMode,
  onOptionsPnLModeChange,
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

  const totalLabel = isPct ? `${last.totalVisible.toFixed(2)}%` : fmtPnl(last.totalRawVisible)

  return (
    <section className={perfUi.panel} aria-label="Portfolio equity growth">
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap}>Portfolio equity growth</span>
        <span className={perfUi.panelTitle}>{rangeTitle(chartData.first.dateStr, last.dateStr)}</span>
        <SegmentControl
          size="xs"
          ariaLabel="Options PnL path Book Economic or Total"
          options={[
            { value: 'book', label: 'Book' },
            { value: 'economic', label: 'Economic' },
            { value: 'total', label: 'Total' },
          ]}
          value={optionsPnLMode}
          onChange={(v) => onOptionsPnLModeChange(v as OptionsPnLMode)}
        />
        <SegmentControl
          size="xs"
          ariaLabel="Growth chart and Fixed Income Stream bar units"
          options={[
            { value: 'usd', label: '$' },
            { value: 'pct', label: '%', disabled: !chartData.hasCapitalBase },
          ]}
          value={growthUnit}
          onChange={(v) => onGrowthUnitChange(v as 'pct' | 'usd')}
        />
        <span className="inline-flex items-center gap-1 text-dense-meta text-muted-foreground">
          how the Total line is built
          <InfoTooltip text={EQUITY_GROWTH_INFO} />
        </span>
        <span className="max-w-64 text-dense-caption text-muted-foreground text-pretty">
          Both switches reach this curve only. The monthly table and the calendar below stay in dollars, on Book.
        </span>
        <span className="ml-auto flex gap-3.5">
          <span className="flex flex-col items-end">
            <span className={perfUi.cap}>Total</span>
            <span className={cn(perfUi.mono, 'text-sm font-bold', pnlColorClass(last.totalRawVisible))}>{totalLabel}</span>
          </span>
          <span className="flex flex-col items-end">
            <span className={perfUi.cap}>Net PnL</span>
            <span className={cn(perfUi.mono, 'text-sm font-bold', pnlColorClass(last.totalRaw))}>{fmtPnl(last.totalRaw)}</span>
          </span>
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-x-3 gap-y-2.5 px-3 pt-2.5 pb-3">
          <div className={cn(styles.chartWrap, 'flex-[1_1_21rem] pr-14')} ref={wrapRef}>
            <svg
              className={styles.growthChart}
              viewBox={`0 0 ${chartData.W} ${chartData.H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Portfolio equity growth from ${chartData.first.dateLabel} to ${chartData.last.dateLabel}`}
            >
              {chartData.gridLines.map((gl, i) => (
                <Fragment key={i}>
                  <line
                    x1={chartData.PL} x2={chartData.W - chartData.PR}
                    y1={gl.y} y2={gl.y}
                    className={styles.gridLine}
                    vectorEffect="non-scaling-stroke"
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
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* The one fill: under the Total line. Layers are lines told apart by hue, weight and dash. */}
              <path d={chartData.totalArea} fill={GROWTH_TOTAL_AREA_FILL} stroke="none" />

              {chartData.layerAreas
                .filter((l) => layersVisible[l.key])
                .map((l) => {
                  const def = GROWTH_LAYERS.find((g) => g.key === l.key)!
                  return (
                    <path
                      key={`stroke-${l.key}`} d={l.path}
                      fill="none" stroke={l.color} strokeWidth={def.strokeWidth}
                      strokeDasharray={def.dash}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                })}

              {layersVisible.options && chartData.optionsUnrealPath && (
                <path
                  d={chartData.optionsUnrealPath}
                  fill="none" stroke="var(--muted-foreground)"
                  strokeWidth="1" strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              <path
                d={chartData.netPath}
                fill="none" stroke="var(--muted-foreground)"
                strokeWidth="1.25" strokeDasharray="6 3"
                vectorEffect="non-scaling-stroke"
              />

              <path
                d={chartData.totalPath}
                fill="none" stroke="var(--foreground)" strokeWidth="2.25"
                strokeLinejoin="round"
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

            {chartData.endMarks.map((m) => (
              <span
                key={m.label}
                className={cn(
                  perfUi.mono,
                  'pointer-events-none absolute right-0 -translate-y-1/2 whitespace-nowrap text-dense-caption',
                  m.kind === 'total' ? 'font-bold text-foreground' : m.kind === 'net' ? 'text-muted-foreground' : 'font-semibold',
                )}
                style={{ top: `${(m.y / chartData.H) * 100}%`, color: m.kind === 'layer' ? m.color : undefined }}
              >
                {m.label}
              </span>
            ))}

            {hoverPt && tipPos && (
              <Tooltip
                pt={hoverPt}
                pos={tipPos}
                isPct={isPct}
                layersVisible={layersVisible}
                optionsPnLMode={optionsPnLMode}
              />
            )}
          </div>

          {fiBarData && <FiBarPanel data={fiBarData} />}

        <div
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2"
          aria-label="PnL by asset class"
        >
          <span className={perfUi.cap}>PnL by asset class</span>
          {GROWTH_LAYERS.map((l) => {
            const on = layersVisible[l.key]
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                onClick={() => onLayerToggle(l.key)}
                title={`${on ? 'Drop' : 'Add'} ${l.label} on the curve`}
                className="flex cursor-pointer items-center gap-1.75 rounded-sm border-0 bg-transparent px-1 py-0.75 text-left hover:bg-secondary/40"
              >
                <span
                  className="h-2.75 w-2.75 flex-none rounded-[2px] border"
                  style={{ background: on ? l.color : 'transparent', borderColor: on ? l.color : 'var(--muted-foreground)' }}
                />
                <svg width="16" height="6" className="flex-none" aria-hidden>
                  <line x1="0" y1="3" x2="16" y2="3" stroke={l.color} strokeWidth={l.strokeWidth} strokeDasharray={l.dash} />
                </svg>
                <span className="text-xs" style={{ color: on ? l.color : 'var(--muted-foreground)' }}>{l.label}</span>
                <span className={cn(perfUi.mono, 'text-xs', pnlColorClass(last[l.key]))}>
                  {fmtLayerValue(l.key, last[l.key], isPct)}
                </span>
              </button>
            )
          })}
          <span className="flex items-center gap-1.75 px-1">
            <svg width="16" height="6" className="flex-none" aria-hidden>
              <line x1="0" y1="3" x2="16" y2="3" stroke="var(--foreground)" strokeWidth="2.25" />
            </svg>
            <span className="text-xs text-foreground">Total</span>
            <span className={cn(perfUi.mono, 'text-xs font-bold text-foreground')}>{totalLabel}</span>
          </span>
          <span className="flex items-center gap-1.75 px-1" title="Full book — not filtered by the switches">
            <svg width="16" height="6" className="flex-none" aria-hidden>
              <line x1="0" y1="3" x2="16" y2="3" stroke="var(--muted-foreground)" strokeWidth="1.25" strokeDasharray="6 3" />
            </svg>
            <span className="text-xs text-muted-foreground">Net PnL</span>
            <span className={cn(perfUi.mono, 'text-xs text-muted-foreground')}>{fmtPnl(last.totalRaw)}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function Tooltip({
  pt, pos, isPct, layersVisible, optionsPnLMode,
}: {
  pt: GrowthPoint
  pos: TipPos
  isPct: boolean
  layersVisible: Record<GrowthLayer, boolean>
  optionsPnLMode: OptionsPnLMode
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

        {optionsPnLMode === 'economic' && pt.optionsRollCount > 0 && (
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>
              Rolls: {pt.optionsRollCount}
            </span>
            <span className={styles.tooltipValue}>
              net cash {fmtPnl(pt.optionsCashRoll)}
            </span>
          </div>
        )}
        {optionsPnLMode === 'total' && (
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Options Total</span>
            <span className={styles.tooltipValue}>Σ R + Open as of day</span>
          </div>
        )}

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
          <span className={styles.tooltipLabel}>Net (all four, Book)</span>
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

  const rangeTotal = data.bars.reduce((sum, bar) => sum + bar.monthlyNotional, 0)
  return (
    <div className={styles.fiBarPanel} aria-label={`Fixed Income Stream by ${data.bucket}`}>
      <div className="flex flex-col gap-0.5 pb-1">
        <span className="inline-flex items-center gap-1">
          <span className={perfUi.cap}>Fixed income stream</span>
          <InfoTooltip text={data.useRatio ? FI_BAR_INFO_RATIO : FI_BAR_INFO_USD} />
        </span>
        <span className="text-dense-caption text-muted-foreground">cash in and out per {data.bucket} · not P&amp;L</span>
      </div>

      <svg
        className={cn(styles.fiBarChart, data.fiAnnMode && styles.fiBarChartAnn)}
        viewBox={`0 0 ${data.W} ${data.H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          data.useRatio
            ? `Fixed Income Stream ${data.bucket} flow versus capital base, annualized percentage and dollar stream`
            : `Fixed Income Stream ${data.bucket} money flow in US dollars (BUY positive, SELL negative)`
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
            {b.h > 0 && b.tone === 'pos' && (
              <line className={styles.fiBarCap} x1={b.x} x2={b.x + b.w} y1={b.y + 1} y2={b.y + 1} />
            )}
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
            {b.showValueCaption && (
              <text
                className={captionClass(b.tone)}
                x={b.valueX} y={b.labelY}
                textAnchor="middle" dominantBaseline="auto"
              >
                {b.valueLine}
              </text>
            )}
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
      <span className={cn(perfUi.mono, 'border-t border-border/60 pt-1 text-dense-meta text-muted-foreground')}>
        range total {fmtUsd(rangeTotal)}
      </span>
    </div>
  )
}
