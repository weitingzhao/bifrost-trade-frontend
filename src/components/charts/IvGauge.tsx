/**
 * Circular arc gauge for IV Rank (0–100).
 * Pure SVG, no external chart library.
 */

interface IvGaugeProps {
  value: number
  label?: string
  size?: number
  className?: string
}

function gaugeColor(value: number): string {
  if (value >= 70) return 'var(--color-loss, #ef4444)'
  if (value >= 40) return 'var(--color-chart-3, #fbbf24)'
  return 'var(--color-profit, #22c55e)'
}

function gaugeZone(value: number): string {
  if (value >= 70) return 'High'
  if (value >= 40) return 'Neutral'
  return 'Low'
}

export function IvGauge({ value, label, size = 120, className }: IvGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const strokeW = size * 0.08
  const startAngle = 135
  const endAngle = 405
  const sweep = endAngle - startAngle

  const clamped = Math.max(0, Math.min(100, value))
  const filledAngle = startAngle + (clamped / 100) * sweep

  function polarToXY(angle: number) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const bgStart = polarToXY(startAngle)
  const bgEnd = polarToXY(endAngle)
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`

  const valEnd = polarToXY(filledAngle)
  const largeArc = filledAngle - startAngle > 180 ? 1 : 0
  const valPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`

  const color = gaugeColor(clamped)
  const zone = gaugeZone(clamped)

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`IV Rank gauge: ${clamped.toFixed(0)}`}
    >
      {/* Background arc */}
      <path d={bgPath} fill="none" stroke="var(--border)" strokeWidth={strokeW} strokeLinecap="round" />

      {/* Value arc */}
      {clamped > 0 && (
        <path d={valPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      )}

      {/* Center text */}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--foreground)"
        fontSize={size * 0.2}
        fontWeight={700}
        fontFamily="ui-monospace, monospace"
      >
        {clamped.toFixed(0)}
      </text>
      <text
        x={cx}
        y={cy + size * 0.14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.1}
        fontWeight={600}
      >
        {zone}
      </text>
      {label && (
        <text
          x={cx}
          y={cy + size * 0.26}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--muted-foreground)"
          fontSize={size * 0.085}
        >
          {label}
        </text>
      )}
    </svg>
  )
}

export default IvGauge
