import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { FIN_STMT_GAP_INSTRUMENT_CODES } from '@/constants/stockDataReadiness'
import { gapAckTypeForFinKind } from '@/api/research/stockDataReadiness'
import type { FinDrawerKind, SepaReadinessSummaryResponse, SepaRunStep } from '@/types/stockDataReadiness'
import type { RunbookDerivedState } from '@/utils/stockDataReadiness/runbook'
import { fmt } from '@/utils/stockDataReadiness/format'
import type { MassiveRefJobSessionApi } from '@/components/massive/massiveRefJobContext'

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-[11px] font-mono text-sky-300/90">{children}</code>
}

function Feedback({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div
      className={cn(
        'text-xs rounded-md px-3 py-2 border',
        ok === true && 'border-lamp-green/40 bg-success-soft/30 text-foreground',
        ok === false && 'border-destructive/40 bg-danger-soft/30 text-destructive',
        ok == null && 'border-border text-muted-foreground',
      )}
    >
      {children}
    </div>
  )
}

function MaintenanceBox({ title, rows }: { title: string; rows: { badge: string; badgeVariant: 'auto' | 'manual'; text: React.ReactNode }[] }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
      <div className="font-semibold text-foreground">{title}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] h-4 px-1 shrink-0',
              row.badgeVariant === 'auto' ? 'border-sky-500/50 text-sky-400' : 'border-amber-500/50 text-amber-400',
            )}
          >
            {row.badge}
          </Badge>
          <span className="text-muted-foreground leading-relaxed">{row.text}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  activeStep: SepaRunStep
  summary: SepaReadinessSummaryResponse | null
  derived: RunbookDerivedState
  refJobs: MassiveRefJobSessionApi
  universeBusy: boolean
  holidaysSyncBusy: boolean
  holidaysSyncMsg: string | null
  holidaysSyncOk: boolean | null
  universeErr: string | null
  unifiedSnapBusy: boolean
  unifiedSnapMsg: string | null
  unifiedSnapOk: boolean | null
  groupedHistoryBusy: boolean
  groupedHistoryMsg: string | null
  groupedHistoryOk: boolean | null
  evalPublishBusy: boolean
  evalPublishPhase: 'idle' | 'backfill' | 'snapshot'
  fundBackfillMsg: string | null
  fundBackfillOk: boolean | null
  snapshotMsg: string | null
  snapshotOk: boolean | null
  finAllBusy: boolean
  finAllMsg: string | null
  finAllOk: boolean | null
  voidAckBusy: string | null
  onSyncUniverse: () => void
  onHolidaysOnly: () => void
  onUnifiedSnapshot: () => void
  onGroupedHistory: () => void
  onOpenPriceGaps: () => void
  onFinBackfillAll: (kind: FinDrawerKind) => void
  onOpenFinGaps: (kind: FinDrawerKind) => void
  onToggleVoid: (kind: FinDrawerKind) => void
  onEvaluatePublish: () => void
  checkedSteps: Set<number>
}

