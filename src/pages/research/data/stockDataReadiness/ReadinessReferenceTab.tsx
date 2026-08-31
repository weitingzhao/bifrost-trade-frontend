import { Button } from '@/components/ui/button'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
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
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Ingest runtime</h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Trade background queues are retired. Stock readiness ingest is owned by Market Data
            Plugin CronJobs and its PostgreSQL job broker.
          </p>
        </div>
      </div>
    </div>
  )
}
