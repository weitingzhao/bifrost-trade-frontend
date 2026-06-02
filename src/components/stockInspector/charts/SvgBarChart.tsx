import { chartAxisTickFill } from '@/lib/chartTokens'
import { fmtMini, type ChartSeries } from './chartUtils'

interface Props {
  labels: string[]
  series: ChartSeries[]
  h?: number
  vw?: number
  className?: string
}

export function SvgBarChart({ labels, series, h = 110, vw = 960, className }: Props) {
  const n = labels.length
  if (n === 0 || series.length === 0) return null
  const allVals = series.flatMap((s) =>
    s.values.filter((v): v is number => v != null && Number.isFinite(v)),
  )
  if (allVals.length === 0) return null

  const vMin = Math.min(0, ...allVals)
  const vMax = Math.max(0, ...allVals)
  const range = vMax - vMin || 1

  const VW = vw
  const PL = 46
  const PR = 6
  const PT = 10
  const PB = 22
  const cW = VW - PL - PR
  const cH = h - PT - PB
  const zY = PT + (vMax / range) * cH
  const ns = series.length
  const gW = cW / n
  const bW = Math.max(3, (gW * 0.74) / ns)
  const ticks = [vMin, vMin + range * 0.5, vMax]

  return (
    <svg
      viewBox={`0 0 ${VW} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className={className}
      style={{ display: 'block' }}
    >
      {ticks.map((tv, ti) => {
        const ty = PT + ((vMax - tv) / range) * cH
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
      <line x1={PL} y1={zY} x2={VW - PR} y2={zY} stroke="rgba(148,163,184,0.35)" strokeWidth={1} />
      {labels.map((lbl, gi) => {
        const gX = PL + gi * gW + gW * 0.12
        return (
          <g key={gi}>
            {series.map((s, si) => {
              const v = s.values[gi]
              if (v == null || !Number.isFinite(v)) return null
              const bH = Math.max(1, Math.abs((v / range) * cH))
              const bY = v >= 0 ? zY - bH : zY
              const fill = v < 0 && s.negColor ? s.negColor : s.color
              return (
                <rect
                  key={si}
                  x={gX + si * (bW + 2)}
                  y={bY}
                  width={bW}
                  height={bH}
                  fill={fill}
                  rx={1.5}
                  opacity={0.9}
                >
                  <title>
                    {s.key}: {fmtMini(v)}
                  </title>
                </rect>
              )
            })}
            <text x={gX + (ns * (bW + 2)) / 2} y={h - 4} textAnchor="middle" fontSize={8} fill={chartAxisTickFill}>
              {lbl}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
