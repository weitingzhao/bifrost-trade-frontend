import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SepaCriteriaStats } from '@/types/stockScreener'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { fmt } from '@/utils/stockDataReadiness/format'
import { CheckStatusDot } from './CheckStatusDot'
import type { CheckStatus } from '@/types/stockDataReadiness'

interface Props {
  summary: SepaReadinessSummaryResponse | null
  reviewStepStatus: CheckStatus
  notesCount: number
  criteriaLoading: boolean
  criteriaStats: SepaCriteriaStats | null
  fixGapsBusy: boolean
  fixGapsMsg: string | null
  fixGapsOk: boolean | null
  onRefreshCriteria: () => void
  onFixGaps: () => void
  onOpenJobs: () => void
}

export function ReadinessStatusSection({
  summary,
  reviewStepStatus,
  notesCount,
  criteriaLoading,
  criteriaStats,
  fixGapsBusy,
  fixGapsMsg,
  fixGapsOk,
  onRefreshCriteria,
  onFixGaps,
  onOpenJobs,
}: Props) {
  const snap = summary?.snapshot_today

  return (
    <div className="rounded-xl border border-border bg-secondary p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Readiness Status
        </h2>
        {summary?.snapshot_populated && snap != null && (
          <span className="text-xs text-muted-foreground">
            {fmt(snap.rows_total)} symbols · {fmt(snap.price_ready)} price_ready
            {snap.rows_total != null && snap.price_ready != null && snap.rows_total > 0
              ? ` (${Math.round((snap.price_ready / snap.rows_total) * 100)}%)`
              : ''}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={criteriaLoading || !summary?.snapshot_populated}
            onClick={onRefreshCriteria}
          >
            {criteriaLoading ? 'Computing…' : 'Refresh Criteria'}
          </Button>
          {criteriaStats?.computed_at && (
            <span className="text-xs text-muted-foreground">
              Last: {new Date(criteriaStats.computed_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {!summary?.snapshot_populated && (
        <p className="text-sm text-muted-foreground">
          No snapshot for today yet. Run <strong>Step 10 → Evaluate &amp; Refresh Snapshot</strong> to populate.
        </p>
      )}

      {summary?.snapshot_populated && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CheckStatusDot status={reviewStepStatus} />
            <span className="text-sm">
              {notesCount === 0
                ? 'All universe symbols are price_ready'
                : `${fmt(notesCount)} universe symbols not price_ready`}
              {summary.fund_cache_view_exists && (
                <span className="text-muted-foreground">
                  {' '}
                  · {fmt(summary.fund_cache_valid_count ?? null)} fund cache valid
                </span>
              )}
            </span>
            <div className="flex flex-wrap gap-2 ml-auto">
              <Button size="sm" disabled={fixGapsBusy} onClick={onFixGaps}>
                {fixGapsBusy ? 'Fixing…' : 'Fix Gaps'}
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenJobs}>
                View Jobs
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/settings/coverage/overview">Data Coverage →</Link>
              </Button>
            </div>
          </div>
          {fixGapsMsg && (
            <p className={fixGapsOk ? 'text-xs text-emerald-500' : 'text-xs text-destructive'}>{fixGapsMsg}</p>
          )}
          {(summary.notes_breakdown ?? []).length > 0 && notesCount > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground">Not price_ready by reason:</span>
              {summary.notes_breakdown!.map(nb => (
                <span
                  key={nb.notes ?? 'null'}
                  className="rounded-full border border-warning/40 bg-warning-soft/30 px-2 py-0.5"
                >
                  {nb.notes ?? '(unknown)'} — {fmt(nb.count)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
