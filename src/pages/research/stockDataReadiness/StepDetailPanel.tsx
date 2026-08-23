import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SnapshotByTypeBreakdown } from './SnapshotByTypeBreakdown'
import {
  ReadinessCode,
  ReadinessGhostLink,
  ReadinessGapsButton,
  ReadinessMaintenanceBox,
  ReadinessOperationLog,
  ReadinessPrimaryButton,
  ReadinessSecondaryButton,
  ReadinessStepDesc,
  ReadinessStepLabel,
} from './ReadinessStepPrimitives'
import { FIN_STMT_GAP_INSTRUMENT_CODES } from '@/constants/stockDataReadiness'
import { gapAckTypeForFinKind } from '@/api/research/stockDataReadiness'
import type { FinDrawerKind, SepaReadinessSummaryResponse, SepaRunStep } from '@/types/stockDataReadiness'
import type { RunbookDerivedState } from '@/utils/stockDataReadiness/runbook'
import { fmt } from '@/utils/stockDataReadiness/format'
import type { MassiveRefJobSessionApi } from './refJobSessionStub'

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-dense-meta font-mono text-sky-300/90">{children}</code>
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

interface Props {
  activeStep: SepaRunStep
  summary: SepaReadinessSummaryResponse | null
  derived: RunbookDerivedState
  refJobs: MassiveRefJobSessionApi
  universeBusy: boolean
  universeErr: string | null
  unifiedSnapBusy: boolean
  unifiedSnapMsg: string | null
  unifiedSnapOk: boolean | null
  groupedHistoryBusy: boolean
  groupedHistoryMsg: string | null
  groupedHistoryOk: boolean | null
  finAllBusy: boolean
  finAllMsg: string | null
  finAllOk: boolean | null
  voidAckBusy: string | null
  onSyncUniverse: () => void
  onUnifiedSnapshot: () => void
  onGroupedHistory: () => void
  onOpenPriceGaps: () => void
  onFinBackfillAll: (kind: FinDrawerKind) => void
  onOpenFinGaps: (kind: FinDrawerKind) => void
  onToggleVoid: (kind: FinDrawerKind) => void
  checkedSteps: Set<number>
}

