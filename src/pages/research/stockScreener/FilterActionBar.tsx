import { Button } from '@/components/ui/button'
import type { FilterPreview } from '@/types/stockScreener'
import type { TierKey } from '@/constants/stockScreenerCatalog'

interface Props {
  condCount: number
  techCount: number
  tierFilters: Record<TierKey, { indicators: Set<string>; minScore: number }>
  filterPreview: FilterPreview | null
  filterLoading: boolean
  filterError: string | null
  onSearch: () => void
  onApply: () => void
  onRetry: () => void
  onClear: () => void
}

export function FilterActionBar({
  condCount,
  techCount,
  tierFilters,
  filterPreview,
  filterLoading,
  filterError,
  onSearch,
  onApply,
  onRetry,
  onClear,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 text-xs">
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {condCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
            {condCount} Fundamental
          </span>
        )}
        {condCount > 0 && techCount > 0 && <span className="text-muted-foreground">∩</span>}
        {techCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-mono">
            {techCount} Technical
          </span>
        )}
        {(['momentum', 'structure', 'sentiment'] as TierKey[]).map((tk) => {
          const f = tierFilters[tk]
          const n = f.indicators.size + (f.minScore > 0 ? 1 : 0)
          if (n === 0) return null
          const colors: Record<TierKey, string> = {
            momentum: 'bg-sky-500/15 text-sky-400',
            structure: 'bg-amber-500/15 text-amber-400',
            sentiment: 'bg-rose-500/15 text-rose-400',
          }
          return (
            <span key={tk} className={`px-1.5 py-0.5 rounded font-mono ${colors[tk]}`}>
              {n} {tk.charAt(0).toUpperCase() + tk.slice(1)}
            </span>
          )
        })}
        {filterLoading && <span className="text-muted-foreground">Searching…</span>}
        {!filterLoading && filterPreview && !filterError && (
          <span className="text-muted-foreground">
            <strong className="text-foreground font-mono">{filterPreview.symbols.length}</strong>
            {' '}match{filterPreview.symbols.length !== 1 ? 'es' : ''} ({filterPreview.parts})
            <span className="ml-1 opacity-70">— click Apply →</span>
          </span>
        )}
        {filterError && <span className="text-destructive">{filterError}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!filterPreview && (
          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onSearch} disabled={filterLoading}>
            {filterLoading ? 'Searching…' : 'Search'}
          </Button>
        )}
        {filterPreview && (
          <Button size="sm" className="h-7 text-xs" onClick={onApply}>
            Apply ({filterPreview.symbols.length})
          </Button>
        )}
        {filterPreview && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}
