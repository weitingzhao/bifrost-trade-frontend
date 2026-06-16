import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchOpsQueuesSummary } from '@/api/ops'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { fmt } from '@/utils/stockDataReadiness/format'
import { formatQueueLabel } from '@/utils/celeryQueueLabels'
import { cn } from '@/lib/utils'
import { readinessStepUi } from './stockDataReadinessStepUi'

export function ReadinessReferenceTab({
  summary,
  summaryLoading,
  onRefreshSummary,
}: {
  summary: SepaReadinessSummaryResponse | null
  summaryLoading: boolean
  onRefreshSummary: () => void
}) {
  const {
    data: queuesData,
    isLoading: queuesLoading,
    error: queuesError,
    refetch: refetchQueues,
  } = useQuery({
    queryKey: QUERY_KEYS.ops.queuesSummary,
    queryFn: fetchOpsQueuesSummary,
    staleTime: 30_000,
  })

  const queues = queuesData?.queues ?? []
  const queuesErr = queuesError instanceof Error ? queuesError.message : null

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notes breakdown</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={summaryLoading}
            onClick={onRefreshSummary}
          >
            Refresh
          </Button>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground mb-3">
            Symbols included in universe, not price-ready, today
          </p>
          <div className={readinessStepUi.snapTableWrap}>
            <table className={readinessStepUi.snapTable}>
              <thead>
                <tr>
                  <th className={readinessStepUi.snapTh}>Notes</th>
                  <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Count</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.notes_breakdown?.length ?? 0) > 0 ? (
                  summary!.notes_breakdown!.map(row => (
                    <tr key={row.notes}>
                      <td className={readinessStepUi.snapTd}>
                        <code className={readinessStepUi.snapCodePill}>{row.notes}</code>
                      </td>
                      <td className={cn(readinessStepUi.snapTd, readinessStepUi.snapNum)}>
                        {row.count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className={cn(readinessStepUi.snapTdLast, readinessStepUi.snapDim)}>
                      {summaryLoading
                        ? 'Loading…'
                        : 'No rows — snapshot empty or all symbols are price-ready.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Celery broker queues</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/operations/celery">Open Settings → Celery</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={queuesLoading}
              onClick={() => void refetchQueues()}
            >
              {queuesLoading ? 'Loading…' : 'Reload'}
            </Button>
          </div>
        </div>
        <div className="px-4 py-3">
          {queuesErr && (
            <p className="text-xs text-muted-foreground mb-2 rounded-md border border-border px-2 py-1.5">
              {queuesErr}
            </p>
          )}
          {queuesLoading && queues.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-8 rounded" />
              ))}
            </div>
          ) : (
            <div className={readinessStepUi.snapTableWrap}>
              <table className={readinessStepUi.snapTable}>
                <thead>
                  <tr>
                    <th className={readinessStepUi.snapTh}>Queue</th>
                    <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Pending</th>
                    <th className={cn(readinessStepUi.snapTh, readinessStepUi.snapNum)}>Running</th>
                  </tr>
                </thead>
                <tbody>
                  {queues.length > 0 ? (
                    queues.map(q => (
                      <tr key={q.name}>
                        <td className={readinessStepUi.snapTd}>
                          {q.display_name?.trim() || formatQueueLabel(q.name)}
                        </td>
                        <td className={cn(readinessStepUi.snapTd, readinessStepUi.snapNum)}>
                          {fmt(q.pending_broker)}
                        </td>
                        <td className={cn(readinessStepUi.snapTd, readinessStepUi.snapNum)}>
                          {fmt(q.running_celery)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className={cn(readinessStepUi.snapTdLast, readinessStepUi.snapDim)}>
                        {queuesLoading ? 'Loading…' : 'No queue data.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