export function StepDetailPanel(props: Props) {
  const {
    activeStep,
    summary,
    derived,
    refJobs,
    universeBusy,
    holidaysSyncBusy,
    holidaysSyncMsg,
    holidaysSyncOk,
    universeErr,
    unifiedSnapBusy,
    unifiedSnapMsg,
    unifiedSnapOk,
    groupedHistoryBusy,
    groupedHistoryMsg,
    groupedHistoryOk,
    evalPublishBusy,
    evalPublishPhase,
    fundBackfillMsg,
    fundBackfillOk,
    snapshotMsg,
    snapshotOk,
    finAllBusy,
    finAllMsg,
    finAllOk,
    voidAckBusy,
    onSyncUniverse,
    onHolidaysOnly,
    onUnifiedSnapshot,
    onGroupedHistory,
    onOpenPriceGaps,
    onFinBackfillAll,
    onOpenFinGaps,
    onToggleVoid,
    onEvaluatePublish,
    checkedSteps,
  } = props

  const anyJobBusy = refJobs.jobBusyKind != null
  const activeJobs = refJobs.activeJobCount

  const finStep = (kind: FinDrawerKind, table: string, gap: number | null | undefined, status: typeof derived.incomeFinStatus, voidFlag: boolean | undefined, actionable: number | null | undefined) => (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        Ingest <Code>{table}</Code>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Massive REST → PostgreSQL. Gap scope: instrument types with Supported or Partial coverage (
        <Code>{FIN_STMT_GAP_INSTRUMENT_CODES.join(', ')}</Code>).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={finAllBusy} onClick={() => onFinBackfillAll(kind)}>
          {finAllBusy ? 'Enqueueing…' : 'Backfill all gaps'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => refJobs.openJobsSheet()}>
          Jobs
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={status === 'ok' || (status === 'void' && (actionable ?? 0) === 0) || !checkedSteps.has(
            kind === 'income' ? 4 : kind === 'balance' ? 5 : kind === 'cash' ? 6 : kind === 'ratios' ? 7 : kind === 'sint' ? 8 : 9,
          )}
          onClick={() => onOpenFinGaps(kind)}
        >
          {status === 'ok' ? '✓ No gaps' : gap != null && gap > 0 ? `Gaps (${fmt(gap)}) →` : 'View gaps →'}
        </Button>
        <Button
          size="sm"
          variant={voidFlag ? 'secondary' : 'ghost'}
          disabled={voidAckBusy === gapAckTypeForFinKind(kind)}
          onClick={() => onToggleVoid(kind)}
        >
          {voidFlag ? 'Unmark N/A' : 'Source N/A'}
        </Button>
      </div>
      {finAllMsg && <Feedback ok={finAllOk}>{finAllMsg}</Feedback>}
    </div>
  )

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4 min-h-[200px]">
      {activeStep === 1 && (
        <div className="space-y-4">
          <div className="text-sm font-medium">
            Sync All Tickers + Market Holidays into <Code>public.tickers</Code> &amp;{' '}
            <Code>public.reference_us_holidays</Code>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/30">TICKERS</Badge>
                <Code>public.tickers</Code>
              </div>
              <p className="text-xs text-muted-foreground">
                Reference universe from Massive REST <Code>/v3/reference/tickers</Code>. Celery queue{' '}
                <Code>stocks_massive</Code>.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/30">HOLIDAYS</Badge>
                <Code>public.reference_us_holidays</Code>
              </div>
              <p className="text-xs text-muted-foreground">
                Seeds NYSE/NASDAQ federal closures 2020-2027, then pulls{' '}
                <Code>/v1/marketstatus/upcoming</Code> for early-close timing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={anyJobBusy || holidaysSyncBusy} onClick={onSyncUniverse}>
              {universeBusy ? 'Enqueueing tickers…' : holidaysSyncBusy ? 'Syncing both…' : 'Sync tickers + holidays'}
            </Button>
            <Button variant="outline" disabled={holidaysSyncBusy} onClick={onHolidaysOnly}>
              {holidaysSyncBusy ? 'Syncing…' : 'Holidays only'}
            </Button>
            {activeJobs > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeJobs} active
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refJobs.openJobsSheet()}>
              Jobs
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/operations/celery">Celery settings</Link>
            </Button>
          </div>
          <Feedback ok={holidaysSyncOk}>{holidaysSyncMsg}</Feedback>
          <Feedback ok={false}>{universeErr}</Feedback>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Refresh <Code>public.cache_stock_snapshot</Code> (Massive <Code>GET /v3/snapshot</Code>, stocks)
          </div>
          <p className="text-xs text-muted-foreground">
            Batches <Code>v_us_equity_universe</Code> via <Code>ticker.any_of</Code> (≤250 per request).
          </p>
          <Button disabled={unifiedSnapBusy || anyJobBusy} onClick={onUnifiedSnapshot}>
            {unifiedSnapBusy ? 'Refreshing…' : 'Refresh unified snapshots'}
          </Button>
          <Feedback ok={unifiedSnapOk}>{unifiedSnapMsg}</Feedback>
          {(summary?.stock_unified_snapshot_by_type?.length ?? 0) > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Snapshot rows</TableHead>
                    <TableHead className="text-right">Universe tickers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary!.stock_unified_snapshot_by_type!.map(r => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="text-xs">{r.description ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(r.snapshot_row_count)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {fmt(r.universe_ticker_count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Backfill <Code>public.stock_day</Code> bars</div>
          <MaintenanceBox
            title="Daily maintenance strategy"
            rows={[
              {
                badge: 'AUTO',
                badgeVariant: 'auto',
                text: (
                  <>
                    Beat task <Code>massive-sepa-universe-grouped-daily</Code> runs nightly at 22:00 UTC — one Grouped
                    Daily Bars call covers all US stocks.
                  </>
                ),
              },
              {
                badge: 'MANUAL',
                badgeVariant: 'manual',
                text: (
                  <>
                    <em>Backfill 420d History</em> queues one job per missing trading date (~420 API calls total).
                  </>
                ),
              },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={groupedHistoryBusy} onClick={onGroupedHistory}>
              {groupedHistoryBusy ? 'Queuing jobs…' : 'Backfill 420d History (Grouped Daily)'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refJobs.openJobsSheet()}>
              Jobs
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={derived.barStepStatus === 'ok' || !checkedSteps.has(3)}
              onClick={onOpenPriceGaps}
            >
              {derived.barStepStatus === 'ok'
                ? '✓ All price_ready'
                : derived.priceGap != null && derived.priceGap > 0
                  ? `Gaps (${fmt(derived.priceGap)}) →`
                  : 'View gaps →'}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings/feed/massive-stock">Open Feed Massive Stock →</Link>
            </Button>
          </div>
          <Feedback ok={groupedHistoryOk}>{groupedHistoryMsg}</Feedback>
        </div>
      )}

      {activeStep === 4 && finStep('income', 'stock_income_statements', derived.incomeGap, derived.incomeFinStatus, summary?.income_statements_source_void, derived.incomeActionable)}
      {activeStep === 5 && finStep('balance', 'stock_balance_sheets', derived.balanceGap, derived.balanceFinStatus, summary?.balance_sheets_source_void, derived.balanceActionable)}
      {activeStep === 6 && finStep('cash', 'stock_cash_flows', derived.cashGap, derived.cashFinStatus, summary?.cash_flows_source_void, derived.cashActionable)}
      {activeStep === 7 && finStep('ratios', 'stock_ratios', derived.ratiosGap, derived.ratiosFinStatus, summary?.ratios_source_void, derived.ratiosActionable)}
      {activeStep === 8 && finStep('sint', 'stock_short_interest', derived.shortIntGap, derived.shortIntFinStatus, summary?.short_interest_source_void, derived.shortIntActionable)}
      {activeStep === 9 && finStep('svol', 'stock_short_volume', derived.shortVolGap, derived.shortVolFinStatus, summary?.short_volume_source_void, derived.shortVolActionable)}

      {activeStep === 10 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Evaluate fundamentals &amp; refresh readiness snapshot</div>
          <p className="text-xs text-muted-foreground">
            Phase 1 evaluates SEPA conditions → <Code>stock_readiness_daily</Code>. Phase 2 materializes the full
            snapshot while preserving fundamental results.
          </p>
          <MaintenanceBox
            title="Conditions evaluated (Phase 1)"
            rows={[
              { badge: 'Q2Q', badgeVariant: 'auto', text: 'EPS/Revenue growth ≥25%, acceleration 2Q' },
              { badge: '3Y/FY', badgeVariant: 'manual', text: 'EPS/Revenue CAGR 3Y ≥15%, last FY acceleration' },
            ]}
          />
          <Button
            disabled={evalPublishBusy || derived.universeCount === 0}
            onClick={onEvaluatePublish}
          >
            {evalPublishBusy
              ? evalPublishPhase === 'backfill'
                ? '(1/2) Evaluating fundamentals…'
                : '(2/2) Refreshing snapshot…'
              : 'Evaluate & Refresh Snapshot'}
          </Button>
          {fundBackfillMsg && (
            <Feedback ok={fundBackfillOk}>
              <span className="text-muted-foreground">Phase 1: </span>
              {fundBackfillMsg}
            </Feedback>
          )}
          {snapshotMsg && (
            <Feedback ok={snapshotOk}>
              <span className="text-muted-foreground">Phase 2: </span>
              {snapshotMsg}
            </Feedback>
          )}
        </div>
      )}
    </div>
  )
}
