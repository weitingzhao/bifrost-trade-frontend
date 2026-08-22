/**
 * Four-segment probability bar (Rangy / Bull / Bear / Squeeze).
 * HTML flex segments — avoids SVG preserveAspectRatio text distortion.
 */
import { cn } from '@/lib/utils'

interface Segment {
  label: string
  value: number
  className: string
}

interface ProbabilityBarProps {
  rangy: number
  bull: number
  bear: number
  squeeze: number
  height?: number
  className?: string
}

/** Min fraction of bar width before showing in-segment label. */
const LABEL_MIN = 0.08

export function ProbabilityBar({
  rangy,
  bull,
  bear,
  squeeze,
  height = 28,
  className,
}: ProbabilityBarProps) {
  const total = rangy + bull + bear + squeeze
  if (total <= 0) return null

  const segments: Segment[] = [
    { label: 'Rangy', value: rangy / total, className: 'bg-violet-500' },
    { label: 'Bull', value: bull / total, className: 'bg-emerald-500' },
    { label: 'Bear', value: bear / total, className: 'bg-red-500' },
    { label: 'Squeeze', value: squeeze / total, className: 'bg-amber-500' },
  ].filter((s) => s.value > 0.005)

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className="flex w-full overflow-hidden rounded-md"
        style={{ height }}
        role="img"
        aria-label="Scenario probability distribution"
      >
        {segments.map((seg) => {
          const pct = Math.round(seg.value * 100)
          const showLabel = seg.value >= LABEL_MIN
          return (
            <div
              key={seg.label}
              className={cn(
                'flex min-w-0 items-center justify-center px-1 text-white',
                seg.className,
              )}
              style={{ flexGrow: seg.value, flexBasis: 0 }}
              title={`${seg.label} ${pct}%`}
            >
              {showLabel ? (
                <span className="truncate text-dense-caption font-semibold tabular-nums leading-none">
                  {seg.label} {pct}%
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map((seg) => (
          <span
            key={`legend-${seg.label}`}
            className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground"
          >
            <span className={cn('inline-block size-2 shrink-0 rounded-sm', seg.className)} />
            <span className="tabular-nums">
              {seg.label} {(seg.value * 100).toFixed(0)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default ProbabilityBar
