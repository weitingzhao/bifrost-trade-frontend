import { chartAxisTickFill } from '@/lib/chartTokens'
import { fmtMini } from './chartUtils'

interface Props {
  labels: string[]
  values: (number | null)[]
  color: string
  areaColor: string
  h?: number
  vw?: number
  className?: string
}

export function SvgAreaChart({
  labels,
  values,
  color,
  areaColor,
  h = 88,
  vw = 960,
  className,
}: Props) {
  const pts = values
    .map((v, i) => (v != null && Number.isFinite(v) ? { i, v } : null))
    .filter(Boolean) as { i: number; v: number }[]
  if (pts.length < 2) return null

  const VW = vw
  const PL = 46
  const PR = 6
  const PT = 10
  const PB = 22
  const cW = VW - PL - PR
  const cH = h - PT - PB
  const vMin = Math.min(...pts.map((p) => p.v))
  const vMax = Math.max(...pts.map((p) => p.v))
  const range = vMax - vMin || 1
  const n = values.length

  const xOf = (i: number) => PL + (i / Math.max(n - 1, 1)) * cW
  const yOf = (v: number) => PT + (1 - (v - vMin) / range) * cH

  const linePts = pts.map((p) => `${xOf(p.i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
  const areaPath =
    `M${xOf(pts[0].i).toFixed(1)},${(PT + cH).toFixed(1)} ` +
    pts.map((p) => `L${xOf(p.i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ') +
    ` L${xOf(pts[pts.length - 1].i).toFixed(1)},${(PT + cH).toFixed(1)} Z`

  const step = Math.max(1, Math.ceil(n / 6))

  return (
    <svg
      viewBox={`0 0 ${VW} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className={className}
      style={{ display: 'block' }}
    >
      {[0, 0.5, 1].map((t, ti) => {
        const tv = vMin + t * range
        const ty = PT + (1 - t) * cH
        return (
          <g key={ti}>
            <line
              x1={PL}
              y1={ty}
              x2={VW - PR}
              y2={ty}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={0.7}
            />
            <text x={PL - 4} y={ty + 4} textAnchor="end" fontSize={9} fill={chartAxisTickFill}>
              {fmtMini(tv)}
            </text>
          </g>
        )
      })}
      <path d={areaPath} fill={areaColor} />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {pts
        .filter((p) => p.i % step === 0 || p.i === n - 1)
        .map((p) => (
          <text key={p.i} x={xOf(p.i)} y={h - 4} textAnchor="middle" fontSize={8} fill={chartAxisTickFill}>
            {labels[p.i]}
          </text>
        ))}
    </svg>
  )
}