export function StepDetailPanel(props: Props) {
  const {
    activeStep,
    summary,
    derived,
    refJobs,
    universeBusy,
    universeErr,
    unifiedSnapBusy,
    unifiedSnapMsg,
    unifiedSnapOk,
    groupedHistoryBusy,
    groupedHistoryMsg,
    groupedHistoryOk,
    finAllBusy,
    finAllMsg,
    finAllOk,
    voidAckBusy,
    onSyncUniverse,
    onUnifiedSnapshot,
    onGroupedHistory,
    onOpenPriceGaps,
    onFinBackfillAll,
    onOpenFinGaps,
    onToggleVoid,
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
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Sync All Tickers into <Code>market.ticker</Code> (Plugin). Holidays are Plugin-owned.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="text-dense-micro bg-violet-500/20 text-violet-300 border-violet-500/30">TICKERS</Badge>
                <Code>market.ticker</Code>
              </div>
              <p className="text-xs text-muted-foreground">
                Reference universe from Plugin ingest <Code>ticker_sync</Code> (Polygon REST{' '}
                <Code>/v3/reference/tickers</Code> → Golden Source). Massive Celery queues stay at 0 replicas.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="text-dense-micro bg-amber-500/20 text-amber-300 border-amber-500/30">HOLIDAYS</Badge>
                <Code>market.us_market_holiday</Code>
              </div>
              <p className="text-xs text-muted-foreground">
                US Market Holidays: maintained by Market Data Plugin (Polygon{' '}
                <Code>/v1/marketstatus/upcoming</Code>). No manual Trade sync.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={anyJobBusy} onClick={onSyncUniverse}>
              {universeBusy ? 'Enqueueing tickers…' : 'Sync tickers'}
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
              <Link to="/operations/celery">Ops Celery (Massive scaled to 0)</Link>
            </Button>
          </div>
          <Feedback ok={false}>{universeErr}</Feedback>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-3">
          <ReadinessStepLabel>
            Snapshot coverage from <ReadinessCode>market.stock_snapshot</ReadinessCode> (Plugin{' '}
            <ReadinessCode>GET /v3/snapshot</ReadinessCode>, stocks)
          </ReadinessStepLabel>
          <ReadinessStepDesc>
            Plugin CronJob writes <ReadinessCode>market.stock_snapshot</ReadinessCode> daily for all{' '}
            <ReadinessCode>v_us_equity_universe</ReadinessCode> symbols. Coverage is served via{' '}
            <ReadinessCode>/market/readiness/snapshot-coverage</ReadinessCode>. The readiness check validates
            instrument-type breakdown against the universe.
          </ReadinessStepDesc>
          <ReadinessPrimaryButton
            disabled={unifiedSnapBusy || anyJobBusy}
            onClick={onUnifiedSnapshot}
          >
            {unifiedSnapBusy ? 'Refreshing…' : 'Refresh unified snapshots'}
          </ReadinessPrimaryButton>
          <ReadinessOperationLog ok={unifiedSnapOk}>{unifiedSnapMsg}</ReadinessOperationLog>
          <SnapshotByTypeBreakdown rows={summary?.stock_unified_snapshot_by_type ?? null} />
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-3">
          <ReadinessStepLabel>
            Backfill <ReadinessCode>public.stock_day</ReadinessCode> bars
          </ReadinessStepLabel>
          <ReadinessMaintenanceBox
            title="Daily maintenance strategy"
            rows={[
              {
                badge: 'AUTO',
                variant: 'auto',
                text: (
                  <>
                    Beat task <ReadinessCode>massive-sepa-universe-grouped-daily</ReadinessCode> runs nightly at 22:00
                    UTC — one <strong>Grouped Daily Bars</strong> API call covers all 5,000+ US stocks for today&apos;s
                    date (vs. 5,000+ calls for per-symbol approach).
                  </>
                ),
              },
              {
                badge: 'MANUAL',
                variant: 'manual',
                text: (
                  <>
                    <em>Backfill 420d History</em> below queues one job per missing trading date. Each job = 1 API call
                    → OHLCV for all US stocks on that date. Efficient initial setup: ~420 API calls total.
                  </>
                ),
              },
            ]}
          />
          <ReadinessStepDesc>
            Plugin ingest <ReadinessCode>stock_daily_grouped</ReadinessCode> writes{' '}
            <ReadinessCode>source=massive</ReadinessCode> rows. The readiness gap count uses{' '}
            <ReadinessCode>market.stock_snapshot.session_date</ReadinessCode> vs{' '}
            <ReadinessCode>max(stock_daily.bar_time)</ReadinessCode> via Plugin{' '}
            <ReadinessCode>/market/readiness/vendor-gap</ReadinessCode>; symbols without a snapshot row are never
            gaps. After a calendar gap, the latest daily <ReadinessCode>stock_daily.close</ReadinessCode> must differ
            from <ReadinessCode>close</ReadinessCode> (beyond a tiny absolute tolerance) to count as a vendor gap
            — matching closes mean the vendor snapshot already aligns with the last ingested bar.{' '}
            <ReadinessCode>tickers.instrument_type = WARRANT</ReadinessCode> symbols are excluded.
          </ReadinessStepDesc>
          <div className="flex flex-wrap items-center gap-2">
            <ReadinessPrimaryButton disabled={groupedHistoryBusy} onClick={onGroupedHistory}>
              {groupedHistoryBusy ? 'Queuing jobs…' : 'Backfill 420d History (Grouped Daily)'}
            </ReadinessPrimaryButton>
            <ReadinessSecondaryButton onClick={() => refJobs.openJobsSheet()}>
              Jobs
            </ReadinessSecondaryButton>
            <ReadinessGapsButton
              tone={
                derived.barStepStatus === 'ok'
                  ? 'ok'
                  : derived.priceGap != null && derived.priceGap > 0
                    ? 'warn'
                    : 'default'
              }
              disabled={derived.barStepStatus === 'ok' || !checkedSteps.has(3)}
              onClick={onOpenPriceGaps}
            >
              {derived.barStepStatus === 'ok'
                ? '✓ All price_ready'
                : derived.priceGap != null && derived.priceGap > 0
                  ? `Gaps (${fmt(derived.priceGap)}) →`
                  : 'View gaps →'}
            </ReadinessGapsButton>
            <ReadinessGhostLink to="/settings/coverage/stock-ib">Open Stock IB Coverage →</ReadinessGhostLink>
          </div>
          <ReadinessOperationLog ok={groupedHistoryOk}>{groupedHistoryMsg}</ReadinessOperationLog>
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
          <div className="text-sm font-medium">SEPA evaluation (dbt analytics)</div>
          <div className="rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
            Fundamental and technical conditions are materialized by the{' '}
            <Code>dbt analytics pipeline</Code> (daily CronJob after market close) into{' '}
            <Code>dw_stock.mart_sepa_*</Code>. Manual snapshot / backfill endpoints are retired.
          </div>
          <ReadinessMaintenanceBox
            title="Conditions evaluated"
            rows={[
              {
                badge: 'AUTO',
                variant: 'auto',
                text: 'dbt CronJob refreshes mart_sepa_fundamental_eval, mart_sepa_technical_eval, and screener_wide — no manual Step 10 action required',
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
