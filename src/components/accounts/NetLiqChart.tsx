import { useMemo } from 'react'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'

const LINE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6']

interface Props {
  accounts: IbAccountSnapshot[]
}

function getNetLiq(a: IbAccountSnapshot): number {
  const v = a.summary?.NetLiquidation
  if (v == null) return NaN
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : NaN
}

export function NetLiqChart({ accounts }: Props) {
  const series = useMemo(() => {
    const snapshotT = 1
    return accounts
      .map((a, i) => ({
        accountId: a.account_id ?? '',
        label: a.account_id ?? `Account ${i + 1}`,
        points: [{ t: snapshotT, y: getNetLiq(a) }],
      }))
      .filter((s) => Number.isFinite(s.points[0].y))
  }, [accounts])

  const allTs = series.flatMap((s) => s.points.map((p) => p.t))
  const minT = allTs.length ? Math.min(...allTs) : 0
  const maxT = allTs.length ? Math.max(...allTs) : 1
  const allY = series.flatMap((s) => s.points.map((p) => p.y))
  const minY = allY.length ? Math.min(...allY, 0) : 0
  const maxY = allY.length ? Math.max(...allY) * 1.05 : 1

  const w = 480
  const h = 120
  const pad = { left: 40, right: 12, top: 6, bottom: 20 }
  const x = (t: number) => pad.left + ((t - minT) / (maxT - minT || 1)) * (w - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - (v - minY) / (maxY - minY || 1)) * (h - pad.top - pad.bottom)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-secondary p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Net Liquidation over time
      </p>
      {series.length === 0 ? (
        <p className="mt-3 flex flex-1 items-center text-sm text-muted-foreground">No account data.</p>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-3">
          <svg
            className="w-full min-h-[120px] flex-1 max-w-full"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label="Net liquidation over time"
            role="img"
          >
            <defs>
              <linearGradient id="netliq-fill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {series.map((s, idx) => {
              const pts = [...s.points].sort((a, b) => a.t - b.t)
              const pathD = pts.length ? `M ${pts.map((p) => `${x(p.t)} ${y(p.y)}`).join(' L ')}` : ''
              const pathFill =
                pts.length >= 2
                  ? `${pathD} L ${x(pts[pts.length - 1].t)} ${y(minY)} L ${x(pts[0].t)} ${y(minY)} Z`
                  : ''
              const color = LINE_COLORS[idx % LINE_COLORS.length]
              return (
                <g key={s.accountId}>
                  {pathFill ? <path d={pathFill} fill="url(#netliq-fill)" /> : null}
                  {pathD ? (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {pts.map((p, i) => (
                    <circle key={i} cx={x(p.t)} cy={y(p.y)} r="4" fill={color} />
                  ))}
                </g>
              )
            })}
            <line
              x1={pad.left}
              y1={h - pad.bottom}
              x2={w - pad.right}
              y2={h - pad.bottom}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <line
              x1={pad.left}
              y1={pad.top}
              x2={pad.left}
              y2={h - pad.bottom}
              stroke="var(--border)"
              strokeWidth="1"
            />
          </svg>
          <ul className="mt-auto shrink-0 space-y-1.5">
            {series.map((s, idx) => (
              <li key={s.accountId} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                />
                <span className="font-mono text-muted-foreground">{s.label}</span>
                <span className="ml-auto font-mono font-semibold tabular-nums">
                  {fmtUsd(s.points[s.points.length - 1]?.y ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
