/**
 * Backtest run result card (Wave RS-C4).
 *
 * Renders the result of `POST /research/backtest/event-query`:
 * - Summary tiles: n_events / win_rate / avg_pnl / sharpe_annual / max_drawdown
 * - Per-event table (date, symbol, entry/exit, pnl, MFE, MAE)
 * - Walk-forward strip (if included) — one row per OOS window
 * - Benchmark strip (SPY buy-hold + zero-signal control)
 *
 * All colors use site-wide tokens (`text-profit` / `text-loss` /
 * `pnlColorClass()`).
 */
import { Beaker, GitCommit, Info, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableCellPadding,
  denseTableNumCell,
  EmptyState,
} from '@/components/data-display'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtNumLocale, fmtPctFromFraction } from '@/lib/format'
import type {
  BacktestRunRow,
  EventQueryResponse,
  EventRun,
} from '@/api/research/backtestEvent'

function fmtDollar(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}$${Math.abs(v).toFixed(digits)}`
}

interface WalkForwardWindow {
  window_index: number
  oos_start: string
  oos_end: string
  in_sample_return: number
  oos_return: number
  oos_sharpe: number
  n_oos_days: number
}

interface WalkForwardPayload {
  windows: WalkForwardWindow[]
  aggregate?: {
    n_windows: number
    avg_oos_return: number
    avg_oos_sharpe: number
    positive_windows_pct: number
  } | null
}

interface BenchmarkPayload {
  spy_buy_hold?: {
    total_return: number
    annualized_return: number
    sharpe_annual: number
    max_drawdown: number
    n_days: number
    start_price: number
    end_price: number
  }
  zero_signal_control?: WalkForwardWindow[]
}

interface BacktestRunResultCardProps {
  response: EventQueryResponse
}

export function BacktestRunResultCard({ response }: BacktestRunResultCardProps) {
  const summary = response.summary
  const runs: EventRun[] = response.runs ?? []
  const walkForward = response.walk_forward as WalkForwardPayload | null
  const benchmark = response.benchmark as BenchmarkPayload | null
  const persisted = Boolean(response.run_id)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Beaker className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-dense-body font-semibold">Run result</h3>
        {response.run_id && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-dense-caption text-muted-foreground">
            {response.run_id}
          </span>
        )}
        {response.event_source && (
          <span className="text-dense-caption text-muted-foreground">
            source: <code className="rounded bg-muted px-1 py-0.5">{response.event_source}</code>
          </span>
        )}
      </div>

      {response.event_source_notes && (
        <Alert>
          <AlertDescription className="text-dense-meta">
            <Info className="mr-1 inline h-3.5 w-3.5" />
            {response.event_source_notes}
          </AlertDescription>
        </Alert>
      )}

      {!persisted && (response as EventQueryResponse & { run?: BacktestRunRow }).run?.error && (
        <Alert variant="destructive">
          <AlertDescription className="text-dense-meta">
            Run not persisted:{' '}
            {(response as EventQueryResponse & { run?: BacktestRunRow }).run?.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <SummaryTile label="Events" value={fmtNumLocale(summary.n_events, 0)} />
        <SummaryTile
          label="Win rate"
          value={fmtPctFromFraction(summary.win_rate)}
          tone={
            summary.win_rate > 0.55
              ? 'profit'
              : summary.win_rate < 0.45
                ? 'loss'
                : 'muted'
          }
        />
        <SummaryTile
          label="Avg P&L"
          value={fmtDollar(summary.avg_pnl)}
          tone={summary.avg_pnl > 0 ? 'profit' : summary.avg_pnl < 0 ? 'loss' : 'muted'}
        />
        <SummaryTile
          label="Median P&L"
          value={fmtDollar(summary.median_pnl)}
          tone={
            summary.median_pnl > 0 ? 'profit' : summary.median_pnl < 0 ? 'loss' : 'muted'
          }
        />
        <SummaryTile
          label="Sharpe (annual)"
          value={fmtNumLocale(summary.sharpe_annual)}
          tone={
            summary.sharpe_annual > 0.5
              ? 'profit'
              : summary.sharpe_annual < 0
                ? 'loss'
                : 'muted'
          }
        />
        <SummaryTile
          label="Max drawdown"
          value={fmtDollar(-Math.abs(summary.max_drawdown))}
          tone={summary.max_drawdown > 0 ? 'loss' : 'muted'}
        />
      </div>

      {response.skipped_events > 0 && (
        <p className="text-dense-caption text-muted-foreground">
          {response.skipped_events} event(s) skipped due to missing option or stock data.
        </p>
      )}

      {runs.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="px-3 py-6">
            <EmptyState
              icon={<Beaker />}
              title="No event trades produced"
              description={
                summary.n_events === 0
                  ? 'No events matched the criteria over the selected lookback window. Widen the window or relax parameters.'
                  : 'Events matched but none produced tradeable legs (missing option chain or stock data).'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            Per-event trades ({runs.length})
          </div>
          <DenseDataTable scrollX>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className={denseTableCellPadding}>Event date</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Symbol</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Entry</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>Exit</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>P&L</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>MFE</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>MAE</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {runs.map((r, idx) => (
                <DenseTableRow key={`${r.symbol}-${r.event_date}-${idx}`}>
                  <DenseTableCell className={denseTableCellPadding}>{r.event_date}</DenseTableCell>
                  <DenseTableCell className={`${denseTableCellPadding} font-mono`}>
                    {r.symbol}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{r.entry_ts}</DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{r.exit_ts}</DenseTableCell>
                  <DenseTableCell className={`${denseTableNumCell} ${pnlColorClass(r.pnl)}`}>
                    {fmtDollar(r.pnl)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${
                      r.mfe > 0 ? 'text-profit' : 'text-muted-foreground'
                    }`}
                  >
                    {fmtDollar(r.mfe)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${
                      r.mae < 0 ? 'text-loss' : 'text-muted-foreground'
                    }`}
                  >
                    {fmtDollar(r.mae)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        </div>
      )}

      {walkForward && walkForward.windows.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Walk-forward ({walkForward.windows.length} OOS windows)
          </div>
          {walkForward.aggregate && (
            <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryTile
                label="Windows"
                value={fmtNumLocale(walkForward.aggregate.n_windows, 0)}
              />
              <SummaryTile
                label="Avg OOS return"
                value={fmtDollar(walkForward.aggregate.avg_oos_return)}
                tone={
                  walkForward.aggregate.avg_oos_return > 0
                    ? 'profit'
                    : walkForward.aggregate.avg_oos_return < 0
                      ? 'loss'
                      : 'muted'
                }
              />
              <SummaryTile
                label="Avg OOS Sharpe"
                value={fmtNumLocale(walkForward.aggregate.avg_oos_sharpe)}
              />
              <SummaryTile
                label="Positive windows"
                value={fmtPctFromFraction(walkForward.aggregate.positive_windows_pct)}
              />
            </div>
          )}
          <DenseDataTable scrollX>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className={denseTableCellPadding}>#</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>OOS start</DenseTableHead>
                <DenseTableHead className={denseTableCellPadding}>OOS end</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>IS return</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>OOS return</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>OOS Sharpe</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {walkForward.windows.map((w) => (
                <DenseTableRow key={w.window_index}>
                  <DenseTableCell className={denseTableCellPadding}>
                    {w.window_index}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{w.oos_start}</DenseTableCell>
                  <DenseTableCell className={denseTableCellPadding}>{w.oos_end}</DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${pnlColorClass(w.in_sample_return)}`}
                  >
                    {fmtDollar(w.in_sample_return)}
                  </DenseTableCell>
                  <DenseTableCell
                    className={`${denseTableNumCell} ${pnlColorClass(w.oos_return)}`}
                  >
                    {fmtDollar(w.oos_return)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtNumLocale(w.oos_sharpe)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        </div>
      )}

      {benchmark?.spy_buy_hold && (
        <div>
          <div className="mb-1 flex items-center gap-2 text-dense-label font-semibold text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            SPY buy-hold comparison (proxy series)
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryTile
              label="Total return"
              value={fmtDollar(benchmark.spy_buy_hold.total_return)}
              tone={
                benchmark.spy_buy_hold.total_return > 0
                  ? 'profit'
                  : benchmark.spy_buy_hold.total_return < 0
                    ? 'loss'
                    : 'muted'
              }
            />
            <SummaryTile
              label="Annualized"
              value={fmtPctFromFraction(benchmark.spy_buy_hold.annualized_return)}
            />
            <SummaryTile
              label="Sharpe"
              value={fmtNumLocale(benchmark.spy_buy_hold.sharpe_annual)}
            />
            <SummaryTile
              label="Max drawdown"
              value={fmtDollar(-Math.abs(benchmark.spy_buy_hold.max_drawdown))}
              tone={benchmark.spy_buy_hold.max_drawdown > 0 ? 'loss' : 'muted'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: string
  tone?: 'profit' | 'loss' | 'muted'
}) {
  const toneClass =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-foreground'
  return (
    <Card variant="elevated">
      <CardContent className="px-3 py-2">
        <span className="text-dense-caption uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className={`font-mono text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
