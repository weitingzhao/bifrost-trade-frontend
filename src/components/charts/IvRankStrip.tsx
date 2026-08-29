/**
 * IV Rank position strip — Wave 16 (Bloomberg / Tastyworks style).
 * Shows where current IV Rank sits on a 0–100 rail; optional spark of recent ranks.
 */
import { cn } from '@/lib/utils'

export function IvRankStrip({
  rank,
  history = [],
  className,
}: {
  rank: number | null | undefined
  /** Optional trailing ranks (oldest → newest), used as spark when length ≥ 2 */
  history?: Array<number | null>
  className?: string
}) {
  const pts = history.filter((v): v is number => v != null && Number.isFinite(v))
  const hasSpark = pts.length >= 2
  const r = rank != null && Number.isFinite(rank) ? Math.max(0, Math.min(100, rank)) : null

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative h-2.5 w-full rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 w-[30%] rounded-l-full bg-success/25" />
        <div className="absolute inset-y-0 left-[30%] w-[30%] bg-warning/20" />
        <div className="absolute inset-y-0 left-[60%] right-0 rounded-r-full bg-destructive/20" />
        {r != null ? (
          <span
            className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-sm bg-foreground"
            style={{ left: `calc(${r}% - 2px)` }}
            title={`IV Rank ${r.toFixed(1)}`}
          />
        ) : null}
      </div>
      <div className="flex justify-between text-dense-micro text-muted-foreground font-mono">
        <span>0 Low</span>
        <span>30</span>
        <span>60</span>
        <span>100 High</span>
      </div>
      {hasSpark ? (
        <svg viewBox="0 0 120 28" className="h-7 w-full text-foreground" aria-hidden>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            points={pts
              .map((v, i) => {
                const x = (i / (pts.length - 1)) * 120
                const y = 26 - (Math.max(0, Math.min(100, v)) / 100) * 24
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')}
          />
        </svg>
      ) : (
        <p className="text-dense-caption text-muted-foreground">
          {r == null
            ? 'No IV Rank yet.'
            : `Current IV Rank ${r.toFixed(1)} (90d series when history endpoint is wired).`}
        </p>
      )}
    </div>
  )
}
