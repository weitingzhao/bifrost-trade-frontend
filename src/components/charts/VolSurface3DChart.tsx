/**
 * Vol Surface residual heatmap — Wave RS-B-Surface2.
 *
 * V1 renders as a strike × expiry heatmap. The caller decides which metric
 * is plotted (iv_market or residual_z) via the `mode` prop. Colors come from
 * shared surface tokens (primary / warning / destructive) so the visual reads
 * as "hot cell = deviation" rather than PnL. No raw font-size / raw palette.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { VolSurfaceResidualRow } from '@/api/research/volSurface'

type HeatmapMode = 'iv' | 'residual_z'

interface VolSurfaceHeatmapProps {
  rows: VolSurfaceResidualRow[]
  mode: HeatmapMode
  className?: string
  cellWidth?: number
  cellHeight?: number
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function fmtZ(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(2)
}

function residualCellStyle(z: number | null | undefined): {
  bgClass: string
  textClass: string
} {
  if (z == null || !Number.isFinite(z)) {
    return { bgClass: 'bg-muted', textClass: 'text-muted-foreground' }
  }
  const abs = Math.abs(z)
  if (abs >= 2.5) return { bgClass: 'bg-destructive/70', textClass: 'text-destructive-foreground' }
  if (abs >= 1.5) return { bgClass: 'bg-warning/70', textClass: 'text-warning-foreground' }
  if (abs >= 0.5) return { bgClass: 'bg-primary/40', textClass: 'text-foreground' }
  return { bgClass: 'bg-muted', textClass: 'text-muted-foreground' }
}

function ivCellStyle(iv: number | null | undefined): {
  bgClass: string
  textClass: string
} {
  if (iv == null || !Number.isFinite(iv)) {
    return { bgClass: 'bg-muted', textClass: 'text-muted-foreground' }
  }
  if (iv >= 0.6) return { bgClass: 'bg-destructive/60', textClass: 'text-destructive-foreground' }
  if (iv >= 0.4) return { bgClass: 'bg-warning/60', textClass: 'text-warning-foreground' }
  if (iv >= 0.2) return { bgClass: 'bg-primary/40', textClass: 'text-foreground' }
  return { bgClass: 'bg-primary/20', textClass: 'text-muted-foreground' }
}

export function VolSurfaceHeatmap({
  rows,
  mode,
  className,
  cellWidth = 68,
  cellHeight = 30,
}: VolSurfaceHeatmapProps) {
  const grid = useMemo(() => {
    const expiries = Array.from(new Set(rows.map((r) => r.expiry).filter(Boolean))).sort(
      (a, b) => (a as string).localeCompare(b as string),
    ) as string[]
    const strikes = Array.from(
      new Set(rows.map((r) => (r.strike != null ? r.strike : null)).filter((v): v is number => v != null)),
    ).sort((a, b) => a - b)
    const map: Record<string, Record<number, VolSurfaceResidualRow>> = {}
    rows.forEach((r) => {
      if (!r.expiry || r.strike == null) return
      if (!map[r.expiry]) map[r.expiry] = {}
      map[r.expiry][r.strike] = r
    })
    return { expiries, strikes, map }
  }, [rows])

  if (grid.expiries.length === 0 || grid.strikes.length === 0) {
    return (
      <div
        className={cn(
          className,
          'text-dense-meta text-muted-foreground text-center py-6',
        )}
      >
        No residual data yet.
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th
              className="text-dense-caption font-medium text-muted-foreground text-right pr-2"
              style={{ width: cellWidth }}
            >
              Strike ↓ / Exp →
            </th>
            {grid.expiries.map((exp) => (
              <th
                key={exp}
                className="text-dense-caption font-medium text-muted-foreground text-center"
                style={{ width: cellWidth }}
              >
                <span className="font-mono">{exp.slice(5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.strikes.map((strike) => (
            <tr key={strike}>
              <td
                className="text-dense-caption font-mono text-right pr-2 text-muted-foreground"
                style={{ width: cellWidth, height: cellHeight }}
              >
                {strike.toFixed(2)}
              </td>
              {grid.expiries.map((exp) => {
                const cell = grid.map[exp]?.[strike]
                if (!cell) {
                  return (
                    <td
                      key={`${exp}-${strike}`}
                      className="bg-secondary/30 rounded-sm"
                      style={{ width: cellWidth, height: cellHeight }}
                    />
                  )
                }
                const style =
                  mode === 'residual_z'
                    ? residualCellStyle(cell.residual_z)
                    : ivCellStyle(cell.iv_market)
                const value =
                  mode === 'residual_z' ? fmtZ(cell.residual_z) : fmtPct(cell.iv_market)
                const title =
                  mode === 'residual_z'
                    ? `${exp} K=${strike} · residual_z=${fmtZ(cell.residual_z)} · residual=${fmtPct(cell.residual)}`
                    : `${exp} K=${strike} · IV mkt=${fmtPct(cell.iv_market)} · IV fit=${fmtPct(cell.iv_fitted)}`
                return (
                  <td
                    key={`${exp}-${strike}`}
                    className={cn(
                      'rounded-sm text-center text-dense-caption font-mono tabular-nums',
                      style.bgClass,
                      style.textClass,
                    )}
                    style={{ width: cellWidth, height: cellHeight }}
                    title={title}
                  >
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-dense-caption text-muted-foreground">
        {mode === 'residual_z'
          ? '|z| ≥ 2.5 = deep red · 1.5–2.5 = amber · 0.5–1.5 = primary tint. Highlights strikes deviating from the SVI fit.'
          : 'IV heatmap by strike × expiry — market implied vol per contract.'}
      </p>
    </div>
  )
}
