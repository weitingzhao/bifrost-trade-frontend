import { DenseTag } from '@/components/data-display'
import { useCandidateOutcomeSummary } from '@/hooks/useCandidateOutcome'
import { fmtPct1 } from '@/lib/format'

/**
 * Did the symbols the Loop proposed actually do anything?
 *
 * Hit means "beat SPY over the same window", not "went up" — candidates carry no
 * direction, and an absolute win rate mostly reports the market. A horizon with
 * nothing settled shows `pending`, never 0%: a young pool is not a failing one.
 */
export function CandidateOutcomeSummary({ source }: { source?: string }) {
  const { data, isLoading, isError } = useCandidateOutcomeSummary({ source })

  if (isLoading) {
    return <div className="text-dense-meta text-muted-foreground">Outcomes — loading…</div>
  }
  if (isError || !data) {
    return <div className="text-dense-meta text-muted-foreground">Outcomes — unavailable</div>
  }

  const anySettled = data.horizons.some((h) => h.judged > 0)

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border/60 bg-secondary/50 px-3 py-2">
      <span className="text-dense-label font-medium">Outcomes</span>
      <span className="text-dense-meta text-muted-foreground">vs SPY, same window</span>

      {data.horizons.length === 0 ? (
        <DenseTag variant="warning" size="cell">
          nothing settled yet — {data.pending} candidate{data.pending === 1 ? '' : 's'} waiting for
          their forward window
        </DenseTag>
      ) : (
        data.horizons.map((h) => (
          <span key={h.horizon_days} className="flex items-center gap-1.5">
            <span className="text-dense-meta text-muted-foreground">T+{h.horizon_days}</span>
            <DenseTag
              variant={
                h.hit_rate == null ? 'warning' : h.hit_rate >= 0.5 ? 'success' : 'neutral'
              }
              size="cell"
            >
              {h.hit_rate == null ? 'pending' : `${fmtPct1(h.hit_rate * 100)} beat`}
            </DenseTag>
            <span className="text-dense-caption text-muted-foreground">
              n={h.judged}
              {h.avg_excess != null ? ` · avg ${fmtPct1(h.avg_excess * 100)}` : ''}
            </span>
          </span>
        ))
      )}

      {anySettled && data.pending > 0 ? (
        <span className="text-dense-caption text-muted-foreground ml-auto">
          {data.pending} still pending
        </span>
      ) : null}
    </div>
  )
}
