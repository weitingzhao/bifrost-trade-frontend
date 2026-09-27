import { useMemo } from 'react'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { DiscoveryHint } from './DiscoveryHint'
import { cn } from '@/lib/utils'
import { chartAxisTitleFill, chartSurfaceFill } from '@/lib/chartTokens'
import { OD_ANALYTICS_AXIS_TICK_FILL, OD_ANALYTICS_AXIS_TITLE_FILL, OD_CHART_AXIS_FONT } from './odChartConstants'

function scaleLin(v: number, vmin: number, vmax: number, outMin: number, outMax: number): number {
  if (!Number.isFinite(v)) return (outMin + outMax) / 2
  if (vmax <= vmin) return (outMin + outMax) / 2
  return outMin + ((v - vmin) / (vmax - vmin)) * (outMax - outMin)
}

function pickXTickIndices(n: number, maxTicks: number): number[] {
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i)
  const step = (n - 1) / (maxTicks - 1)
  return Array.from({ length: maxTicks }, (_, i) => Math.round(i * step))
}

function fmtIv(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function fmtOiCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 100_000) return `${Math.round(n / 1000)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

// ---------------------------------------------------------------------------
// IV Smile Chart
// ---------------------------------------------------------------------------

interface IvPoint { strike: number; iv: number }

export function IvSmileChart({
  rows,
  underlying,
  side = 'both',
}: {
  rows: OptionSnapshotRow[]
  underlying: number | null
  side?: 'call' | 'put' | 'both'
}) {
  const { callPts, putPts } = useMemo(() => {
    const c: IvPoint[] = []
    const p: IvPoint[] = []
    for (const r of rows) {
      if (r.iv == null || !Number.isFinite(r.iv)) continue
      const right = (r.right || '').trim().toUpperCase()
      if (right === 'C' || right === 'CALL') c.push({ strike: r.strike, iv: r.iv })
      else if (right === 'P' || right === 'PUT') p.push({ strike: r.strike, iv: r.iv })
    }
    c.sort((a, b) => a.strike - b.strike)
    p.sort((a, b) => a.strike - b.strike)
    return { callPts: c, putPts: p }
  }, [rows])

  const showCall = side === 'call' || side === 'both'
  const showPut = side === 'put' || side === 'both'
  const activePts = [...(showCall ? callPts : []), ...(showPut ? putPts : [])]

  if (activePts.length < 2) {
    return <DiscoveryHint className="">Not enough IV data for smile chart.</DiscoveryHint>
  }

  const w = 640
  const h = 240
  const pad = { l: 52, r: 24, t: 20, b: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const allStrikes = [...new Set(activePts.map(p => p.strike))].sort((a, b) => a - b)
  const allIvs = activePts.map(p => p.iv)
  const minS = Math.min(...allStrikes)
  const maxS = Math.max(...allStrikes)
  const minIv = Math.min(...allIvs)
  const maxIv = Math.max(...allIvs)
  const ivPad = (maxIv - minIv) * 0.08 || 0.01
  const ivLo = Math.max(0, minIv - ivPad)
  const ivHi = maxIv + ivPad

  const xFor = (s: number) => pad.l + scaleLin(s, minS, maxS, 0, innerW)
  const yFor = (iv: number) => pad.t + innerH - scaleLin(iv, ivLo, ivHi, 0, innerH)

  const makePoly = (pts: IvPoint[]) =>
    pts.map(p => `${xFor(p.strike)},${yFor(p.iv)}`).join(' ')

  const ucInRange = underlying != null && Number.isFinite(underlying) && underlying >= minS && underlying <= maxS
  const ucX = ucInRange ? xFor(underlying!) : null

  const yTicks = 4
  const yStep = (ivHi - ivLo) / yTicks
  const xTickIdxs = pickXTickIndices(allStrikes.length, 8)

  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`}
      aria-label="IV smile chart showing implied volatility by strike for calls and puts">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />

      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = ivLo + yStep * i
        const y = yFor(val)
        return (
          <g key={i}>
            {i > 0 && <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
              stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3 3" />}
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
              fill={OD_ANALYTICS_AXIS_TICK_FILL}>{fmtIv(val)}</text>
          </g>
        )
      })}

      {showCall && callPts.length >= 2 && (
        <polyline fill="none" stroke="var(--color-lamp-green, #66bb6a)" strokeWidth="2"
          points={makePoly(callPts)} />
      )}
      {showPut && putPts.length >= 2 && (
        <polyline fill="none" stroke="var(--color-lamp-red, #ef5350)" strokeWidth="2"
          points={makePoly(putPts)} />
      )}

      {showCall && callPts.map((p, i) => (
        <circle key={`c-${i}`} cx={xFor(p.strike)} cy={yFor(p.iv)} r={2.5}
          fill="var(--color-lamp-green, #66bb6a)" />
      ))}
      {showPut && putPts.map((p, i) => (
        <circle key={`p-${i}`} cx={xFor(p.strike)} cy={yFor(p.iv)} r={2.5}
          fill="var(--color-lamp-red, #ef5350)" />
      ))}

      {ucX != null && (
        <line x1={ucX} x2={ucX} y1={pad.t} y2={pad.t + innerH}
          stroke={chartAxisTitleFill} strokeWidth={1.2} strokeDasharray="2 2" />
      )}

      {xTickIdxs.map(i => {
        const s = allStrikes[i]
        if (s == null) return null
        return (
          <text key={i} x={xFor(s)} y={h - 8} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
            fill={OD_ANALYTICS_AXIS_TICK_FILL}>{s % 1 === 0 ? s.toFixed(0) : s.toFixed(1)}</text>
        )
      })}

      <text x={pad.l - 4} y={pad.t - 6} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>IV</text>
      <text x={pad.l + innerW / 2} y={h - 0} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>Strike</text>
    </svg>
  )
}

