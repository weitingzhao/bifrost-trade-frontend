import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryIconButton } from '@/components/optionDiscovery/DiscoveryIconButton'
import { DiscoverySection } from '@/components/optionDiscovery/DiscoverySection'
/* eslint-disable react-hooks/set-state-in-effect -- max pain panel async load cycle */
import {
  fetchMaxPainCompute,
  fetchMaxPainComputeHistory,
  pollMassiveJobUntilDone,
  postMassiveSync,
  resolveMassiveSyncJobId,
} from '@/api/research/optionDiscovery'
import type { MaxPainComputeResponse, MaxPainHistoryPoint, MaxPainStrikePoint } from '@/types/optionDiscovery'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  OD_MAX_PAIN_AXIS_FONT,
  OD_MAX_PAIN_PAD_LIABILITY_OI,
  OD_MAX_PAIN_PAD_TREND,
  OD_MAX_PAIN_VIEWBOX_H,
  OD_MAX_PAIN_VIEWBOX_W,
} from './odChartConstants'
import { OdChartExpandOnHover } from './OdChartExpandOnHover'
import { chartAxisTitleFill, chartSurfaceFill } from '@/lib/chartTokens'
import {
  optionDiscoveryMaxPainChartCellClass,
  optionDiscoveryMaxPainCorpWarnClass,
  optionDiscoveryMaxPainDisclaimerBodyClass,
  optionDiscoveryMaxPainDisclaimerDetailsClass,
  optionDiscoveryMaxPainDisclaimerSummaryClass,
  optionDiscoveryMaxPainHeaderActionsClass,
  optionDiscoveryMaxPainHeaderRowClass,
  optionDiscoveryMaxPainSectionClass,
  optionDiscoveryMaxPainTitleClass,
  optionDiscoveryMaxPainTitleExpClass,
} from './optionDiscoveryUi'

const AXIS_FILL = 'var(--od-max-pain-axis-fill, var(--muted-foreground))'

/** X-axis tick row (below plot, above axis title) */
function mpPainXTickY(viewH: number) {
  return viewH - 38
}

/** Bottom axis title row (“Strike”, etc.) */
function mpPainXTitleY(viewH: number) {
  return viewH - 11
}

const DISCLAIMER =
  'Disclaimer: Max Pain is a theoretical reference metric based on end-of-day open interest data. It does not predict future price movement and should not be used as the sole basis for trading decisions. Open interest data is sourced from Massive (Polygon) with approximately 15-minute delay. Corporate actions (splits, special dividends) may affect strike prices and contract multipliers.'

function scaleLin(v: number, vmin: number, vmax: number, outMin: number, outMax: number): number {
  if (!Number.isFinite(v)) return (outMin + outMax) / 2
  if (vmax <= vmin) return (outMin + outMax) / 2
  return outMin + ((v - vmin) / (vmax - vmin)) * (outMax - outMin)
}

function fmtDollarCompact(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function pickXTickIndices(n: number, maxTicks: number): number[] {
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i)
  const step = (n - 1) / (maxTicks - 1)
  return Array.from({ length: maxTicks }, (_, i) => Math.round(i * step))
}

