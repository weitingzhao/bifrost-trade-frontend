import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, RefreshCw } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassiveRefJobProvider } from '@/components/massive/MassiveRefJobProvider'
import { useMassiveRefJobSession } from '@/components/massive/massiveRefJobContext'
import { ALL_SEPA_RUNBOOK_STEP_IDS, RUNBOOK_STAGE_LAYOUT } from '@/constants/stockDataReadiness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchSepaCriteriaStats } from '@/api/research/dataReadiness'
import {
  fetchSepaReadinessSummary,
  finBackfillPoster,
  gapAckTypeForFinKind,
  postSepaFundamentalsBackfill,
  postSepaGapAck,
  postSepaGroupedHistoryBackfill,
  postSepaPriceGapBackfill,
  postSepaReadinessSnapshot,
  postSepaStockUnifiedSnapshot,
  postSepaSyncHolidays,
  postSepaTechnicalBackfill,
} from '@/api/research/stockDataReadiness'
import type { TrackedMassiveDbJobKind } from '@/components/massive/massiveRefJobContext'
import type { FinDrawerKind, RunbookStageId, SepaRunStep } from '@/types/stockDataReadiness'
import { deriveRunbookState } from '@/utils/stockDataReadiness/runbook'
import { fmt } from '@/utils/stockDataReadiness/format'
import { CheckResultsPanel } from './CheckResultsPanel'
import { FinGapsSheet, PriceGapsSheet } from './GapSheets'
import { ReadinessMetricsStrip } from './ReadinessMetricsStrip'
import { ReadinessStatusSection } from './ReadinessStatusSection'
import { RunBookSection } from './RunBookSection'
import { StepDetailPanel } from './StepDetailPanel'
import { CriteriaOverviewPanel } from './CriteriaOverviewPanel'
import { DataCatalogPanel } from './DataCatalogPanel'

