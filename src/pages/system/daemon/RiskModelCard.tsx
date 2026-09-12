/**
 * The daemon's risk-model summary: what its auto status and the last 24 hours
 * of operations say — hedges today, the day's P&L, the spot it hedges against,
 * operations count. These four tiles were a page of their own under
 * Portfolio; they are daemon telemetry, so they live with the daemon.
 */
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DenseTag } from '@/components/data-display'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RiskSummaryResponse } from '@/types/monitor'
import { daemonSectionTitleClass } from './daemonUi'

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="elevated" size="sm">
      <CardContent className="py-3">
        <p className="mb-1 text-dense-caption uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

export function RiskModelCard({
  data,
  isLoading,
  isFetching,
  error,
  onRefresh,
}: {
  data: RiskSummaryResponse | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown
  onRefresh: () => void
}) {
  const hedges = data?.daily_hedge_count
  const ops = data?.operations_count_24h ?? 0
  const idle = data != null && (hedges ?? 0) === 0 && (data.daily_pnl ?? 0) === 0 && data.spot == null && ops === 0
  return (
    <section aria-label="Risk model" data-testid="risk-model-card">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={daemonSectionTitleClass}>Risk model</h3>
        <span className="text-dense-caption text-muted-foreground">
          daemon auto status + operations, last 24 h · refreshes every 30 s
        </span>
      </div>
      {error != null ? <QueryErrorAlert error={error} className="mb-3" onRetry={onRefresh} /> : null}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))}
        </div>
      ) : data != null ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Daily hedge count" value={hedges == null ? '—' : String(hedges)} />
          <Tile label="Daily PnL (USD)" value={fmtUsd(data.daily_pnl)} />
          <Tile label={data.symbol ? `Spot · ${data.symbol}` : 'Spot'} value={fmtUsd(data.spot)} />
          <Tile label="Ops (24h)" value={String(ops)} />
        </div>
      ) : error == null ? (
        <p className="text-sm text-muted-foreground">Unable to load the risk summary (check API and DB).</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-dense-caption text-muted-foreground">
        {idle ? <span>All zero: the daemon is not hedging while trading execution is frozen (D10).</span> : null}
        {data?.block_reasons?.map((r) => (
          <DenseTag key={r} variant="category" size="cell">
            {r}
          </DenseTag>
        ))}
        <Button type="button" variant="secondary" size="sm" className="ml-auto h-6 px-2 text-dense-caption" disabled={isFetching} onClick={onRefresh}>
          <RefreshCw className={cn('mr-1 size-3', isFetching && 'animate-spin')} />
          {isFetching ? 'Loading…' : 'Refresh'}
        </Button>
      </div>
    </section>
  )
}
