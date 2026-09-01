import { DenseTag } from '@/components/data-display'
import { useUniverseReach } from '@/hooks/useUniverseReach'
import { fmtInt } from '@/lib/format'

/**
 * How much of the warehouse the Loop can actually see.
 *
 * The Loop proposes from the scan snapshot, whose universe is assembled from
 * option-derived feature tables — so it is bounded by the option footprint, not
 * by how many symbols were bought. Without this strip that gap is invisible: the
 * run says `scan`, and you have to query the warehouse to learn it means 28.
 */
export function UniverseReachStrip() {
  const { data, isLoading, isError } = useUniverseReach()

  if (isLoading) {
    return (
      <div className="text-dense-meta text-muted-foreground">Universe reach — loading…</div>
    )
  }
  if (isError || !data) {
    return (
      <div className="text-dense-meta text-muted-foreground">
        Universe reach — unavailable
      </div>
    )
  }

  const pct = data.loop_pct_of_widest

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border/60 bg-secondary/50 px-3 py-2">
      <span className="text-dense-label font-medium">Universe reach</span>
      {data.layers.map((layer, i) => (
        <span key={layer.key} className="flex items-center gap-2">
          {i > 0 ? <span className="text-muted-foreground/50">→</span> : null}
          <span className="text-dense-meta text-muted-foreground" title={layer.table}>
            {layer.label}
          </span>
          <DenseTag variant={layer.status === 'ok' ? 'neutral' : 'warning'} size="cell">
            {layer.symbols == null ? 'not measured' : fmtInt(layer.symbols)}
          </DenseTag>
        </span>
      ))}
      {pct != null ? (
        <DenseTag variant={pct < 1 ? 'warning' : 'category'} size="cell">
          Loop sees {pct}% of priced symbols
        </DenseTag>
      ) : (
        <DenseTag variant="warning" size="cell">
          reach not measured
        </DenseTag>
      )}
    </div>
  )
}