/** OptionCharts-style stacked bar chart: Call liability (green) + Put liability (red) per strike. */
function LiabilityByStrikeSvg({
  points,
  maxPainStrike,
  underlyingClose,
}: {
  points: MaxPainStrikePoint[]
  maxPainStrike: number
  underlyingClose: number | null
}) {
  const w = OD_MAX_PAIN_VIEWBOX_W
  const h = OD_MAX_PAIN_VIEWBOX_H
  const pad = OD_MAX_PAIN_PAD_LIABILITY_OI
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  if (points.length === 0) return null

  const strikes = points.map(p => p.strike)
  const minS = Math.min(...strikes)
  const maxS = Math.max(...strikes)
  const maxPain = Math.max(1, ...points.map(p => p.pain))

  const n = points.length
  const gap = Math.max(1, innerW * 0.12 / Math.max(n, 1))
  const barW = Math.max(2, (innerW - gap * (n - 1)) / n)
  const halfBar = barW / 2

  const xForStrike = (s: number) => pad.l + scaleLin(s, minS, maxS, halfBar, innerW - halfBar)

  const yTicks = 4
  const yStep = maxPain / yTicks
  const gridLines: ReactElement[] = []
  const yLabels: ReactElement[] = []
  for (let i = 0; i <= yTicks; i++) {
    const val = yStep * i
    const y = pad.t + innerH - scaleLin(val, 0, maxPain, 0, innerH)
    if (i > 0) {
      gridLines.push(
        <line key={`g-${i}`} x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
          stroke="var(--od-max-pain-grid-stroke, var(--color-border-strong))" strokeWidth={0.5} strokeDasharray="3 3" />,
      )
    }
    yLabels.push(
      <text
        key={`yl-${i}`}
        x={pad.l - 10}
        y={y + 4}
        textAnchor="end"
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        dominantBaseline="middle"
      >
        {fmtDollarCompact(val)}
      </text>,
    )
  }

  const xTickIdxs = pickXTickIndices(n, 8)

  const mpX = xForStrike(maxPainStrike)
  const ucInRange = underlyingClose != null && Number.isFinite(underlyingClose) &&
    underlyingClose >= minS && underlyingClose <= maxS
  const ucX = ucInRange ? xForStrike(underlyingClose!) : null

  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`}
      aria-label="Seller liability by strike — stacked Call (green) and Put (red) with Max Pain and spot price markers">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />

      {gridLines}
      {yLabels}

      <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />

      {points.map((p, i) => {
        const cx = xForStrike(p.strike)
        const y0 = pad.t + innerH
        const putH = scaleLin(p.pain_put, 0, maxPain, 0, innerH)
        const callH = scaleLin(p.pain_call, 0, maxPain, 0, innerH)
        const isMin = p.strike === maxPainStrike
        return (
          <g key={i}>
            <rect x={cx - halfBar} y={y0 - putH} width={barW} height={Math.max(putH, 0.5)}
              fill={isMin ? '#ef5350' : 'var(--color-lamp-red, #ef5350)'} opacity={isMin ? 1 : 0.72} rx={1} />
            <rect x={cx - halfBar} y={y0 - putH - callH} width={barW} height={Math.max(callH, 0.5)}
              fill={isMin ? '#66bb6a' : 'var(--color-lamp-green, #66bb6a)'} opacity={isMin ? 1 : 0.72} rx={1} />
          </g>
        )
      })}

      {Number.isFinite(mpX) && (
        <line x1={mpX} x2={mpX} y1={pad.t} y2={pad.t + innerH}
          stroke="var(--color-accent, #6ea8fe)" strokeWidth={1.5} strokeDasharray="5 3" />
      )}
      {ucX != null && (
        <line x1={ucX} x2={ucX} y1={pad.t} y2={pad.t + innerH}
          stroke={chartAxisTitleFill} strokeWidth={1.2} strokeDasharray="2 2" />
      )}

      {xTickIdxs.map(i => {
        const p = points[i]
        if (!p) return null
        const x = xForStrike(p.strike)
        return (
          <text
            key={`xt-${i}`}
            x={x}
            y={mpPainXTickY(h)}
            textAnchor="middle"
            fontSize={OD_MAX_PAIN_AXIS_FONT}
            fill={AXIS_FILL}
            dominantBaseline="middle"
          >
            {p.strike % 1 === 0 ? p.strike.toFixed(0) : p.strike.toFixed(1)}
          </text>
        )
      })}

      <text
        x={22}
        y={pad.t + innerH / 2}
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 22 ${pad.t + innerH / 2})`}
      >
        Seller liability ($)
      </text>

      <text
        x={pad.l + innerW / 2}
        y={mpPainXTitleY(h)}
        textAnchor="middle"
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        dominantBaseline="middle"
      >
        Strike
      </text>
    </svg>
  )
}

function LiabilityLegend({ underlyingClose, maxPainStrike }: {
  underlyingClose: number | null
  maxPainStrike: number
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-dense-caption text-muted-foreground" role="presentation">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-green, #66bb6a)' }} />
        Call liability
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-red, #ef5350)' }} />
        Put liability
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium">
        <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: 'var(--primary)' }} />
        Max Pain <strong className="tabular-nums text-foreground">{maxPainStrike.toFixed(2)}</strong>
      </span>
      {underlyingClose != null && Number.isFinite(underlyingClose) && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: chartAxisTitleFill }} />
          Spot {underlyingClose.toFixed(2)}
        </span>
      )}
    </div>
  )
}

