import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { SepaReadinessCatalogEntry, SepaReadinessDataCatalog } from '@/types/stockDataReadiness'
import { cn } from '@/lib/utils'

const CATALOG_TABS = [
  {
    key: 'raw' as const,
    label: 'RAW',
    title: 'Raw data sources',
    description:
      'Tables populated by ingest jobs or writer services. These are the authoritative inputs consumed by readiness views and snapshot logic.',
  },
  {
    key: 'computed' as const,
    label: 'COMPUTED',
    title: 'Computed readiness layers',
    description:
      'Views and snapshot tables derived from raw sources. The KPI metrics above read from this layer. Each entry lists its raw-source dependencies.',
  },
]

function splitObject(object: string): [string | null, string] {
  const dot = object.indexOf('.')
  if (dot < 0) return [null, object]
  return [object.slice(0, dot), object.slice(dot + 1)]
}

function sourceTag(entry: SepaReadinessCatalogEntry): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const obj = entry.object.toLowerCase()
  if (obj.startsWith('v_') || obj.includes('.v_')) return { label: 'VIEW', variant: 'secondary' }
  if (entry.view_query) return { label: 'VIEW', variant: 'secondary' }
  return { label: 'TABLE', variant: 'outline' }
}

function DataSourceCard({
  entry,
  variant,
}: {
  entry: SepaReadinessCatalogEntry
  variant: 'raw' | 'computed'
}) {
  const tag = sourceTag(entry)
  const [schema, name] = splitObject(entry.object)
  const isComputed = variant === 'computed'
  const hasViewQuery = Boolean(entry.view_query?.trim())
  const [sqlCopied, setSqlCopied] = useState(false)

  const handleCopyViewSql = async () => {
    const text = entry.view_query?.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border overflow-hidden text-xs',
        variant === 'raw' ? 'border-l-2 border-l-sky-500/60' : 'border-l-2 border-l-violet-500/60',
      )}
    >
      <div className="p-3 space-y-2 bg-secondary">
        <div className="flex items-start justify-between gap-2">
          <div className="font-mono text-dense-meta min-w-0">
            {schema && <span className="text-muted-foreground">{schema}.</span>}
            <span className="text-sky-300/90 break-all">{name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isComputed && (
              <Badge
                variant="outline"
                className={cn(
                  'text-dense-micro',
                  hasViewQuery ? 'text-lamp-green border-lamp-green/40' : 'text-muted-foreground',
                )}
              >
                {hasViewQuery ? 'SQL' : 'NO SQL'}
              </Badge>
            )}
            <Badge variant={tag.variant} className="text-dense-micro">
              {tag.label}
            </Badge>
          </div>
        </div>

        {isComputed && (
          <div className="rounded-md border border-border bg-background/50 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-dense-caption font-semibold text-muted-foreground uppercase tracking-wide">
                {hasViewQuery ? 'View SQL (live from PostgreSQL)' : 'No view SQL available'}
              </span>
              {hasViewQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-dense-caption"
                  onClick={() => void handleCopyViewSql()}
                >
                  {sqlCopied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            {hasViewQuery ? (
              <pre className="max-h-40 overflow-auto text-dense-caption font-mono text-muted-foreground whitespace-pre-wrap">
                {entry.view_query}
              </pre>
            ) : (
              <p className="text-dense-caption text-muted-foreground">
                This object is not a PostgreSQL view (or view definition is unavailable with current DB
                permissions).
              </p>
            )}
          </div>
        )}

        <p className="text-muted-foreground leading-snug">{entry.role}</p>

        {entry.typical_ingest && (
          <div className="flex flex-wrap gap-x-2 text-dense-caption">
            <span className="text-muted-foreground uppercase tracking-wide">Typical ingest</span>
            <span>{entry.typical_ingest}</span>
          </div>
        )}

        {entry.depends_on && entry.depends_on.length > 0 && (
          <div className="space-y-1">
            <span className="text-dense-caption text-muted-foreground uppercase tracking-wide">Depends on</span>
            <div className="flex flex-wrap gap-1">
              {entry.depends_on.map(d => (
                <span key={d} className="rounded bg-muted px-1.5 py-px font-mono text-dense-caption">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {entry.data_points.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/60">
            <span className="text-dense-caption font-semibold text-muted-foreground uppercase tracking-wide">
              Supported data points
            </span>
            <div className="flex flex-wrap gap-1">
              {entry.data_points.map(dp => (
                <span key={dp} className="rounded bg-muted/80 px-1.5 py-px text-dense-caption">
                  {dp}
                </span>
              ))}
            </div>
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState<'raw' | 'computed'>('raw')

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

  const entries = activeTab === 'raw' ? catalog.raw_sources : catalog.computed_layers
  const meta = CATALOG_TABS.find(t => t.key === activeTab)!

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2" role="tablist" aria-label="Data catalog">
        {CATALOG_TABS.map(tab => {
          const count =
            (tab.key === 'raw' ? catalog.raw_sources : catalog.computed_layers)?.length ?? 0
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'flex flex-1 flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-sidebar-primary bg-secondary'
                  : 'border-border bg-secondary/30 hover:border-muted-foreground/40',
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <span
                className={cn(
                  'text-dense-caption font-bold uppercase tracking-wider',
                  tab.key === 'raw' ? 'text-sky-400' : 'text-violet-400',
                )}
              >
                {tab.label}
              </span>
              <span className="text-xs font-medium">{tab.title}</span>
              {count > 0 && (
                <span className="text-dense-caption font-mono text-muted-foreground">{count} entries</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {entries?.map(e => (
          <DataSourceCard key={e.id} entry={e} variant={activeTab} />
        ))}
      </div>
      {(entries?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No {activeTab} catalog entries.</p>
      )}
    </div>
  )
}
