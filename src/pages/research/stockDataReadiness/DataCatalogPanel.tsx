import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { SepaReadinessDataCatalog } from '@/types/stockDataReadiness'

function CatalogList({
  title,
  entries,
  variant,
}: {
  title: string
  entries: SepaReadinessDataCatalog['raw_sources']
  variant: 'raw' | 'computed'
}) {
  if (!entries.length) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {entries.map(e => (
          <div
            key={e.id}
            className="rounded-lg border border-border p-3 text-xs space-y-1.5 bg-secondary"
          >
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-[11px] text-sky-300/90 truncate">{e.object}</code>
              <Badge variant="outline" className="text-[9px] shrink-0">
                {variant === 'raw' ? 'TABLE' : 'VIEW'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{e.role}</p>
            {e.data_points.length > 0 && (
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {e.data_points.slice(0, 4).join(' · ')}
                {e.data_points.length > 4 ? '…' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DataCatalogPanel({
  catalog,
  loading,
}: {
  catalog: SepaReadinessDataCatalog | null
  loading: boolean
}) {
  if (loading && !catalog) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }
  if (!catalog) {
    return (
      <p className="text-sm text-muted-foreground">
        Data catalog not returned. Deploy a backend that includes <code>data_catalog</code> on{' '}
        <code>/readiness/summary</code>, then reload summary.
      </p>
    )
  }
  return (
    <div className="space-y-6">
      <CatalogList title="Raw sources" entries={catalog.raw_sources} variant="raw" />
      <CatalogList title="Computed layers" entries={catalog.computed_layers} variant="computed" />
    </div>
  )
}