function OiBarsSvg({
  points,
  showCall,
  showPut,
}: {
  points: MaxPainStrikePoint[]
  showCall: boolean
  showPut: boolean
}) {
  const w = OD_MAX_PAIN_VIEWBOX_W
  const h = OD_MAX_PAIN_VIEWBOX_H
  const pad = OD_MAX_PAIN_PAD_LIABILITY_OI
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  if ((!showCall && !showPut) || points.length === 0) return null
  const strikes = points.map(p => p.strike)
  const minS = Math.min(...strikes)
  const maxS = Math.max(...strikes)
  const maxOi = Math.max(
    1,
    ...points.map(p => (showCall ? p.call_oi : 0) + (showPut ? p.put_oi : 0)),
  )
  const n = points.length
  const gap = Math.max(1, innerW * 0.12 / Math.max(n, 1))
  const barW = Math.max(2, (innerW - gap * (n - 1)) / n)
  const halfBar = barW / 2
  const xForStrike = (s: number) => pad.l + scaleLin(s, minS, maxS, halfBar, innerW - halfBar)
  const xTickIdxs = pickXTickIndices(n, 8)
  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`} aria-label="Open interest by strike">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />
      <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />
      {points.flatMap((p, i) => {
        const cx = xForStrike(p.strike)
        const y0 = pad.t + innerH
        const out: ReactElement[] = []
        if (showPut && p.put_oi > 0) {
          const bh = scaleLin(p.put_oi, 0, maxOi, 0, innerH)
          out.push(
            <rect key={`p-${i}`} x={cx - halfBar} y={y0 - bh} width={barW} height={bh}
              fill="var(--color-lamp-red)" opacity={0.65} rx={1} />,
          )
        }
        if (showCall && p.call_oi > 0) {
          const putH = showPut ? scaleLin(p.put_oi, 0, maxOi, 0, innerH) : 0
          const bh = scaleLin(p.call_oi, 0, maxOi, 0, innerH)
          out.push(
            <rect key={`c-${i}`} x={cx - halfBar} y={y0 - putH - bh} width={barW} height={bh}
              fill="var(--color-lamp-green)" opacity={0.75} rx={1} />,
          )
        }
        return out
      })}
      {xTickIdxs.map(i => {
        const p = points[i]
        if (!p) return null
        const x = xForStrike(p.strike)
        return (
          <text
            key={`xt-${i}`}
            x={x}
            y={mpPainXTickY(h)}
            textAnchor="middle"
            fontSize={OD_MAX_PAIN_AXIS_FONT}
            fill={AXIS_FILL}
            dominantBaseline="middle"
          >
            {p.strike % 1 === 0 ? p.strike.toFixed(0) : p.strike.toFixed(1)}
          </text>
        )
      })}
      <text
        x={pad.l + innerW / 2}
        y={mpPainXTitleY(h)}
        textAnchor="middle"
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        dominantBaseline="middle"
      >
        Strike
      </text>
      <text
        x={22}
        y={pad.t + innerH / 2}
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 22 ${pad.t + innerH / 2})`}
      >
        Open Interest
      </text>
    </svg>
  )
}