function PageInner() {
  const queryClient = useQueryClient()
  const refJobs = useMassiveRefJobSession()
  const [summaryLoadedAt, setSummaryLoadedAt] = useState<string | null>(null)

  const [activeRunStep, setActiveRunStep] = useState<SepaRunStep>(1)
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [collapsedResultStages, setCollapsedResultStages] = useState<Set<RunbookStageId>>(
    () => new Set(RUNBOOK_STAGE_LAYOUT.map(s => s.id)),
  )
  const [activeInfoTab, setActiveInfoTab] = useState<'metrics' | 'checklist' | 'database' | 'reference'>('metrics')

  const [holidaysSyncBusy, setHolidaysSyncBusy] = useState(false)
  const [holidaysSyncMsg, setHolidaysSyncMsg] = useState<string | null>(null)
  const [holidaysSyncOk, setHolidaysSyncOk] = useState<boolean | null>(null)
  const [universeErr, setUniverseErr] = useState<string | null>(null)

  const [unifiedSnapBusy, setUnifiedSnapBusy] = useState(false)
  const [unifiedSnapMsg, setUnifiedSnapMsg] = useState<string | null>(null)
  const [unifiedSnapOk, setUnifiedSnapOk] = useState<boolean | null>(null)

  const [groupedHistoryBusy, setGroupedHistoryBusy] = useState(false)
  const [groupedHistoryMsg, setGroupedHistoryMsg] = useState<string | null>(null)
  const [groupedHistoryOk, setGroupedHistoryOk] = useState<boolean | null>(null)

  const [evalPublishBusy, setEvalPublishBusy] = useState(false)
  const [evalPublishPhase, setEvalPublishPhase] = useState<'idle' | 'backfill' | 'snapshot'>('idle')
  const [fundBackfillMsg, setFundBackfillMsg] = useState<string | null>(null)
  const [fundBackfillOk, setFundBackfillOk] = useState<boolean | null>(null)
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null)
  const [snapshotOk, setSnapshotOk] = useState<boolean | null>(null)

  const [finAllBusy, setFinAllBusy] = useState(false)
  const [finAllMsg, setFinAllMsg] = useState<string | null>(null)
  const [finAllOk, setFinAllOk] = useState<boolean | null>(null)

  const [fixGapsBusy, setFixGapsBusy] = useState(false)
  const [fixGapsMsg, setFixGapsMsg] = useState<string | null>(null)
  const [fixGapsOk, setFixGapsOk] = useState<boolean | null>(null)

  const [voidAckBusy, setVoidAckBusy] = useState<string | null>(null)

  const [priceGapsOpen, setPriceGapsOpen] = useState(false)
  const [finGapsKind, setFinGapsKind] = useState<FinDrawerKind | null>(null)

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryQueryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: QUERY_KEYS.research.stockDataReadiness.summary,
    queryFn: async () => {
      const res = await fetchSepaReadinessSummary()
      setSummaryLoadedAt(new Date().toISOString())
      if (!res.ok) throw new Error(res.error ?? 'Research API returned ok:false')
      return res
    },
    staleTime: 60_000,
  })

  const snapshotPopulated = summary?.snapshot_populated ?? false

  const {
    data: criteriaStats,
    isLoading: criteriaLoading,
    refetch: refetchCriteria,
  } = useQuery({
    queryKey: QUERY_KEYS.research.stockDataReadiness.criteriaStats,
    queryFn: fetchSepaCriteriaStats,
    enabled: snapshotPopulated,
    staleTime: 120_000,
  })

  useEffect(() => {
    if (snapshotPopulated) void refetchCriteria()
  }, [snapshotPopulated, refetchCriteria])

  const derived = useMemo(
    () => deriveRunbookState(summary, summaryLoading, activeRunStep),
    [summary, summaryLoading, activeRunStep],
  )

  const handleCheckCoverage = useCallback(async () => {
    const res = await refetchSummary()
    if (res.data?.ok) {
      setCheckedSteps(new Set<number>(ALL_SEPA_RUNBOOK_STEP_IDS))
    }
  }, [refetchSummary])

  const runHolidaysSync = useCallback(async () => {
    setHolidaysSyncBusy(true)
    setHolidaysSyncMsg(null)
    setHolidaysSyncOk(null)
    try {
      const res = await postSepaSyncHolidays()
      if (!res.ok) {
        setHolidaysSyncMsg(res.error ?? 'Holidays sync failed')
        setHolidaysSyncOk(false)
        return res
      }
      setHolidaysSyncMsg(
        `Holidays synced — fetched ${fmt(res.fetched)}, inserted ${fmt(res.inserted)}, updated ${fmt(res.updated)}`,
      )
      setHolidaysSyncOk(true)
      void refetchSummary()
      return res
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Holidays sync failed'
      setHolidaysSyncMsg(msg)
      setHolidaysSyncOk(false)
      return { ok: false, error: msg }
    } finally {
      setHolidaysSyncBusy(false)
    }
  }, [refetchSummary])

  const runUniverseEnqueue = useCallback(async () => {
    setUniverseErr(null)
    const [tickerRes, holidaysRes] = await Promise.all([
      refJobs.enqueueTickerReferenceJob(
        'feed_stocks_tickers_reference_universe',
        { full_universe: true, limit: 1000, sort: 'ticker', order: 'asc' },
        'high',
      ),
      runHolidaysSync(),
    ])
    const parts = [
      !tickerRes.ok ? `Tickers: ${tickerRes.error ?? 'enqueue failed'}` : null,
      !holidaysRes.ok ? `Holidays: ${holidaysRes.error ?? 'sync failed'}` : null,
    ].filter(Boolean)
    if (parts.length) setUniverseErr(parts.join(' · '))
  }, [refJobs, runHolidaysSync])

  const runUnifiedSnapshot = useCallback(async () => {
    setUnifiedSnapBusy(true)
    setUnifiedSnapMsg(null)
    setUnifiedSnapOk(null)
    try {
      const res = await postSepaStockUnifiedSnapshot()
      if (!res.ok) {
        setUnifiedSnapMsg(res.error ?? 'Unified snapshot refresh failed')
        setUnifiedSnapOk(false)
        return
      }
      setUnifiedSnapMsg(
        [
          res.message,
          `symbols_total=${fmt(res.symbols_total)} rows_upserted=${fmt(res.rows_upserted)} elapsed=${fmt(res.elapsed_ms)}ms`,
        ]
          .filter(Boolean)
          .join(' — '),
      )
      setUnifiedSnapOk(true)
      void refetchSummary()
    } catch (e) {
      setUnifiedSnapMsg(e instanceof Error ? e.message : 'Unified snapshot refresh failed')
      setUnifiedSnapOk(false)
    } finally {
      setUnifiedSnapBusy(false)
    }
  }, [refetchSummary])

  const runGroupedHistory = useCallback(async () => {
    setGroupedHistoryBusy(true)
    setGroupedHistoryMsg(null)
    setGroupedHistoryOk(null)
    try {
      const res = await postSepaGroupedHistoryBackfill(420)
      if (!res.ok) {
        setGroupedHistoryMsg(res.error ?? 'Backfill failed')
        setGroupedHistoryOk(false)
        return
      }
      const queued = res.dates_queued ?? 0
      setGroupedHistoryMsg(
        res.message ??
          (queued === 0
            ? 'All trading days already covered.'
            : `Queued ${fmt(queued)} grouped-daily jobs.`),
      )
      setGroupedHistoryOk(true)
      if (res.job_ids?.[0]) refJobs.trackStockOhlcSyncJob({ job_id: res.job_ids[0] })
      else refJobs.openJobsSheet()
    } catch (e) {
      setGroupedHistoryMsg(e instanceof Error ? e.message : 'Backfill failed')
      setGroupedHistoryOk(false)
    } finally {
      setGroupedHistoryBusy(false)
    }
  }, [refJobs])

  const runFinBackfillAll = useCallback(
    async (kind: FinDrawerKind) => {
      const post = finBackfillPoster(kind)
      setFinAllBusy(true)
      setFinAllMsg(null)
      setFinAllOk(null)
      try {
        const res = await post()
        if (!res.ok) {
          setFinAllMsg(res.error ?? 'Backfill failed')
          setFinAllOk(false)
          return
        }
        setFinAllMsg(res.message ?? `Dispatched backfill for ${fmt(res.gap_count)} gap symbols.`)
        setFinAllOk(true)
        if (res.job_ids?.length) {
          const jobKind: TrackedMassiveDbJobKind =
            kind === 'income'
              ? 'feed_stocks_income_statements'
              : kind === 'balance'
                ? 'feed_stocks_balance_sheets'
                : kind === 'cash'
                  ? 'feed_stocks_cash_flows'
                  : kind === 'ratios'
                    ? 'feed_stocks_ratios'
                    : kind === 'sint'
                      ? 'feed_stocks_short_interest'
                      : 'feed_stocks_short_volume'
          res.job_ids.forEach(jid => refJobs.trackMassiveDbJob({ job_id: jid, kind: jobKind }))
        }
        void refetchSummary()
      } catch (e) {
        setFinAllMsg(e instanceof Error ? e.message : 'Backfill failed')
        setFinAllOk(false)
      } finally {
        setFinAllBusy(false)
      }
    },
    [refJobs, refetchSummary],
  )

  const handleToggleVoid = useCallback(
    async (kind: FinDrawerKind) => {
      const dataType = gapAckTypeForFinKind(kind)
      if (voidAckBusy) return
      const gapCount =
        kind === 'income'
          ? summary?.income_statements_gap_count ?? 0
          : kind === 'balance'
            ? summary?.balance_sheets_gap_count ?? 0
            : kind === 'cash'
              ? summary?.cash_flows_gap_count ?? 0
              : kind === 'ratios'
                ? summary?.ratios_gap_count ?? 0
                : kind === 'sint'
                  ? summary?.short_interest_gap_count ?? 0
                  : summary?.short_volume_gap_count ?? 0
      const isVoid =
        kind === 'income'
          ? summary?.income_statements_source_void
          : kind === 'balance'
            ? summary?.balance_sheets_source_void
            : kind === 'cash'
              ? summary?.cash_flows_source_void
              : kind === 'ratios'
                ? summary?.ratios_source_void
                : kind === 'sint'
                  ? summary?.short_interest_source_void
                  : summary?.short_volume_source_void

      setVoidAckBusy(dataType)
      try {
        await postSepaGapAck(dataType, !isVoid, gapCount ?? 0)
        void refetchSummary()
      } finally {
        setVoidAckBusy(null)
      }
    },
    [summary, voidAckBusy, refetchSummary],
  )

  const runEvaluatePublish = useCallback(async () => {
    setEvalPublishBusy(true)
    setEvalPublishPhase('backfill')
    setFundBackfillMsg(null)
    setFundBackfillOk(null)
    setSnapshotMsg(null)
    setSnapshotOk(null)
    try {
      const fundRes = await postSepaFundamentalsBackfill({
        max_workers: 4,
        rate_limit_rps: 4,
        only_missing: false,
      })
      if (!fundRes.ok) {
        setFundBackfillMsg(fundRes.error ?? 'Fundamentals backfill failed')
        setFundBackfillOk(false)
        return
      }
      setFundBackfillMsg(fundRes.message ?? `Phase4 job for ${fmt(fundRes.gap_count)} symbols.`)
      setFundBackfillOk(true)
      try {
        const techRes = await postSepaTechnicalBackfill({ only_missing: false })
        if (techRes.ok && techRes.message) {
          setFundBackfillMsg(prev => (prev ? `${prev} · ${techRes.message}` : techRes.message ?? null))
        }
      } catch {
        // non-fatal
      }
      setEvalPublishPhase('snapshot')
      const snapRes = await postSepaReadinessSnapshot()
      if (!snapRes.ok) {
        setSnapshotMsg(snapRes.error ?? 'Snapshot failed')
        setSnapshotOk(false)
        return
      }
      setSnapshotMsg(`rows_affected=${fmt(snapRes.rows_affected)} elapsed=${fmt(snapRes.elapsed_ms)}ms`)
      setSnapshotOk(true)
      await refetchSummary()
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.stockDataReadiness.criteriaStats })
    } catch (e) {
      setSnapshotMsg(e instanceof Error ? e.message : 'Evaluate & publish failed')
      setSnapshotOk(false)
    } finally {
      setEvalPublishBusy(false)
      setEvalPublishPhase('idle')
    }
  }, [refetchSummary, queryClient])

  const runFixGaps = useCallback(async () => {
    setFixGapsBusy(true)
    setFixGapsMsg(null)
    setFixGapsOk(null)
    try {
      const backfill = await postSepaPriceGapBackfill()
      if (!backfill.ok) {
        setFixGapsMsg(backfill.error ?? 'Backfill failed')
        setFixGapsOk(false)
        return
      }
      if ((backfill.gap_count ?? 0) === 0) {
        const snap = await postSepaReadinessSnapshot()
        setFixGapsMsg(
          snap.ok
            ? `No gaps found. Snapshot refreshed: ${fmt(snap.rows_affected)} rows.`
            : snap.error ?? 'Snapshot refresh failed',
        )
        setFixGapsOk(snap.ok)
        void refetchSummary()
        return
      }
      setFixGapsMsg(
        `Dispatched ${fmt(backfill.chunks)} tasks for ${fmt(backfill.gap_count)} symbols.`,
      )
      setFixGapsOk(true)
      if (backfill.job_ids?.[0]) refJobs.trackStockOhlcSyncJob({ job_id: backfill.job_ids[0] })
    } catch (e) {
      setFixGapsMsg(e instanceof Error ? e.message : 'Fix gaps failed')
      setFixGapsOk(false)
    } finally {
      setFixGapsBusy(false)
    }
  }, [refJobs, refetchSummary])

  const universeBusy = refJobs.jobBusyKind === 'feed_stocks_tickers_reference_universe'

  return (
    <PageShell className="space-y-5 max-w-[100rem]">
      <PageHeader
        breadcrumb={
          <p className="text-xs text-sky-400/90 font-medium">Research / Stock Data Readiness</p>
        }
        title="Stock Data Readiness"
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              Validate PostgreSQL ticker universe and stock_day coverage before full-market SEPA Phase4 runs.
            </TooltipContent>
          </Tooltip>
        }
      />

      {summaryLoading && !summary && (
        <div className="space-y-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {summaryQueryError && (
        <QueryErrorAlert error={summaryQueryError} onRetry={() => void refetchSummary()} />
      )}

      <RunBookSection
        stages={derived.runbookStages}
        activeRunStep={activeRunStep}
        onSelectStep={setActiveRunStep}
        summaryLoading={summaryLoading}
        onCheckCoverage={() => void handleCheckCoverage()}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-3 min-w-0">
          <StepDetailPanel
            activeStep={activeRunStep}
            summary={summary ?? null}
            derived={derived}
            refJobs={refJobs}
            universeBusy={universeBusy}
            holidaysSyncBusy={holidaysSyncBusy}
            holidaysSyncMsg={holidaysSyncMsg}
            holidaysSyncOk={holidaysSyncOk}
            universeErr={universeErr}
            unifiedSnapBusy={unifiedSnapBusy}
            unifiedSnapMsg={unifiedSnapMsg}
            unifiedSnapOk={unifiedSnapOk}
            groupedHistoryBusy={groupedHistoryBusy}
            groupedHistoryMsg={groupedHistoryMsg}
            groupedHistoryOk={groupedHistoryOk}
            evalPublishBusy={evalPublishBusy}
            evalPublishPhase={evalPublishPhase}
            fundBackfillMsg={fundBackfillMsg}
            fundBackfillOk={fundBackfillOk}
            snapshotMsg={snapshotMsg}
            snapshotOk={snapshotOk}
            finAllBusy={finAllBusy}
            finAllMsg={finAllMsg}
            finAllOk={finAllOk}
            voidAckBusy={voidAckBusy}
            onSyncUniverse={() => void runUniverseEnqueue()}
            onHolidaysOnly={() => void runHolidaysSync()}
            onUnifiedSnapshot={() => void runUnifiedSnapshot()}
            onGroupedHistory={() => void runGroupedHistory()}
            onOpenPriceGaps={() => setPriceGapsOpen(true)}
            onFinBackfillAll={kind => void runFinBackfillAll(kind)}
            onOpenFinGaps={kind => setFinGapsKind(kind)}
            onToggleVoid={kind => void handleToggleVoid(kind)}
            onEvaluatePublish={() => void runEvaluatePublish()}
            checkedSteps={checkedSteps}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" disabled={summaryLoading} onClick={() => void handleCheckCoverage()}>
              <RefreshCw className={cnIcon(summaryLoading)} />
              {summaryLoading ? 'Reloading…' : '↻ Reload all'}
            </Button>
            {refJobs.refJobItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => refJobs.openJobsSheet()}>
                View Jobs
                {refJobs.activeJobCount > 0 && ` (${refJobs.activeJobCount})`}
              </Button>
            )}
          </div>
        </div>

        <CheckResultsPanel
          runbookStages={derived.runbookStages}
          checkedSteps={checkedSteps}
          collapsedStages={collapsedResultStages}
          summaryLoading={summaryLoading}
          summary={summary ?? null}
          summaryLoadedAt={summaryLoadedAt}
          derived={derived}
          onToggleStage={(id: RunbookStageId) =>
            setCollapsedResultStages(prev => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          onExpandAll={() => setCollapsedResultStages(new Set())}
          onCollapseAll={() => setCollapsedResultStages(new Set(RUNBOOK_STAGE_LAYOUT.map(s => s.id)))}
          onResetChecks={() => setCheckedSteps(new Set())}
        />
      </div>

      <ReadinessStatusSection
        summary={summary ?? null}
        reviewStepStatus={derived.reviewStepStatus}
        notesCount={derived.notesCount}
        criteriaLoading={criteriaLoading}
        criteriaStats={criteriaStats ?? null}
        fixGapsBusy={fixGapsBusy}
        fixGapsMsg={fixGapsMsg}
        fixGapsOk={fixGapsOk}
        onRefreshCriteria={() => void refetchCriteria()}
        onFixGaps={() => void runFixGaps()}
        onOpenJobs={() => refJobs.openJobsSheet()}
      />

      <Tabs value={activeInfoTab} onValueChange={v => setActiveInfoTab(v as typeof activeInfoTab)}>
        <TabsList className="h-9">
          <TabsTrigger value="metrics">Readiness Metrics</TabsTrigger>
          <TabsTrigger value="checklist">Screening Checklist</TabsTrigger>
          <TabsTrigger value="database">Database (Raw / Computed)</TabsTrigger>
          <TabsTrigger value="reference" disabled>
            Reference
          </TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="mt-4 space-y-4">
          <ReadinessMetricsStrip summary={summary ?? null} vendorFillGap={derived.vendorFillGap} />
          {criteriaStats && <CriteriaOverviewPanel stats={criteriaStats} />}
        </TabsContent>
        <TabsContent value="checklist" className="mt-4">
          {criteriaStats ? (
            <CriteriaOverviewPanel stats={criteriaStats} detailed />
          ) : (
            <p className="text-sm text-muted-foreground">
              Run Step 10 and Refresh Criteria to populate screening checklist stats.
            </p>
          )}
        </TabsContent>
        <TabsContent value="database" className="mt-4">
          <DataCatalogPanel catalog={summary?.data_catalog ?? null} loading={summaryLoading} />
        </TabsContent>
      </Tabs>

      <PriceGapsSheet open={priceGapsOpen} onOpenChange={setPriceGapsOpen} />
      <FinGapsSheet
        kind={finGapsKind}
        open={finGapsKind != null}
        onOpenChange={open => { if (!open) setFinGapsKind(null) }}
      />
    </PageShell>
  )
}

function cnIcon(spin: boolean) {
  return spin ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'
}

export default function StockDataReadinessPage() {
  return (
    <MassiveRefJobProvider>
      <PageInner />
    </MassiveRefJobProvider>
  )
}
