import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RunbookDerivedState } from '@/utils/stockDataReadiness/runbook'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { fmt, fmtRelativeTime } from '@/utils/stockDataReadiness/format'
import { CheckStatusDot } from './CheckStatusDot'
import { StepCheckStrip } from './StepCheckStrip'

interface Props {
  runbookStages: import('@/types/stockDataReadiness').RunbookStageView[]
  checkedSteps: Set<number>
  collapsedStages: Set<string>
  summaryLoading: boolean
  summary: SepaReadinessSummaryResponse | null
  summaryLoadedAt: string | null
  derived: RunbookDerivedState
  onToggleStage: (stageId: import('@/types/stockDataReadiness').RunbookStageId) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onResetChecks: () => void
}

export function CheckResultsPanel({
  runbookStages,
  checkedSteps,
  collapsedStages,
  summaryLoading,
  summary,
  summaryLoadedAt,
  derived,
  onToggleStage,
  onExpandAll,
  onCollapseAll,
  onResetChecks,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-secondary/80 p-4 space-y-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Check Results</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onExpandAll}>
            Expand all
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onCollapseAll}>
            Collapse all
          </Button>
          {checkedSteps.size > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onResetChecks}>
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {runbookStages.map(stage => {
          const collapsed = collapsedStages.has(stage.id)
          return (
            <div key={stage.id} className="rounded-lg border border-border/80 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/40"
                onClick={() => onToggleStage(stage.id)}
                aria-expanded={!collapsed}
              >
                <CheckStatusDot status={stage.stageStatus} />
                <span className="font-medium flex-1 truncate">{stage.title}</span>
                <span className="text-muted-foreground tabular-nums">
                  {stage.doneCount}/{stage.steps.length}
                </span>
                <span className="text-muted-foreground w-3">{collapsed ? '▸' : '▾'}</span>
              </button>
              {!collapsed && (
                <div className="border-t border-border/60 divide-y divide-border/40">
                  {stage.steps.map(s => {
                    const isChecked = checkedSteps.has(s.id)
                    return (
                      <div
                        key={s.id}
                        className={cn('px-3 py-2 space-y-1.5', isChecked && 'bg-muted/20')}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              'font-mono font-bold w-5 text-center',
                              isChecked && s.status === 'ok' && 'text-emerald-500',
                              isChecked && s.status === 'error' && 'text-destructive',
                              isChecked && s.status === 'warn' && 'text-warning',
                            )}
                          >
                            {s.id}
                          </span>
                          <span className="font-medium flex-1">{s.title}</span>
                          {summaryLoading && <CheckStatusDot status="loading" />}
                          {isChecked && !summaryLoading && <CheckStatusDot status={s.status} />}
                        </div>
                        {!isChecked ? (
                          <p className="text-[10px] text-muted-foreground pl-7">
                            Use Check in the run book header above
                          </p>
                        ) : summaryLoading ? (
                          <p className="text-[10px] text-muted-foreground pl-7">Checking…</p>
                        ) : (
                          <div className="pl-7 space-y-1.5">
                            {s.id === 1 && (
                              <>
                                <StepCheckStrip
                                  hasChecked
                                  loading={false}
                                  status={derived.step1Status}
                                  primary={`${fmt(derived.universeCount)} equity universe`}
                                  primaryLabel=" · v_us_equity_universe"
                                  secondary={
                                    derived.tickersActive > 0
                                      ? `${fmt(derived.tickersActive)} active US stocks in DB`
                                      : null
                                  }
                                  target="≥ 5,000 active US equity symbols"
                                  note={
                                    summary?.tickers_last_synced_at
                                      ? `Last synced ${fmtRelativeTime(summary.tickers_last_synced_at)}`
                                      : summaryLoadedAt
                                        ? `Checked ${fmtRelativeTime(summaryLoadedAt)}`
                                        : null
                                  }
                                />
                                <StepCheckStrip
                                  hasChecked
                                  loading={false}
                                  status={derived.holidaysStatus}
                                  primary={
                                    derived.holidaysTotal > 0
                                      ? `${fmt(derived.holidaysTotal)} holidays · ${fmt(derived.holidaysMassive)} from Massive · ${fmt(derived.holidaysSeed)} seeded`
                                      : 'No holidays loaded'
                                  }
                                  primaryLabel=" · all exchanges"
                                  secondary={
                                    derived.holidaysEarlyClose > 0
                                      ? `${fmt(derived.holidaysEarlyClose)} early-close days`
                                      : null
                                  }
                                  target="Seed 2020-2027 + Massive upcoming (~12 months)"
                                  note={
                                    derived.holidaysLastSync
                                      ? `Massive sync ${fmtRelativeTime(derived.holidaysLastSync)}${derived.holidaysEarliest && derived.holidaysLatest ? ` · ${derived.holidaysEarliest} → ${derived.holidaysLatest}` : ''}`
                                      : summaryLoadedAt
                                        ? `Checked ${fmtRelativeTime(summaryLoadedAt)}`
                                        : null
                                  }
                                />
                              </>
                            )}
                            {s.id === 2 && (
                              <StepCheckStrip
                                hasChecked
                                loading={false}
                                status={derived.unifiedSnapStatus}
                                primary={
                                  derived.unifiedSnapRows != null && derived.unifiedSnapRows > 0
                                    ? `${fmt(derived.unifiedSnapRows)} symbols cached`
                                    : 'No unified snapshot rows yet'
                                }
                                primaryLabel=" · cache_stock_snapshot"
                                secondary={
                                  summary?.stock_unified_snapshot_last_fetched_at
                                    ? `Last fetch ${fmtRelativeTime(summary.stock_unified_snapshot_last_fetched_at)}`
                                    : null
                                }
                                target="Run once after Step 1 before heavy stock_day backfill"
                              />
                            )}
                            {s.id === 3 && (
                              <StepCheckStrip
                                hasChecked
                                loading={false}
                                status={derived.barStepStatus}
                                primary={
                                  derived.totalSymbols > 0
                                    ? `${fmt(derived.priceReady)} / ${fmt(derived.totalSymbols)} price_ready`
                                    : null
                                }
                                primaryLabel=" · cache vs stock_day + readiness fallback"
                                gap={derived.priceGap}
                                gapUnit="symbols need daily fill"
                                target="Vendor NY date from Step 2 cache ≤ last massive daily bar"
                              />
                            )}
                            {s.id >= 4 && s.id <= 9 && (
                              <StepCheckStrip
                                hasChecked
                                loading={false}
                                status={s.status}
                                primary={`${s.metric}`}
                                gap={null}
                              />
                            )}
                            {s.id === 10 && (
                              <StepCheckStrip
                                hasChecked
                                loading={false}
                                status={s.status}
                                primary={s.metric}
                                target="Snapshot populated today · ≥50% fund cache coverage"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
