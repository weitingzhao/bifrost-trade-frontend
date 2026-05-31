import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'

const LINE_COLORS = ['#38bdf8', '#2dd4bf', '#fbbf24', '#c084fc']

interface Props {
  accounts: IbAccountSnapshot[]
}

function getNetLiq(a: IbAccountSnapshot): number {
  const v = a.summary?.NetLiquidation
  if (v == null) return 0
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

export function NetLiqChart({ accounts }: Props) {
  const series = accounts
    .map((a, i) => ({
      label: a.account_id ?? `Account ${i + 1}`,
      netLiq: getNetLiq(a),
    }))
    .filter((s) => s.netLiq > 0)

  const W = 300
  const H = 96
  const PAD = { left: 8, right: 8, top: 12, bottom: 8 }
  const barH = 18
  const gapY = 8
  const maxVal = series.length > 0 ? Math.max(...series.map((s) => s.netLiq)) : 1
  const innerW = W - PAD.left - PAD.right

  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Net Liquidation
      </p>
      {series.length === 0 ? (
        <p className="text-sm text-muted-foreground">No account data.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${Math.max(H, PAD.top + series.length * (barH + gapY) - gapY + PAD.bottom)}`}
          width={W}
          className="overflow-visible"
          aria-label="Net liquidation by account"
          role="img"
        >
          {series.map((s, i) => {
            const barW = Math.max(2, (s.netLiq / maxVal) * innerW)
            const y = PAD.top + i * (barH + gapY)
            const color = LINE_COLORS[i % LINE_COLORS.length]
            return (
              <g key={s.label}>
                {/* Label */}
                <text
                  x={PAD.left}
                  y={y + barH / 2 - 3}
                  fill="currentColor"
                  fontSize={9}
                  dominantBaseline="auto"
                  className="opacity-60 font-mono"
                >
                  {s.label}
                </text>
                {/* Bar track */}
                <rect
                  x={PAD.left}
                  y={y + barH / 2 + 1}
                  width={innerW}
                  height={5}
                  rx={2}
                  fill="currentColor"
                  opacity={0.1}
                />
                {/* Bar fill */}
                <rect
                  x={PAD.left}
                  y={y + barH / 2 + 1}
                  width={barW}
                  height={5}
                  rx={2}
                  fill={color}
                />
                {/* Value */}
                <text
                  x={PAD.left + barW + 4}
                  y={y + barH / 2 + 5}
                  fill="currentColor"
                  fontSize={9}
                  dominantBaseline="auto"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                >
                  {fmtUsd(s.netLiq)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {/* Color legend */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {series.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              <span className="font-mono text-muted-foreground">{s.label}</span>
              <span className="font-mono font-semibold">{fmtUsd(s.netLiq)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
