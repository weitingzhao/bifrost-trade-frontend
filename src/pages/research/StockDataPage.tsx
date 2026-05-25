import { useQuery } from '@tanstack/react-query'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQueryClient } from '@tanstack/react-query'
import { fetchDataReadinessSummary } from '@/api/research'

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={cn('h-2 rounded bg-muted overflow-hidden', className)}>
      <div
        className={cn('h-full rounded transition-all', pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs',
      ok
        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
        : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    )}>
      {ok
        ? <CheckCircle2 className="h-3 w-3 shrink-0" />
        : <XCircle className="h-3 w-3 shrink-0" />}
      {label}
    </div>
  )
}

export default function StockDataPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['research', 'data-readiness'],
    queryFn: fetchDataReadinessSummary,
    staleTime: 300_000,
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock Data Readiness</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coverage overview for the research data pipeline
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['research', 'data-readiness'] })}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-4">
          {/* Universe overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3 bg-card">
              <p className="text-xs text-muted-foreground">Universe</p>
              <p className="text-2xl font-semibold tabular-nums mt-0.5">
                {data.universe_count.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">total symbols</p>
            </div>
            <div className="rounded-lg border border-border p-3 bg-card">
              <p className="text-xs text-muted-foreground">Active Tickers</p>
              <p className="text-2xl font-semibold tabular-nums mt-0.5">
                {data.tickers_active_count.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">with recent data</p>
            </div>
            <div className="rounded-lg border border-border p-3 bg-card col-span-2">
              <p className="text-xs text-muted-foreground mb-2">Price Readiness (live)</p>
              {data.price_readiness_live != null ? (
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={data.price_readiness_live.price_ready}
                    max={data.price_readiness_live.total_symbols}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono tabular-nums shrink-0">
                    {data.price_readiness_live.price_ready} / {data.price_readiness_live.total_symbols}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Snapshot status */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Snapshot Status</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={data.snapshot_populated} label="Snapshot populated" />
              <StatusBadge ok={data.snapshot_today} label="Snapshot today" />
            </div>
          </div>

          {/* Fundamentals coverage */}
          {data.fundamentals_coverage != null && Object.keys(data.fundamentals_coverage).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Fundamentals Coverage</p>
              <div className="space-y-2">
                {Object.entries(data.fundamentals_coverage).map(([table, { total, with_data }]) => {
                  const pct = total > 0 ? Math.round((with_data / total) * 100) : 0
                  return (
                    <div key={table} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{table}</span>
                        <span className="tabular-nums">
                          {with_data.toLocaleString()} / {total.toLocaleString()}
                          <span className="text-muted-foreground ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={with_data} max={total} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
