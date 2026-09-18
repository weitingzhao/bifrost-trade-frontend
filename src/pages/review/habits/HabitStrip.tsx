/**
 * One habit's distribution: a dot per trade, the average, and the reference the
 * design draws behind it.
 *
 * The strip is the design's answer to a page of averages. An average of 41 days
 * held says one thing; forty dots clustered at 30 with three at 120 says a
 * different and truer one, and neither the mean nor its interval shows that.
 *
 * Dots are coloured by the trade's own P&L, so the reader can see whether the
 * tail of a tendency is where the money was made or lost.
 */
import { linearScale } from '@/lib/chartScale'
import { chartAxisTickFill, chartTokens } from '@/lib/chartTokens'
import { plotRange, type HabitReading } from '@/utils/reviewHabits'

const VW = 300
const H = 34
const PL = 6
const PR = 6

export function HabitStrip({ habit, fmt }: { habit: HabitReading; fmt: (v: number) => string }) {
  const values = habit.dots.map((d) => d.value)
  if (values.length === 0 || habit.value == null) return null

  // The axis follows the middle half's own spread, not the extremes. One trade
  // that closed for twenty-three times the credit it took in would otherwise
  // pin every other dot into a single pixel column, which is the opposite of
  // what a distribution strip is for. Dots outside it are drawn on its edge and
  // counted underneath.
  const [lo, hi] = plotRange(values) as [number, number]
  const span = [lo, hi, ...(habit.reference == null ? [] : [habit.reference.value]), habit.value]
  const x = linearScale(span, { size: VW, padStart: PL, padEnd: PR })
  const at = (v: number) => x.at(Math.min(x.max, Math.max(x.min, v)))
  const clipped = values.filter((v) => v < x.min || v > x.max).length
  // Dots at the same value would stack exactly; fan them across the band
  // instead so the density is visible rather than implied.
  const byValue = new Map<number, number>()

  return (
    <div className="min-w-0">
      <svg
        viewBox={`0 0 ${VW} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label={`${habit.label}: ${habit.dots.length} trades`}
      >
        <line x1={PL} y1={24} x2={VW - PR} y2={24} stroke={chartTokens.grid} strokeWidth={1} />
        {habit.reference == null ? null : (
          <line
            x1={at(habit.reference.value)}
            y1={3}
            x2={at(habit.reference.value)}
            y2={31}
            stroke={chartAxisTickFill}
            strokeWidth={1.2}
            strokeDasharray="2 3"
          />
        )}
        <line x1={at(habit.value)} y1={5} x2={at(habit.value)} y2={31} stroke={chartTokens.accent} strokeWidth={1.6} />
        {habit.dots.map((d) => {
          const seen = byValue.get(d.value) ?? 0
          byValue.set(d.value, seen + 1)
          return (
            <circle
              key={d.key}
              cx={at(d.value)}
              cy={24 - (seen % 4) * 5.5}
              r={3}
              fill={d.realised >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
              stroke="var(--card)"
              strokeWidth={1}
            />
          )
        })}
      </svg>
      <div className="flex justify-between gap-2 pt-0.5 font-mono text-dense-caption tabular-nums text-muted-foreground">
        <span>{fmt(x.min)}</span>
        {clipped > 0 ? <span className="font-sans">{clipped} outside, on the edges</span> : null}
        {habit.reference == null ? null : <span className="font-sans">{habit.reference.label}</span>}
        <span>{fmt(x.max)}</span>
      </div>
    </div>
  )
}