function TrendSvg({ series }: { series: MaxPainHistoryPoint[] }) {
  const w = OD_MAX_PAIN_VIEWBOX_W
  const h = OD_MAX_PAIN_VIEWBOX_H
  const pad = OD_MAX_PAIN_PAD_TREND
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  if (series.length < 2) {
    return <DiscoveryHint className="">Not enough history for trend (need at least 2 days with OI).</DiscoveryHint>
  }
  const mp = series.map(s => s.max_pain_strike)
  const closes = series.map(s => s.underlying_close).filter((x): x is number => x != null && Number.isFinite(x))
  const allVals = [...mp, ...closes]
  const minY = Math.min(...allVals)
  const maxY = Math.max(...allVals)
  const hasClose = closes.length >= 2
  const ptsMp = series
    .map((s, i) => {
      const x = pad.l + scaleLin(i, 0, series.length - 1, 0, innerW)
      const y = pad.t + innerH - scaleLin(s.max_pain_strike, minY, maxY, 0, innerH)
      return `${x},${y}`
    })
    .join(' ')
  const ptsC = hasClose
    ? series
        .map((s, i) => {
          if (s.underlying_close == null || !Number.isFinite(s.underlying_close)) return null
          const x = pad.l + scaleLin(i, 0, series.length - 1, 0, innerW)
          const y = pad.t + innerH - scaleLin(s.underlying_close, minY, maxY, 0, innerH)
          return `${x},${y}`
        })
        .filter(Boolean)
        .join(' ')
    : ''

  const xTickIdxs = pickXTickIndices(series.length, 6)
  const yTicks = 4
  const yStep = (maxY - minY) / yTicks || 1

  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`} aria-label="Max pain vs underlying price trend over time">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />
      <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH}
        stroke="var(--od-max-pain-axis-line, var(--color-border-strong))" strokeWidth={1} />

      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = minY + yStep * i
        const y = pad.t + innerH - scaleLin(val, minY, maxY, 0, innerH)
        return (
          <g key={i}>
            {i > 0 && <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
              stroke="var(--od-max-pain-grid-stroke, var(--color-border-strong))" strokeWidth={0.5} strokeDasharray="3 3" />}
            <text
              x={pad.l - 10}
              y={y + 4}
              textAnchor="end"
              fontSize={OD_MAX_PAIN_AXIS_FONT}
              fill={AXIS_FILL}
              dominantBaseline="middle"
            >
              {val.toFixed(1)}
            </text>
          </g>
        )
      })}

      <polyline fill="none" stroke="var(--color-accent, #6ea8fe)" strokeWidth="2" points={ptsMp} />
      {ptsC && (
        <polyline fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeDasharray="3 2" points={ptsC} />
      )}

      {xTickIdxs.map(i => {
        const s = series[i]
        if (!s) return null
        const x = pad.l + scaleLin(i, 0, series.length - 1, 0, innerW)
        const label = s.trade_date.slice(5)
        return (
          <text
            key={i}
            x={x}
            y={mpPainXTickY(h)}
            textAnchor="middle"
            fontSize={OD_MAX_PAIN_AXIS_FONT}
            fill={AXIS_FILL}
            dominantBaseline="middle"
          >
            {label}
          </text>
        )
      })}

      <text x={w - 14} y={22} textAnchor="end" fontSize={OD_MAX_PAIN_AXIS_FONT}>
        <tspan fill="var(--color-accent, #6ea8fe)">Max Pain</tspan>
        {hasClose ? (
          <>
            <tspan fill="var(--color-text-muted)"> · </tspan>
            <tspan fill="var(--color-text-muted)">Underlying</tspan>
          </>
        ) : null}
      </text>

      <text
        x={22}
        y={pad.t + innerH / 2}
        fontSize={OD_MAX_PAIN_AXIS_FONT}
        fill={AXIS_FILL}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 22 ${pad.t + innerH / 2})`}
      >
        Price
      </text>
    </svg>
  )
}

