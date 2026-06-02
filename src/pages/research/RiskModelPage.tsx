import { PageHeader, PageSection, PageShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { useRiskSummary } from '@/hooks/useRiskSummary'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

function RiskMetricTile({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Card variant="elevated" size="sm">
      <CardContent className="py-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('font-mono text-lg font-semibold tabular-nums', valueClass)}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function RiskModelPage() {
  const { data, isLoading, isFetching, error, refetch } = useRiskSummary()

  const hedgeCount =
    data?.daily_hedge_count != null ? String(data.daily_hedge_count) : '—'
  const opsCount = data?.operations_count_24h ?? 0

  return (
    <PageShell>
      <PageHeader
        title="Risk Model"
        description="Risk model summary from daemon auto status and operations (daily hedge count, daily PnL, spot, ops 24h). Data from GET /risk_summary."
      />

      <p className="mt-2 text-sm text-muted-foreground">
        Summary of risk model metrics; refreshes every 30s. Source: daemon auto status + operations
        (last 24h). Position sizing analysis is available in Watchlist → Sizing step.
      </p>

      <PageSection first title="Risk model" className="mt-6">
        {error != null && (
          <QueryErrorAlert error={error} className="mb-4" onRetry={() => void refetch()} />
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ) : data != null ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <RiskMetricTile label="Daily hedge count" value={hedgeCount} />
            <RiskMetricTile label="Daily PnL (USD)" value={fmtUsd(data.daily_pnl)} />
            <RiskMetricTile label="Spot" value={fmtUsd(data.spot)} />
            <RiskMetricTile label="Ops (24h)" value={String(opsCount)} />
          </div>
        ) : error == null ? (
          <p className="text-sm text-muted-foreground">
            Unable to load risk summary (check API and DB).
          </p>
        ) : null}

        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn('mr-1.5 size-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </PageSection>
    </PageShell>
  )
}
