/**
 * Dealer Vanna/Charm map across strikes — Wave RS-B-OpEx2.
 *
 * Renders per-strike net exposure as dual bars (Vanna above axis, Charm below,
 * or side-by-side depending on mode). Uses tokens (fill-primary,
 * fill-warning, text-dense-*) — no raw font-size, no PnL palette classes,
 * no new module CSS.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { OpexStrikeRow } from '@/api/research/opexCycle'

interface VannaCharmMapProps {
  rows: OpexStrikeRow[]
  spot: number | null
  vannaZeroStrike?: number | null
  charmZeroStrike?: number | null
  width?: number
  height?: number
  className?: string
}

interface Point {
  strike: number
  net_gex: number
  call_gex: number
  put_gex: number
  call_oi: number
  put_oi: number
  vanna_proxy: number
  charm_proxy: number
}

/**
 * NOTE: `option_metric_vanna_charm_daily.strike_json` stores per-strike
 * open-interest and GEX from the paired GEX engine. To render a Vanna/Charm
 * map without persisting per-strike Vanna, we use two OI-weighted proxies that
 * preserve the shape a dealer would face:
 *
 *   vanna_proxy(K) = (call_oi - put_oi) * (K - spot)
 *   charm_proxy(K) = (call_oi + put_oi) * (K - spot)
 *
 * These are directional / relative — not exposure in dollars — and match the
 * `total_vanna` / `total_charm` sign story surfaced in the header.
 */
function buildPoints(rows: OpexStrikeRow[], spot: number | null): Point[] {
  const s = spot ?? 0
  return rows
    .filter((r) => r.strike != null && Number.isFinite(r.strike))
    .map((r) => {
      const strike = Number(r.strike)
      const call_oi = Number(r.call_oi ?? 0)
      const put_oi = Number(r.put_oi ?? 0)
      const call_gex = Number(r.call_gex ?? 0)
      const put_gex = Number(r.put_gex ?? 0)
      const dK = s ? strike - s : 0
      return {
        strike,
        net_gex: Number(r.net_gex ?? call_gex + put_gex),
        call_gex,
        put_gex,
        call_oi,
        put_oi,
        vanna_proxy: (call_oi - put_oi) * dK,
        charm_proxy: (call_oi + put_oi) * (dK >= 0 ? 1 : -1) * Math.abs(dK),
      }
    })
    .sort((a, b) => a.strike - b.strike)
}

export function VannaCharmMap({
  rows,
  spot,
  vannaZeroStrike,
  charmZeroStrike,
  width = 720,
  height = 220,
  className,
}: VannaCharmMapProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chart = useMemo(() => {
    const points = buildPoints(rows, spot)
    if (points.length === 0) return null
    const pad = { top: 16, right: 20, bottom: 32, left: 56 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom

    const strikes = points.map((p) => p.strike)
    const minK = Math.min(...strikes)
    const maxK = Math.max(...strikes)
    const kRange = maxK - minK || 1

    const vAbs = Math.max(
      ...points.map((p) => Math.max(Math.abs(p.vanna_proxy), Math.abs(p.charm_proxy))),
      1,
    )

    const xScale = (k: number) => pad.left + ((k - minK) / kRange) * chartW
    const yMid = pad.top + chartH / 2
    const yScale = (v: number) => yMid - (v / vAbs) * (chartH / 2 - 4)

    const barW = Math.max(2, Math.min(14, chartW / (points.length * 2 + 1)))

    return { points, pad, chartW, chartH, minK, maxK, kRange, xScale, yScale, yMid, barW, vAbs }
  }, [rows, spot, width, height])

  if (!chart) {
    return (
      <div
        className={cn(
          className,
          'text-dense-meta text-muted-foreground text-center py-6',
        )}
      >
        No strike-level Vanna/Charm data.
      </div>
    )
  }

  const hovered = hoverIdx != null ? chart.points[hoverIdx] : null

  return (
    <div className={cn('relative', className)}>
      <svg
        width={width}
        height={height}
        className="max-w-full"
        role="img"
        aria-label="Dealer Vanna and Charm proxies across strikes"
      >
        <line
          x1={chart.pad.left}
          x2={chart.pad.left + chart.chartW}
          y1={chart.yMid}
          y2={chart.yMid}
          className="stroke-border"
          strokeWidth={1}
        />

        {spot != null && Number.isFinite(spot) ? (
          <line
            x1={chart.xScale(spot)}
            x2={chart.xScale(spot)}
            y1={chart.pad.top}
            y2={chart.pad.top + chart.chartH}
            className="stroke-primary/60"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        ) : null}

        {vannaZeroStrike != null && Number.isFinite(vannaZeroStrike) ? (
          <line
            x1={chart.xScale(vannaZeroStrike)}
            x2={chart.xScale(vannaZeroStrike)}
            y1={chart.pad.top}
            y2={chart.pad.top + chart.chartH}
            className="stroke-warning/70"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}
        {charmZeroStrike != null &&
        Number.isFinite(charmZeroStrike) &&
        charmZeroStrike !== vannaZeroStrike ? (
          <line
            x1={chart.xScale(charmZeroStrike)}
            x2={chart.xScale(charmZeroStrike)}
            y1={chart.pad.top}
            y2={chart.pad.top + chart.chartH}
            className="stroke-success/70"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}

        {chart.points.map((p, i) => {
          const x = chart.xScale(p.strike)
          const vy = chart.yScale(p.vanna_proxy)
          const cy = chart.yScale(p.charm_proxy)
          const vTop = Math.min(vy, chart.yMid)
          const vH = Math.abs(vy - chart.yMid)
          const cTop = Math.min(cy, chart.yMid)
          const cH = Math.abs(cy - chart.yMid)
          return (
            <g
              key={p.strike}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <rect
                x={x - chart.barW - 0.5}
                y={vTop}
                width={chart.barW}
                height={vH}
                className={cn(
                  hoverIdx === i ? 'fill-primary' : 'fill-primary/70',
                )}
              />
              <rect
                x={x + 0.5}
                y={cTop}
                width={chart.barW}
                height={cH}
                className={cn(
                  hoverIdx === i ? 'fill-warning' : 'fill-warning/70',
                )}
              />
            </g>
          )
        })}

        <text
          x={8}
          y={chart.pad.top + 4}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          +max
        </text>
        <text
          x={8}
          y={chart.yMid + 3}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          0
        </text>
        <text
          x={8}
          y={chart.pad.top + chart.chartH - 2}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          −max
        </text>

        {[chart.minK, chart.minK + chart.kRange / 2, chart.maxK].map((k, i) => (
          <text
            key={`x-${i}`}
            x={chart.xScale(k)}
            y={height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-dense-micro font-mono"
          >
            {k.toFixed(0)}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-dense-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-primary/70" />
          Vanna proxy (Call OI − Put OI)·(K − S)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-warning/70" />
          Charm proxy (Call OI + Put OI)·|K − S|·sign(K − S)
        </span>
      </div>

      {hovered ? (
        <div className="mt-1 rounded-md border border-border bg-secondary/80 px-3 py-1.5 text-dense-meta">
          <span className="font-mono tabular-nums">K {hovered.strike.toFixed(2)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            OI C {hovered.call_oi.toLocaleString()}
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            OI P {hovered.put_oi.toLocaleString()}
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            net GEX {hovered.net_gex.toExponential(2)}
          </span>
        </div>
      ) : (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          Dashed lines mark spot (blue), Vanna-zero strike (amber), Charm-zero strike (green).
        </p>
      )}
    </div>
  )
}