export function OptionDiscoveryMaxPainPanel({
  symbol,
  expiration,
  massiveConfigured,
}: {
  symbol: string
  expiration: string
  massiveConfigured: boolean
}) {
  const [live, setLive] = useState<MaxPainComputeResponse | null>(null)
  const [hist, setHist] = useState<MaxPainHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [trendCollapsed, setTrendCollapsed] = useState(false)
  const [oiBackfillLoading, setOiBackfillLoading] = useState(false)
  const [oiBackfillMsg, setOiBackfillMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)


  const canLoad = massiveConfigured && symbol.trim() !== '' && expiration.trim() !== ''

  const load = useCallback(async () => {
    if (!canLoad) {
      setLive(null)
      setHist([])
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const [c, h] = await Promise.all([
        fetchMaxPainCompute({ symbol, expiry: expiration }),
        fetchMaxPainComputeHistory({ symbol, expiry: expiration, lookbackDays: 90 }),
      ])
      if (!c.ok) {
        setLive(null)
        setErr(c.error ?? 'Max Pain compute failed')
      } else {
        setLive({ ...c, ok: true })
        setErr(null)
      }
      setHist(h.ok ? h.series : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load Max Pain')
      setLive(null)
      setHist([])
    } finally {
      setLoading(false)
    }
  }, [canLoad, symbol, expiration])

  const backfillOiForSymbol = useCallback(async () => {
    const sym = symbol.trim().toUpperCase()
    if (!massiveConfigured || !sym) return
    setOiBackfillLoading(true)
    setOiBackfillMsg('Backfilling daily OI…')
    setErr(null)
    try {
      const sync = await postMassiveSync('oi', {
        mode: 'watchlist_eod',
        symbols: [sym],
      })
      const jobId = resolveMassiveSyncJobId(sync)
      if (!sync.ok || !jobId) {
        setErr(sync.error ?? sync.message ?? 'Failed to enqueue OI backfill')
        setOiBackfillMsg(null)
        return
      }
      const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 180, intervalMs: 1000 })
      if (!polled.ok) {
        setErr(polled.error ?? 'OI backfill job failed')
        setOiBackfillMsg(null)
        return
      }
      setOiBackfillMsg('OI backfill done. Refreshing Max Pain…')
      await load()
      setOiBackfillMsg(
        'OI backfill finished. Historical Trend needs at least 2 distinct trade dates with OI for this expiry.',
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to backfill OI')
      setOiBackfillMsg(null)
    } finally {
      setOiBackfillLoading(false)
    }
  }, [symbol, massiveConfigured, load])

  useEffect(() => {
    void load()
  }, [load])

  const points = useMemo(() => live?.pain_by_strike ?? [], [live])

  if (!massiveConfigured) {
    return (
      <DiscoverySection className={optionDiscoveryMaxPainSectionClass} aria-label="Max Pain">
        <h3 className={optionDiscoveryMaxPainTitleClass}>
          Max Pain Analysis
          {expiration.trim() ? (
            <span className={optionDiscoveryMaxPainTitleExpClass} aria-label={`Expiration ${expiration}`}>
              · {expiration}
            </span>
          ) : null}
          <InfoTooltip text="Requires Massive API key and EOD open interest in PostgreSQL." />
        </h3>
        <DiscoveryHint className="">Configure Massive under Settings → Feed → Massive Option to enable Max Pain.</DiscoveryHint>
      </DiscoverySection>
    )
  }

  if (!symbol.trim() || !expiration.trim()) {
    return null
  }

  return (
    <DiscoverySection className={optionDiscoveryMaxPainSectionClass} aria-labelledby="od-max-pain-head">
      <div className={optionDiscoveryMaxPainHeaderRowClass}>
        <h3 id="od-max-pain-head" className={optionDiscoveryMaxPainTitleClass}>
          Max Pain Analysis
          {expiration.trim() ? (
            <span className={optionDiscoveryMaxPainTitleExpClass} aria-label={`Expiration ${expiration}`}>
              · {expiration}
            </span>
          ) : null}
          <InfoTooltip text="Based on end-of-day open interest from Massive (15 min delayed source). Computed live from PostgreSQL; not read from stored report rows." />
        </h3>
        <div className={optionDiscoveryMaxPainHeaderActionsClass}>
          <DiscoveryIconButton
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand Max Pain Analysis' : 'Collapse Max Pain Analysis'}
            aria-label={collapsed ? 'Expand Max Pain Analysis' : 'Collapse Max Pain Analysis'}
            aria-expanded={!collapsed}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={collapsed ? 'M9 18l6-6-6-6' : 'M6 9l6 6 6-6'} />
            </svg>
          </DiscoveryIconButton>
          <DiscoveryIconButton
            onClick={() => void backfillOiForSymbol()}
            disabled={loading || oiBackfillLoading}
            title={
              oiBackfillLoading
                ? 'Backfilling OI history for this symbol'
                : 'Backfill OI history for this symbol and refresh trend'
            }
            aria-label={
              oiBackfillLoading
                ? 'Backfilling OI history for this symbol'
                : 'Backfill OI history for this symbol and refresh trend'
            }
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h6" />
              <path d="M16 14l3 3-3 3" />
            </svg>
          </DiscoveryIconButton>
          <DiscoveryIconButton
            onClick={() => void load()}
            disabled={loading || oiBackfillLoading}
            title={loading ? 'Loading max pain' : 'Refresh max pain'}
            aria-label={loading ? 'Loading max pain' : 'Refresh max pain'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </DiscoveryIconButton>
        </div>
      </div>

      {!collapsed && (
        <>
          {oiBackfillMsg ? <DiscoveryHint className="" role="status">{oiBackfillMsg}</DiscoveryHint> : null}
          {loading && !live ? <DiscoveryHint className="">Loading Max Pain…</DiscoveryHint> : null}
          {err ? (
            <DiscoveryHint className="mt-0 text-destructive" role="alert">
              {err}
            </DiscoveryHint>
          ) : null}
          {live?.ok && live.oi_basis === 'chain_snapshot' ? (
            <DiscoveryHint className="" role="status">
              Open interest is taken from the latest chain snapshots in PostgreSQL (same data as loaded quotes). EOD
              daily OI was not available for this expiry; run watchlist EOD OI sync for classic end-of-day OI.
            </DiscoveryHint>
          ) : null}

          {live?.ok && points.length > 0 && (
            <div className="mb-3 w-full">
              <div className="mb-3 w-full">
                <div
                  className="flex flex-nowrap items-end gap-x-4 gap-y-2 overflow-x-auto rounded-lg border border-primary/20 bg-gradient-to-b from-accent/10 to-card p-2 shadow-sm"
                  role="group"
                  aria-label="Max Pain summary"
                >
                  <div className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">Max Pain</span>
                    <strong>{live.max_pain_strike != null ? live.max_pain_strike.toFixed(2) : '—'}</strong>
                  </div>
                  <div className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">Spot</span>
                    <strong>{live.underlying_close != null ? live.underlying_close.toFixed(2) : '—'}</strong>
                  </div>
                  <div className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">Distance</span>
                    <strong>
                      {live.distance_to_max_pain_pct != null ? `${(live.distance_to_max_pain_pct * 100).toFixed(2)}%` : '—'}
                    </strong>
                  </div>
                  <div className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">Total OI</span>
                    <strong>{live.total_oi != null ? live.total_oi.toLocaleString() : '—'}</strong>
                  </div>
                  <div className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">OI as-of</span>
                    <strong>{live.trade_date ?? '—'}</strong>
                  </div>
                </div>
                {live.recent_corporate_action && (
                  <DiscoveryHint className={optionDiscoveryMaxPainCorpWarnClass} role="status">
                    Recent corporate action — verify strikes and multipliers.
                  </DiscoveryHint>
                )}
              </div>

              <div className="w-full min-w-0 overflow-x-auto">
                <div className="grid w-max min-w-full max-w-none grid-cols-3 gap-2 sm:min-w-[48rem]">
                  <div className={cn(optionDiscoveryMaxPainChartCellClass, 'flex min-w-0 flex-col')}>
                    <OdChartExpandOnHover title="Seller Liability by Strike">
                      <>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seller Liability by Strike</h4>
                        <LiabilityLegend underlyingClose={live.underlying_close ?? null} maxPainStrike={live.max_pain_strike ?? 0} />
                        <LiabilityByStrikeSvg points={points} maxPainStrike={live.max_pain_strike ?? 0}
                          underlyingClose={live.underlying_close ?? null} />
                      </>
                    </OdChartExpandOnHover>
                  </div>

                  <div className={cn(optionDiscoveryMaxPainChartCellClass, 'flex min-w-0 flex-col')}>
                    <OdChartExpandOnHover title="Open Interest by Strike">
                      <>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open Interest by Strike</h4>
                        <OiBarsSvg points={points} showCall showPut />
                      </>
                    </OdChartExpandOnHover>
                  </div>

                  <div
                    className={cn(optionDiscoveryMaxPainChartCellClass, 'flex min-w-0 flex-col')}
                    aria-label="Max Pain and underlying trend"
                  >
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="m-0 text-xs font-semibold text-muted-foreground">Max Pain · Underlying</h4>
                      <DiscoveryIconButton
                        onClick={() => setTrendCollapsed(v => !v)}
                        title={trendCollapsed ? 'Expand chart' : 'Collapse chart'}
                        aria-label={trendCollapsed ? 'Expand Max Pain vs underlying chart' : 'Collapse Max Pain vs underlying chart'}
                        aria-expanded={!trendCollapsed}
                        aria-controls="od-max-pain-trend-chart"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d={trendCollapsed ? 'M9 18l6-6-6-6' : 'M6 9l6 6 6-6'} />
                        </svg>
                      </DiscoveryIconButton>
                    </div>
                    {!trendCollapsed && (
                      <div id="od-max-pain-trend-chart">
                        <OdChartExpandOnHover title="Max Pain · Underlying">
                          <TrendSvg series={hist} />
                        </OdChartExpandOnHover>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <details className={optionDiscoveryMaxPainDisclaimerDetailsClass}>
            <summary className={optionDiscoveryMaxPainDisclaimerSummaryClass}>Disclaimer</summary>
            <p className={optionDiscoveryMaxPainDisclaimerBodyClass}>{DISCLAIMER}</p>
          </details>
        </>
      )}
    </DiscoverySection>
  )
}