export function IvSmileLegend({ side = 'both', underlying }: { side?: 'call' | 'put' | 'both'; underlying: number | null }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-dense-caption text-muted-foreground" role="presentation">
      {(side === 'call' || side === 'both') && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-green, #66bb6a)' }} />
          Call IV
        </span>
      )}
      {(side === 'put' || side === 'both') && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-red, #ef5350)' }} />
          Put IV
        </span>
      )}
      {underlying != null && Number.isFinite(underlying) && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: chartAxisTitleFill }} />
          Spot {underlying.toFixed(2)}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OI Profile Chart
// ---------------------------------------------------------------------------

interface OiStrike { strike: number; callOi: number; putOi: number }

export function OiProfileChart({ rows, underlying }: {
  rows: OptionSnapshotRow[]
  underlying: number | null
}) {
  const data = useMemo(() => {
    const map = new Map<number, OiStrike>()
    for (const r of rows) {
      const oi = r.open_interest
      if (oi == null || !Number.isFinite(oi) || oi <= 0) continue
      const right = (r.right || '').trim().toUpperCase()
      const existing = map.get(r.strike) ?? { strike: r.strike, callOi: 0, putOi: 0 }
      if (right === 'C' || right === 'CALL') existing.callOi += oi
      else if (right === 'P' || right === 'PUT') existing.putOi += oi
      map.set(r.strike, existing)
    }
    return [...map.values()].sort((a, b) => a.strike - b.strike)
  }, [rows])

  if (data.length < 2) {
    return <DiscoveryHint className="">Not enough OI data for profile chart.</DiscoveryHint>
  }

  const w = 640
  const h = 240
  const pad = { l: 52, r: 24, t: 20, b: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const strikes = data.map(d => d.strike)
  const minS = Math.min(...strikes)
  const maxS = Math.max(...strikes)
  const maxOi = Math.max(1, ...data.map(d => d.callOi + d.putOi))

  const n = data.length
  const gap = Math.max(1, innerW * 0.12 / Math.max(n, 1))
  const barW = Math.max(2, (innerW - gap * (n - 1)) / n)
  const halfBar = barW / 2

  const xFor = (s: number) => pad.l + scaleLin(s, minS, maxS, halfBar, innerW - halfBar)

  const ucInRange = underlying != null && Number.isFinite(underlying) && underlying >= minS && underlying <= maxS
  const ucX = ucInRange ? xFor(underlying!) : null

  const yTicks = 3
  const yStep = maxOi / yTicks
  const xTickIdxs = pickXTickIndices(n, 8)

  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`}
      aria-label="Open interest distribution by strike showing Call and Put OI as stacked bars">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />

      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = yStep * i
        const y = pad.t + innerH - scaleLin(val, 0, maxOi, 0, innerH)
        return (
          <g key={i}>
            {i > 0 && <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
              stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3 3" />}
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
              fill={OD_ANALYTICS_AXIS_TICK_FILL}>{fmtOiCompact(val)}</text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const cx = xFor(d.strike)
        const y0 = pad.t + innerH
        const putH = scaleLin(d.putOi, 0, maxOi, 0, innerH)
        const callH = scaleLin(d.callOi, 0, maxOi, 0, innerH)
        return (
          <g key={i}>
            <rect x={cx - halfBar} y={y0 - putH} width={barW} height={Math.max(putH, 0.5)}
              fill="var(--color-lamp-red, #ef5350)" opacity={0.72} rx={1} />
            <rect x={cx - halfBar} y={y0 - putH - callH} width={barW} height={Math.max(callH, 0.5)}
              fill="var(--color-lamp-green, #66bb6a)" opacity={0.72} rx={1} />
          </g>
        )
      })}

      {ucX != null && (
        <line x1={ucX} x2={ucX} y1={pad.t - 2} y2={pad.t + innerH + 2}
          stroke={chartAxisTitleFill} strokeWidth={1.2} strokeDasharray="2 2" />
      )}

      {xTickIdxs.map(i => {
        const d = data[i]
        if (!d) return null
        return (
          <text key={i} x={xFor(d.strike)} y={h - 8} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
            fill={OD_ANALYTICS_AXIS_TICK_FILL}>{d.strike % 1 === 0 ? d.strike.toFixed(0) : d.strike.toFixed(1)}</text>
        )
      })}

      <text x={pad.l - 4} y={pad.t - 2} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>Open Interest</text>
      <text x={pad.l + innerW / 2} y={h - 0} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>Strike</text>
    </svg>
  )
}

export function OiProfileLegend({ underlying }: { underlying: number | null }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-dense-caption text-muted-foreground" role="presentation">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-green, #66bb6a)' }} />
        Call OI
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-red, #ef5350)' }} />
        Put OI
      </span>
      {underlying != null && Number.isFinite(underlying) && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: chartAxisTitleFill }} />
          Spot {underlying.toFixed(2)}
        </span>
      )}
    </div>
  )
}

/** US equity options: contracts × 100 shares */
const OPTION_SHARES_PER_CONTRACT = 100

function fmtGexAxis(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return v.toFixed(0)
}

// ---------------------------------------------------------------------------
// Gamma exposure (dealer-style magnitude) — γ × OI × 100 per strike
// ---------------------------------------------------------------------------

interface GexStrike { strike: number; callGex: number; putGex: number }

export function GammaExposureChart({ rows, underlying }: {
  rows: OptionSnapshotRow[]
  underlying: number | null
}) {
  const data = useMemo(() => {
    const map = new Map<number, GexStrike>()
    for (const r of rows) {
      const oi = r.open_interest
      const g = r.gamma
      if (oi == null || !Number.isFinite(oi) || oi <= 0) continue
      if (g == null || !Number.isFinite(g)) continue
      const contrib = g * oi * OPTION_SHARES_PER_CONTRACT
      const right = (r.right || '').trim().toUpperCase()
      const existing = map.get(r.strike) ?? { strike: r.strike, callGex: 0, putGex: 0 }
      if (right === 'C' || right === 'CALL') existing.callGex += contrib
      else if (right === 'P' || right === 'PUT') existing.putGex += contrib
      map.set(r.strike, existing)
    }
    return [...map.values()].sort((a, b) => a.strike - b.strike)
  }, [rows])

  if (data.length < 1) {
    return <DiscoveryHint className="">Not enough gamma and OI data for exposure chart.</DiscoveryHint>
  }

  const w = 640
  const h = 240
  const pad = { l: 56, r: 24, t: 20, b: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const strikes = data.map(d => d.strike)
  const minS = Math.min(...strikes)
  const maxS = Math.max(...strikes)
  const maxStack = Math.max(
    1e-9,
    ...data.map(d => Math.abs(d.callGex) + Math.abs(d.putGex)),
  )

  const n = data.length
  const gap = Math.max(1, innerW * 0.12 / Math.max(n, 1))
  const barW = Math.max(2, (innerW - gap * (n - 1)) / n)
  const halfBar = barW / 2

  const xFor = (s: number) => pad.l + scaleLin(s, minS, maxS, halfBar, innerW - halfBar)

  const ucInRange = underlying != null && Number.isFinite(underlying) && underlying >= minS && underlying <= maxS
  const ucX = ucInRange ? xFor(underlying!) : null

  const yTicks = 3
  const yStep = maxStack / yTicks
  const xTickIdxs = pickXTickIndices(n, 8)

  return (
    <svg className="od-max-pain-svg od-chart-svg" viewBox={`0 0 ${w} ${h}`}
      aria-label="Gamma exposure by strike: call and put gamma times open interest times 100 shares per contract">
      <rect x={pad.l} y={pad.t} width={innerW} height={innerH}
        fill={chartSurfaceFill} rx={4} />

      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = yStep * i
        const y = pad.t + innerH - scaleLin(val, 0, maxStack, 0, innerH)
        return (
          <g key={i}>
            {i > 0 && <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y}
              stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3 3" />}
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
              fill={OD_ANALYTICS_AXIS_TICK_FILL}>{fmtGexAxis(val)}</text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const cx = xFor(d.strike)
        const y0 = pad.t + innerH
        const putH = scaleLin(Math.abs(d.putGex), 0, maxStack, 0, innerH)
        const callH = scaleLin(Math.abs(d.callGex), 0, maxStack, 0, innerH)
        return (
          <g key={i}>
            <rect x={cx - halfBar} y={y0 - putH} width={barW} height={Math.max(putH, 0.5)}
              fill="var(--color-lamp-red, #ef5350)" opacity={0.72} rx={1} />
            <rect x={cx - halfBar} y={y0 - putH - callH} width={barW} height={Math.max(callH, 0.5)}
              fill="var(--color-lamp-green, #66bb6a)" opacity={0.72} rx={1} />
          </g>
        )
      })}

      {ucX != null && (
        <line x1={ucX} x2={ucX} y1={pad.t - 2} y2={pad.t + innerH + 2}
          stroke={chartAxisTitleFill} strokeWidth={1.2} strokeDasharray="2 2" />
      )}

      {xTickIdxs.map(i => {
        const d = data[i]
        if (!d) return null
        return (
          <text key={i} x={xFor(d.strike)} y={h - 8} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
            fill={OD_ANALYTICS_AXIS_TICK_FILL}>{d.strike % 1 === 0 ? d.strike.toFixed(0) : d.strike.toFixed(1)}</text>
        )
      })}

      <text x={pad.l - 4} y={pad.t - 2} textAnchor="end" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>G×OI×100</text>
      <text x={pad.l + innerW / 2} y={h - 0} textAnchor="middle" fontSize={OD_CHART_AXIS_FONT}
        fill={OD_ANALYTICS_AXIS_TITLE_FILL}>Strike</text>
    </svg>
  )
}

export function GammaExposureLegend({ underlying }: { underlying: number | null }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-dense-caption text-muted-foreground" role="presentation">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-green, #66bb6a)' }} />
        Call G×OI×100
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-2 w-3.5 shrink-0 rounded-sm" style={{ background: 'var(--color-lamp-red, #ef5350)' }} />
        Put G×OI×100
      </span>
      {underlying != null && Number.isFinite(underlying) && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed" style={{ borderColor: chartAxisTitleFill }} />
          Spot {underlying.toFixed(2)}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skew Summary
// ---------------------------------------------------------------------------

export function SkewSummary({ rows, underlying }: {
  rows: OptionSnapshotRow[]
  underlying: number | null
}) {
  const result = useMemo(() => {
    if (underlying == null || !Number.isFinite(underlying) || underlying <= 0) return null
    const otmPuts = rows
      .filter(r => (r.right || '').toUpperCase() === 'P' && r.strike < underlying && r.iv != null && Number.isFinite(r.iv!))
      .sort((a, b) => b.strike - a.strike)
      .slice(0, 4)
    const otmCalls = rows
      .filter(r => (r.right || '').toUpperCase() === 'C' && r.strike > underlying && r.iv != null && Number.isFinite(r.iv!))
      .sort((a, b) => a.strike - b.strike)
      .slice(0, 4)
    if (otmPuts.length === 0 || otmCalls.length === 0) return null
    const putIvAvg = otmPuts.reduce((s, r) => s + r.iv!, 0) / otmPuts.length
    const callIvAvg = otmCalls.reduce((s, r) => s + r.iv!, 0) / otmCalls.length
    const spread = putIvAvg - callIvAvg
    const ratio = callIvAvg > 1e-8 ? putIvAvg / callIvAvg : null
    return { putIvAvg, callIvAvg, spread, ratio, putCount: otmPuts.length, callCount: otmCalls.length }
  }, [rows, underlying])

  if (!result) {
    return (
    <div className="mb-3 flex flex-wrap items-baseline gap-2 text-sm">
      <span className="text-muted-foreground">Put–Call IV Skew</span>
      <span className="font-semibold tabular-nums">—</span>
      <span className="text-xs text-muted-foreground">Need spot and OTM contracts with IV.</span>
      </div>
    )
  }

  const skewSign = result.spread > 0 ? 'put-heavy' : result.spread < -0.005 ? 'call-heavy' : 'neutral'

  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-2 text-sm">
      <span className="text-muted-foreground">
        Put–Call IV Skew
        <InfoTooltip text="Approx. difference between average OTM Put IV and OTM Call IV (nearest 4 strikes each side). Positive = put skew (downside premium)." />
      </span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          skewSign === 'put-heavy' && 'text-destructive',
          skewSign === 'call-heavy' && 'text-option-call',
        )}
      >
        {result.spread >= 0 ? '+' : ''}{(result.spread * 100).toFixed(2)} pts
      </span>
      <span className="text-xs text-muted-foreground">
        Put IV avg {fmtIv(result.putIvAvg)} ({result.putCount}) · Call IV avg {fmtIv(result.callIvAvg)} ({result.callCount})
        {result.ratio != null && ` · P/C ratio ${result.ratio.toFixed(2)}`}
      </span>
    </div>
  )
}

